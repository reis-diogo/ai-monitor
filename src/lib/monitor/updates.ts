import type { MonitorValue } from "@/components/Dashboard";
import type { ActivityItem, StatusEvent } from "@/lib/types";

export type Update = {
  key: string;
  at: number;
  who: string | null;
  owner: string | null;
  assignee: string | null;
  ticket: string | null;
  url: string | null;
  text: string | null;
  to: string | null;
  project: string | null;
};

export function clock(at: number): { time: string; day: string | null } {
  const date = new Date(at);
  const today = new Date();
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const same = date.toDateString() === today.toDateString();
  return {
    time,
    day: same ? null : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  };
}

export function buildUpdates(
  items: ActivityItem[],
  events: StatusEvent[],
  flowLog: MonitorValue["flowLog"],
  withLogs: boolean,
  limit: number
): Update[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const moves: Update[] = [];

  for (const event of events) {
    const item = byId.get(event.taskId);
    if (!item) continue;
    moves.push({
      key: `m-${event.taskId}-${event.status}`,
      at: new Date(event.at).getTime(),
      who: null,
      owner: item.authorName,
      assignee: item.assignees?.length ? item.assignees.join(", ") : null,
      ticket: item.customId ?? item.id,
      url: item.url,
      text: null,
      to: event.status,
      project: item.location,
    });
  }

  const logs: Update[] = withLogs
    ? flowLog.map((entry) => ({
        key: `l-${entry.id}`,
        at: entry.startedAt,
        who: entry.agent,
        owner: entry.agent,
        assignee: null,
        ticket: null,
        url: null,
        text: entry.description,
        to: null,
        project: null,
      }))
    : [];

  return [...moves, ...logs].sort((a, b) => b.at - a.at).slice(0, limit);
}
