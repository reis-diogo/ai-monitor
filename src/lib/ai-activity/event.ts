import type { ActivityStatus, KnowledgeSnippet } from "@/lib/ai-activity/types";

const STATUS_ALIAS: Record<string, ActivityStatus> = {
  started: "running",
  start: "running",
  in_progress: "running",
  working: "running",
  thinking: "running",
  completed: "done",
  complete: "done",
  finished: "done",
  success: "done",
  failed: "error",
  awaiting_input: "waiting",
  needs_input: "waiting",
  aguardando: "waiting",
};

const STATUSES: ActivityStatus[] = ["running", "waiting", "done", "error"];

export type ParsedKnowledge = {
  id: string | null;
  title: string;
  technologies: string[];
  summary: string;
  steps: string[];
  connection: string;
  gotchas: string[];
  snippets: KnowledgeSnippet[];
};

export type ParsedEvent = {
  promptId: string;
  user?: string;
  status?: ActivityStatus;
  summary?: string;
  subject?: string;
  area?: string;
  project?: string;
  repo?: string;
  activity?: string | null;
  tokens?: { input: number; output: number };
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  knowledge?: ParsedKnowledge;
};

function text(value: unknown, max = 400): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function list(value: unknown, max = 40): string[] {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items
    .filter((item): item is string => typeof item === "string" && !!item.trim())
    .map((item) => item.trim().slice(0, 1200))
    .slice(0, max);
}

function isoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

function count(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function parseKnowledge(raw: unknown): ParsedKnowledge | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const k = raw as Record<string, unknown>;
  const title = text(k.title, 200);
  if (!title) return undefined;

  const snippets = (Array.isArray(k.snippets) ? k.snippets : []).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const s = item as Record<string, unknown>;
    const code = typeof s.code === "string" ? s.code.slice(0, 8000) : "";
    return code.trim() ? [{ lang: text(s.lang, 24) ?? "código", code }] : [];
  });

  return {
    id: text(k.id, 120) ?? null,
    title,
    technologies: list(k.technologies, 12),
    summary: text(k.summary, 1500) ?? "",
    steps: list(k.steps),
    connection: text(k.connection, 1500) ?? "",
    gotchas: list(k.gotchas),
    snippets: snippets.slice(0, 8),
  };
}

export function parseEvent(raw: unknown): ParsedEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const promptId = text(e.prompt_id ?? e.id, 120);
  if (!promptId) return null;

  let status: ActivityStatus | undefined;
  if (typeof e.status === "string") {
    const key = e.status.toLowerCase();
    const mapped = STATUS_ALIAS[key] ?? (key as ActivityStatus);
    status = STATUSES.includes(mapped) ? mapped : "running";
  }

  const tokens =
    e.tokens && typeof e.tokens === "object"
      ? {
          input: count((e.tokens as Record<string, unknown>).input),
          output: count((e.tokens as Record<string, unknown>).output),
        }
      : undefined;

  const durationMs = Number(e.duration_ms);

  return {
    promptId,
    user: text(e.user, 120),
    status,
    summary: text(e.summary, 300),
    subject: text(e.subject ?? e.topic, 120),
    area: text(e.area, 60),
    project: text(e.project_name ?? e.project, 160),
    repo: text(e.repo, 160),
    activity: "activity" in e ? (text(e.activity, 120) ?? null) : undefined,
    tokens,
    startedAt: isoDate(e.started_at),
    endedAt: isoDate(e.ended_at),
    durationMs: Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : undefined,
    knowledge: parseKnowledge(e.knowledge),
  };
}
