import {
  fetchListTasksUpdatedSince,
  fetchTaskCommentsSince,
  type HistoryTask,
} from "@/lib/clickup";
import { listSources, recordEvents, type ActivityEvent } from "@/lib/productivity-store";

const DAY_MS = 24 * 60 * 60 * 1000;
const CONCURRENCY = 5;

export type BackfillResult = {
  listId: string;
  label: string;
  tasks: number;
  created: number;
  comments: number;
  error?: string;
};

async function inBatches<T, R>(items: T[], run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    results.push(...(await Promise.all(items.slice(i, i + CONCURRENCY).map(run))));
  }
  return results;
}

function baseEvent(task: HistoryTask, listId: string) {
  return {
    listId,
    projectName: task.project ?? "Sem projeto",
    taskId: task.id,
    taskCustomId: task.customId,
    taskTitle: task.title,
    fromStatus: null,
    toStatus: null,
  };
}

export async function backfillHistory(days: number): Promise<BackfillResult[]> {
  const sinceMs = Date.now() - days * DAY_MS;
  const sources = await listSources();
  const results: BackfillResult[] = [];

  for (const source of sources) {
    const result: BackfillResult = {
      listId: source.listId,
      label: source.nickname ?? source.label ?? source.listId,
      tasks: 0,
      created: 0,
      comments: 0,
    };
    results.push(result);

    try {
      const liveSince = source.createdAt ? new Date(source.createdAt).getTime() : Date.now();
      const tasks = await fetchListTasksUpdatedSince(source.listId, sinceMs);
      result.tasks = tasks.length;
      const events: ActivityEvent[] = [];

      for (const task of tasks) {
        const creator = task.creator;
        if (creator && task.createdAt >= sinceMs && task.createdAt < liveSince) {
          events.push({
            ...baseEvent(task, source.listId),
            eventKey: `backfill:created:${task.id}`,
            occurredAt: new Date(task.createdAt).toISOString(),
            actorId: creator.id,
            actorName: creator.name,
            actorEmail: creator.email,
            kind: "created",
            detail: null,
          });
          result.created += 1;
        }
      }

      const perTask = await inBatches(tasks, async (task) => ({
        task,
        comments: await fetchTaskCommentsSince(task.id, sinceMs).catch(() => []),
      }));

      for (const { task, comments } of perTask) {
        for (const comment of comments) {
          if (!comment.author || comment.at >= liveSince) continue;
          events.push({
            ...baseEvent(task, source.listId),
            eventKey: `backfill:comment:${comment.id}`,
            occurredAt: new Date(comment.at).toISOString(),
            actorId: comment.author.id,
            actorName: comment.author.name,
            actorEmail: comment.author.email,
            kind: "comment",
            detail: comment.text || null,
          });
          result.comments += 1;
        }
      }

      for (let i = 0; i < events.length; i += 500) {
        await recordEvents(events.slice(i, i + 500));
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Erro ao importar o histórico.";
    }
  }

  return results;
}
