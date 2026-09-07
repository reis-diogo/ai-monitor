import type { ClickUpTaskActivity } from "@/lib/types";

const CLICKUP_API = "https://api.clickup.com/api/v2";

function getToken(): string {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) {
    throw new Error("CLICKUP_API_KEY não configurado em .env.local");
  }
  return token;
}

async function clickupFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${CLICKUP_API}${path}`, {
    ...init,
    headers: { Authorization: getToken(), ...init?.headers },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Token do ClickUp inválido ou sem permissão suficiente.");
    }
    if (res.status === 404) {
      throw new Error("Lista ou tarefa do ClickUp não encontrada.");
    }
    throw new Error(`Erro ao consultar o ClickUp (${res.status}).`);
  }

  // DELETE responde 200 com corpo vazio; res.json() estouraria nesse caso.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

type ClickUpUser = {
  id: number;
  username: string | null;
  email: string;
  profilePicture: string | null;
};

type ClickUpDropdownField = {
  name: string;
  type: string;
  type_config?: { options?: { orderindex: number; name: string }[] };
  value?: number | null;
};

type ClickUpTaskResponse = {
  id: string;
  custom_id?: string | null;
  name: string;
  description?: string;
  text_content?: string;
  url: string;
  date_created: string;
  creator: ClickUpUser;
  folder?: { name: string };
  space?: { name: string };
  custom_fields?: ClickUpDropdownField[];
  status: { status: string; color: string };
};

type ClickUpListStatus = { status: string; color: string; orderindex: number; type: string };

type ClickUpListResponse = {
  name: string;
  folder?: { name: string };
  space?: { name: string };
  statuses: ClickUpListStatus[];
};

function resolveProjectName(task: ClickUpTaskResponse): string | null {
  const field = task.custom_fields?.find(
    (f) => f.name.toLowerCase() === "projeto" && f.type === "drop_down"
  );
  if (!field || field.value === null || field.value === undefined) return null;

  const option = field.type_config?.options?.find((o) => o.orderindex === field.value);
  return option?.name ?? null;
}

export async function fetchListTasks(listId: string): Promise<ClickUpTaskActivity[]> {
  const [list, taskData] = await Promise.all([
    clickupFetch(`/list/${listId}`) as Promise<ClickUpListResponse>,
    clickupFetch(`/list/${listId}/task?include_closed=true`) as Promise<{
      tasks: ClickUpTaskResponse[];
    }>,
  ]);

  const fallbackLocation =
    [list.space?.name, list.folder?.name].filter(Boolean).join("/") || list.name;

  return taskData.tasks.map((task) => ({
    id: task.id,
    customId: task.custom_id ?? null,
    name: task.name,
    description: task.text_content || task.description || "",
    authorName: task.creator.username ?? task.creator.email,
    authorEmail: task.creator.email,
    authorAvatarUrl: task.creator.profilePicture,
    authorClickupId: task.creator.id,
    url: task.url,
    date: new Date(Number(task.date_created)).toISOString(),
    location: resolveProjectName(task) ?? fallbackLocation,
    status: task.status.status,
    statusColor: task.status.color,
  }));
}

export async function fetchListStatuses(
  listId: string
): Promise<{ status: string; color: string }[]> {
  const list = (await clickupFetch(`/list/${listId}`)) as ClickUpListResponse;
  return list.statuses
    .sort((a, b) => a.orderindex - b.orderindex)
    .map((s) => ({ status: s.status, color: s.color }));
}

export async function updateTaskStatus(taskId: string, status: string): Promise<void> {
  await clickupFetch(`/task/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function createTaskComment(
  taskId: string,
  text: string,
  mentionUserIds: number | number[] | null
): Promise<void> {
  const ids = (
    typeof mentionUserIds === "number" ? [mentionUserIds] : mentionUserIds ?? []
  ).filter((id, index, list) => list.indexOf(id) === index);

  const comment = ids.length
    ? [...ids.map((id) => ({ type: "tag", user: { id } })), { text: ` ${text}` }]
    : [{ text }];

  await clickupFetch(`/task/${taskId}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });
}

type ClickUpChecklistResponse = { checklist?: { id: string } };

type ClickUpTaskChecklists = { checklists?: { id: string; name: string }[] };

/** Remove checklists com esse nome, para a reavaliacao substituir em vez de empilhar. */
export async function deleteChecklistsNamed(taskId: string, name: string): Promise<void> {
  const task = (await clickupFetch(`/task/${taskId}`)) as ClickUpTaskChecklists;
  const existing = (task.checklists ?? []).filter((c) => c.name === name);

  for (const checklist of existing) {
    await clickupFetch(`/checklist/${checklist.id}`, { method: "DELETE" });
  }
}

/**
 * Cria um checklist na tarefa e adiciona um item por pendência. O ClickUp não
 * aceita os itens na mesma chamada da criação, então são duas etapas.
 * Atenção: ele NÃO preserva a ordem de criação e devolve orderindex null — quem
 * chama deve numerar os itens se a ordem importar.
 */
export async function createTaskChecklist(
  taskId: string,
  name: string,
  items: string[]
): Promise<void> {
  if (!items.length) return;

  await deleteChecklistsNamed(taskId, name);

  const created = (await clickupFetch(`/task/${taskId}/checklist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })) as ClickUpChecklistResponse;

  const checklistId = created.checklist?.id;
  if (!checklistId) {
    throw new Error("O ClickUp não retornou o id do checklist criado.");
  }

  for (const item of items) {
    await clickupFetch(`/checklist/${checklistId}/checklist_item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: item }),
    });
  }
}

/**
 * Busca titulo e descricao atuais de uma tarefa. A tela pode estar com uma copia
 * antiga do card — se o PO editou depois do ultimo refresh, reavaliar pelo que o
 * navegador tem em memoria avaliaria o texto errado sem avisar ninguem.
 */
export async function fetchTaskContent(
  taskId: string
): Promise<{ title: string; description: string } | null> {
  try {
    const task = (await clickupFetch(`/task/${taskId}`)) as ClickUpTaskResponse;
    return {
      title: task.name,
      description: task.text_content || task.description || "",
    };
  } catch {
    return null;
  }
}


type ClickUpTeamMember = { user: { id: number; email?: string | null } };

/**
 * Mapa email -> id de usuario do ClickUp. Mencionar alguem exige o id numerico, e
 * o que o app guarda em professionals e o email — este e o unico ponto de traducao.
 */
export async function fetchTeamMemberIdsByEmail(): Promise<Map<string, number>> {
  const data = (await clickupFetch("/team")) as {
    teams?: { members?: ClickUpTeamMember[] }[];
  };

  const map = new Map<string, number>();
  for (const team of data.teams ?? []) {
    for (const member of team.members ?? []) {
      const email = member.user.email?.trim().toLowerCase();
      if (email) map.set(email, member.user.id);
    }
  }
  return map;
}
