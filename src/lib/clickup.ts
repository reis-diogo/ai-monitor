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

  return res.json();
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
  mentionUserId: number | null
): Promise<void> {
  const comment = mentionUserId
    ? [{ type: "tag", user: { id: mentionUserId } }, { text: ` ${text}` }]
    : [{ text }];

  await clickupFetch(`/task/${taskId}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });
}
