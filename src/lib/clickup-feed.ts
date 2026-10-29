import { fetchChangedTasks, fetchStatusEvents } from "@/lib/clickup";
import type { StatusEvent } from "@/lib/types";

const MAX_EVENTS = 400;

const cache = { cursor: 0, byTask: new Map<string, StatusEvent[]>() };
let inflight: Promise<StatusEvent[]> | null = null;

async function refresh(listId: string): Promise<StatusEvent[]> {
  const changed = await fetchChangedTasks(listId, cache.cursor);

  if (changed.length) {
    const events = await fetchStatusEvents(changed.map((task) => task.id));
    for (const task of changed) cache.byTask.set(task.id, []);
    for (const event of events) cache.byTask.get(event.taskId)?.push(event);
    cache.cursor = Math.max(cache.cursor, ...changed.map((task) => task.updated));
  }

  return [...cache.byTask.values()]
    .flat()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_EVENTS);
}

export function readStatusFeed(listId: string): Promise<StatusEvent[]> {
  if (!inflight) {
    inflight = refresh(listId).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
