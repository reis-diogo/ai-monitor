import type {
  ClickUpTaskActivity,
  ProjectProgress,
  ProjectStatusCount,
  StatusEvent,
} from "@/lib/types";

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
  date_closed?: string | null;
  date_done?: string | null;
  creator: ClickUpUser;
  assignees?: { username: string | null; email: string; profilePicture?: string | null }[];
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

const TASKS_PAGE_LIMIT = 50;

// O ClickUp devolve 100 tarefas por pagina e nao avisa que cortou: sem percorrer
// ate last_page, tudo o que passa da centesima simplesmente nao existe para o app.
async function fetchAllListTasks(listId: string): Promise<ClickUpTaskResponse[]> {
  const tasks: ClickUpTaskResponse[] = [];

  for (let page = 0; page < TASKS_PAGE_LIMIT; page++) {
    const data = (await clickupFetch(
      `/list/${listId}/task?include_closed=true&page=${page}`
    )) as { tasks?: ClickUpTaskResponse[]; last_page?: boolean };

    const batch = data.tasks ?? [];
    tasks.push(...batch);

    if (data.last_page === true || batch.length === 0) break;
  }

  return tasks;
}

function closedAt(task: ClickUpTaskResponse): string | null {
  const raw = task.date_closed ?? task.date_done;
  if (!raw) return null;
  const ms = Number(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export async function fetchListTasks(listId: string): Promise<ClickUpTaskActivity[]> {
  const [list, tasks] = await Promise.all([
    clickupFetch(`/list/${listId}`) as Promise<ClickUpListResponse>,
    fetchAllListTasks(listId),
  ]);

  const fallbackLocation =
    [list.space?.name, list.folder?.name].filter(Boolean).join("/") || list.name;

  return tasks.map((task) => ({
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
    dateClosed: closedAt(task),
    location: resolveProjectName(task) ?? fallbackLocation,
    status: task.status.status,
    statusColor: task.status.color,
    assignees: (task.assignees ?? []).map((user) => user.username ?? user.email),
    assigneeAvatars: Object.fromEntries(
      (task.assignees ?? []).flatMap((user) =>
        user.profilePicture ? [[user.username ?? user.email, user.profilePicture]] : []
      )
    ),
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

export async function uploadTaskAttachment(taskId: string, file: Blob, filename: string): Promise<void> {
  const form = new FormData();
  form.append("attachment", file, filename);
  await clickupFetch(`/task/${taskId}/attachment`, { method: "POST", body: form });
}

export async function deleteTask(taskId: string): Promise<void> {
  await clickupFetch(`/task/${taskId}`, { method: "DELETE" });
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

  // O orderindex nao esta documentado no POST do item, mas e respeitado. Sem ele o
  // ClickUp numera os itens por conta propria e a ordem chega embaralhada no card,
  // mesmo criando um de cada vez e esperando cada resposta.
  for (const [index, item] of items.entries()) {
    await clickupFetch(`/checklist/${checklistId}/checklist_item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: item, orderindex: index }),
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


export async function fetchTaskAttachments(
  taskId: string
): Promise<{ id: string; title: string }[]> {
  const task = (await clickupFetch(`/task/${taskId}`)) as {
    attachments?: { id: string; title?: string | null }[];
  };
  return (task.attachments ?? []).map((item) => ({
    id: item.id,
    title: item.title || "Anexo sem nome",
  }));
}

export async function fetchWorkspaceId(): Promise<string> {
  const data = (await clickupFetch("/team")) as { teams?: { id: string }[] };
  const teamId = data.teams?.[0]?.id;
  if (!teamId) throw new Error("Workspace do ClickUp não encontrado.");
  return teamId;
}

export function listWebUrl(teamId: string, listId: string): string {
  return `https://app.clickup.com/${teamId}/v/li/${listId}`;
}

export async function fetchListWebUrl(listId: string): Promise<string> {
  return listWebUrl(await fetchWorkspaceId(), listId);
}

type ClickUpTeamMember = {
  user: { id: number; email?: string | null; profilePicture?: string | null };
};

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

export async function fetchTeamMemberAvatar(email: string): Promise<string | null> {
  const data = (await clickupFetch("/team")) as {
    teams?: { members?: ClickUpTeamMember[] }[];
  };
  const wanted = email.trim().toLowerCase();
  for (const team of data.teams ?? []) {
    for (const member of team.members ?? []) {
      if (member.user.email?.trim().toLowerCase() === wanted) {
        return member.user.profilePicture ?? null;
      }
    }
  }
  return null;
}

type ClickUpTimeInStatus = {
  current_status?: { status: string; total_time?: { since?: string } };
};

// Uma chamada por card: so vale para semear o que ja estava parado antes de comecarmos
// a observar. O sync normal deduz a transicao sozinho, sem custo de API.
export async function fetchTaskStatusSince(taskId: string): Promise<string | null> {
  const data = (await clickupFetch(`/task/${taskId}/time_in_status`)) as ClickUpTimeInStatus;
  const since = data.current_status?.total_time?.since;
  if (!since) return null;

  const epoch = Number(since);
  return Number.isFinite(epoch) ? new Date(epoch).toISOString() : null;
}

const BULK_STATUS_LIMIT = 100;

export async function fetchChangedTasks(
  listId: string,
  sinceMs: number
): Promise<{ id: string; updated: number }[]> {
  const changed: { id: string; updated: number }[] = [];
  const since = sinceMs > 0 ? `&date_updated_gt=${sinceMs}` : "";

  for (let page = 0; page < TASKS_PAGE_LIMIT; page++) {
    const data = (await clickupFetch(
      `/list/${listId}/task?include_closed=true&order_by=updated&page=${page}${since}`
    )) as { tasks?: { id: string; date_updated: string }[]; last_page?: boolean };

    const batch = data.tasks ?? [];
    for (const task of batch) changed.push({ id: task.id, updated: Number(task.date_updated) });

    if (data.last_page === true || batch.length === 0) break;
  }

  return changed;
}

type ClickUpStatusHistory = {
  status: string;
  total_time?: { since?: string; by_minute?: number };
};

export async function fetchStatusEvents(taskIds: string[]): Promise<StatusEvent[]> {
  const events: StatusEvent[] = [];

  for (let start = 0; start < taskIds.length; start += BULK_STATUS_LIMIT) {
    const query = taskIds
      .slice(start, start + BULK_STATUS_LIMIT)
      .map((id) => `task_ids=${encodeURIComponent(id)}`)
      .join("&");

    const data = (await clickupFetch(`/task/bulk_time_in_status/task_ids?${query}`)) as Record<
      string,
      { status_history?: ClickUpStatusHistory[] }
    > | null;

    for (const [taskId, entry] of Object.entries(data ?? {})) {
      for (const step of entry.status_history ?? []) {
        const epoch = Number(step.total_time?.since);
        if (!Number.isFinite(epoch) || epoch <= 0) continue;
        events.push({ taskId, status: step.status.toLowerCase(), at: new Date(epoch).toISOString() });
      }
    }
  }

  return events;
}

export type StatusMinutes = Record<string, Record<string, number>>;

export async function fetchStatusMinutes(taskIds: string[]): Promise<StatusMinutes> {
  const result: StatusMinutes = {};

  for (let start = 0; start < taskIds.length; start += BULK_STATUS_LIMIT) {
    const query = taskIds
      .slice(start, start + BULK_STATUS_LIMIT)
      .map((id) => `task_ids=${encodeURIComponent(id)}`)
      .join("&");

    const data = (await clickupFetch(`/task/bulk_time_in_status/task_ids?${query}`)) as Record<
      string,
      { status_history?: ClickUpStatusHistory[] }
    > | null;

    for (const [taskId, entry] of Object.entries(data ?? {})) {
      const byStatus: Record<string, number> = {};
      for (const step of entry.status_history ?? []) {
        const minutes = Number(step.total_time?.by_minute);
        if (!Number.isFinite(minutes) || minutes < 0) continue;
        const key = step.status.toLowerCase();
        byStatus[key] = (byStatus[key] ?? 0) + minutes;
      }
      result[taskId] = byStatus;
    }
  }

  return result;
}

const PROGRESS_LIST_NAME = "executivo";

let progressListId: string | null = null;

async function resolveProgressListId(listId: string): Promise<string | null> {
  if (progressListId) return progressListId;

  const list = (await clickupFetch(`/list/${listId}`)) as { folder?: { id?: string } };
  const folderId = list.folder?.id;
  if (!folderId) return null;

  const folder = (await clickupFetch(`/folder/${folderId}/list`)) as {
    lists?: { id: string; name: string }[];
  };
  const match = folder.lists?.find((item) => item.name.trim().toLowerCase() === PROGRESS_LIST_NAME);
  progressListId = match?.id ?? null;
  return progressListId;
}

type ClickUpProgressField = {
  name: string;
  type: string;
  value?: { percent_completed?: number } | null;
};

type ClickUpExecutiveTask = {
  id: string;
  name: string;
  parent?: string | null;
  status: { status: string; color: string };
  custom_fields?: ClickUpProgressField[];
};

export async function fetchProjectProgress(listId: string): Promise<ProjectProgress[]> {
  const progressList = await resolveProgressListId(listId);
  if (!progressList) return [];

  const tasks: ClickUpExecutiveTask[] = [];
  for (let page = 0; page < TASKS_PAGE_LIMIT; page++) {
    const data = (await clickupFetch(
      `/list/${progressList}/task?include_closed=true&subtasks=true&page=${page}`
    )) as { tasks?: ClickUpExecutiveTask[]; last_page?: boolean };
    const batch = data.tasks ?? [];
    tasks.push(...batch);
    if (data.last_page === true || batch.length === 0) break;
  }

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const rootOf = (task: ClickUpExecutiveTask): string => {
    let current = task;
    for (let depth = 0; depth < 10 && current.parent && byId.has(current.parent); depth++) {
      current = byId.get(current.parent) as ClickUpExecutiveTask;
    }
    return current.id;
  };

  const counts = new Map<string, Map<string, ProjectStatusCount>>();
  for (const task of tasks) {
    if (!task.parent) continue;
    const root = rootOf(task);
    const group = counts.get(root) ?? new Map<string, ProjectStatusCount>();
    const key = task.status.status.toLowerCase();
    const entry = group.get(key) ?? { status: key, color: task.status.color, count: 0 };
    entry.count += 1;
    group.set(key, entry);
    counts.set(root, group);
  }

  return tasks
    .filter((task) => !task.parent)
    .flatMap((task) => {
      const field = task.custom_fields?.find((item) => item.type === "manual_progress");
      if (!field) return [];
      const ratio = Number(field.value?.percent_completed ?? 0);
      return [
        {
          name: task.name,
          percent: Math.round((Number.isFinite(ratio) ? ratio : 0) * 100),
          statuses: [...(counts.get(task.id)?.values() ?? [])].sort((a, b) => b.count - a.count),
        },
      ];
    });
}

export class ClickUpInputError extends Error {}

export type ProjectOption = { id: string; name: string };

type ClickUpFieldsResponse = {
  fields?: {
    id: string;
    name: string;
    type: string;
    type_config?: { options?: { id: string; name: string }[] };
  }[];
};

async function fetchProjectField(listId: string): Promise<{ id: string; options: ProjectOption[] }> {
  const data = (await clickupFetch(`/list/${listId}/field`)) as ClickUpFieldsResponse;
  const field = data.fields?.find(
    (item) => item.type === "drop_down" && item.name.toLowerCase() === "projeto"
  );
  if (!field) throw new Error("Campo Projeto não encontrado na lista do ClickUp.");
  return {
    id: field.id,
    options: (field.type_config?.options ?? []).map((option) => ({ id: option.id, name: option.name })),
  };
}

export async function fetchProjectOptions(listId: string): Promise<ProjectOption[]> {
  return (await fetchProjectField(listId)).options;
}

export async function createListTask(
  listId: string,
  input: { name: string; description: string; projectId: string }
): Promise<{ id: string; customId: string | null; url: string }> {
  const field = await fetchProjectField(listId);
  if (!field.options.some((option) => option.id === input.projectId)) {
    throw new ClickUpInputError("Projeto inválido.");
  }

  const data = (await clickupFetch(`/list/${listId}/task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      markdown_description: input.description,
      status: "refinar po",
      custom_fields: [{ id: field.id, value: input.projectId }],
    }),
  })) as { id: string; custom_id?: string | null; url: string };

  return { id: data.id, customId: data.custom_id ?? null, url: data.url };
}

const WEBHOOK_EVENTS = [
  "taskCreated",
  "taskStatusUpdated",
  "taskCommentPosted",
  "taskAssigneeUpdated",
];

async function fetchTeamId(): Promise<string> {
  const data = (await clickupFetch("/team")) as { teams?: { id: string }[] };
  const teamId = data.teams?.[0]?.id;
  if (!teamId) throw new Error("Workspace do ClickUp não encontrado.");
  return teamId;
}

export async function createListWebhook(
  listId: string,
  endpoint: string
): Promise<{ id: string; secret: string }> {
  const teamId = await fetchTeamId();
  const data = (await clickupFetch(`/team/${teamId}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, events: WEBHOOK_EVENTS, list_id: Number(listId) }),
  })) as { id?: string; webhook?: { id?: string; secret?: string } };

  const id = data.webhook?.id ?? data.id;
  const secret = data.webhook?.secret;
  if (!id || !secret) throw new Error("O ClickUp não devolveu o webhook criado.");
  return { id, secret };
}

export async function fetchListName(listId: string): Promise<string | null> {
  try {
    const list = (await clickupFetch(`/list/${listId}`)) as { name?: string };
    return list.name ?? null;
  } catch {
    return null;
  }
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  await clickupFetch(`/webhook/${webhookId}`, { method: "DELETE" });
}

export async function fetchTaskSummary(
  taskId: string
): Promise<{ title: string; customId: string | null; project: string | null } | null> {
  try {
    const task = (await clickupFetch(`/task/${taskId}`)) as ClickUpTaskResponse;
    return {
      title: task.name,
      customId: task.custom_id ?? null,
      project: resolveProjectName(task),
    };
  } catch {
    return null;
  }
}
