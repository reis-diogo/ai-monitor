import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { fetchTaskSummary } from "@/lib/clickup";
import {
  findSourceByWebhook,
  recordEvents,
  type ActivityEvent,
  type ActivityKind,
} from "@/lib/productivity-store";

type HistoryItem = {
  id?: string;
  date?: string;
  user?: { id?: number; username?: string | null; email?: string | null };
  before?: { status?: string } | null;
  after?: { status?: string } | null;
  comment?: { text_content?: string; text?: string } | null;
};

const KIND_BY_EVENT: Record<string, ActivityKind> = {
  taskCreated: "created",
  taskStatusUpdated: "status",
  taskCommentPosted: "comment",
  taskAssigneeUpdated: "assignee",
};

function validSignature(secret: string, raw: string, received: string | null): boolean {
  if (!secret || !received) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const webhookId = typeof body.webhook_id === "string" ? body.webhook_id : "";
  const source = webhookId ? await findSourceByWebhook(webhookId) : null;
  if (!source || !validSignature(source.secret, raw, request.headers.get("x-signature"))) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const event = typeof body.event === "string" ? body.event : "";
  const kind = KIND_BY_EVENT[event];
  const taskId = typeof body.task_id === "string" ? body.task_id : "";
  if (!kind || !taskId) return NextResponse.json({ ok: true, ignored: true });

  const items = Array.isArray(body.history_items) ? (body.history_items as HistoryItem[]) : [];
  const summary = await fetchTaskSummary(taskId);

  const events: ActivityEvent[] = items.flatMap((item, index) => {
    const user = item.user;
    const name = user?.username || user?.email;
    if (!name) return [];
    const at = Number(item.date);
    return [
      {
        eventKey: `${webhookId}:${item.id ?? `${event}:${taskId}:${item.date ?? index}`}`,
        occurredAt: new Date(Number.isFinite(at) && at > 0 ? at : Date.now()).toISOString(),
        actorId: user?.id !== undefined ? String(user.id) : null,
        actorName: name,
        actorEmail: user?.email ?? null,
        listId: source.listId,
        projectName: source.projectName,
        taskId,
        taskCustomId: summary?.customId ?? null,
        taskTitle: summary?.title ?? null,
        kind,
        fromStatus: kind === "status" ? (item.before?.status ?? null) : null,
        toStatus: kind === "status" ? (item.after?.status ?? null) : null,
        detail:
          kind === "comment"
            ? (item.comment?.text_content ?? item.comment?.text ?? "").slice(0, 280) || null
            : null,
      },
    ];
  });

  try {
    await recordEvents(events);
    return NextResponse.json({ ok: true, recorded: events.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gravar a atividade.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
