import type { ActivityItem } from "@/lib/types";

export const STAGES = ["PO", "ARQ", "DEV", "QA", "UAT", "PRD"] as const;
export const STAGE_NAMES = [
  "Product Owner",
  "Arquitetura",
  "Desenvolvimento",
  "QA",
  "Deploy UAT",
  "Deploy produção",
] as const;
export const STAGE_DONE = STAGES.length;

const DONE_STATUSES = new Set(["concluído", "concluido", "entregue", "finalizado", "fora escopo"]);

const STAGE_BY_STATUS: Record<string, number> = {
  "para desenvolver": 0,
  "refinar po": 0,
  "esclarecer cliente": 0,
  esclarecido: 0,
  "para estimar": 0,
  "refinar arquiteto": 1,
  "validar solução": 1,
  "dev liberado": 2,
  "em andamento": 2,
  "dev finalizado": 2,
  bug: 2,
  impedido: 2,
  "em qa": 3,
  "para testar": 3,
  "deploy uat": 4,
  "deploy produção": 5,
};

export function isDoneStatus(status: string): boolean {
  return DONE_STATUSES.has(status.toLowerCase());
}

export function stageOf(status: string): number {
  const key = status.toLowerCase();
  if (DONE_STATUSES.has(key)) return STAGE_DONE;
  return STAGE_BY_STATUS[key] ?? 0;
}

export type MonitorCard = {
  id: string;
  customId: string;
  title: string;
  owner: string;
  assignees: string[];
  assigneeAvatars: Record<string, string>;
  ownerAvatarUrl: string | null;
  url: string;
  project: string;
  status: string;
  color: string | null;
  stage: number;
  since: string | null;
  elapsedMs: number | null;
  ageMs: number | null;
};

export type DwellLookup = Map<string, { since: string | null }>;

export function buildCards(items: ActivityItem[], dwell: DwellLookup, now: number): MonitorCard[] {
  const cards: MonitorCard[] = [];

  for (const item of items) {
    if (item.source !== "clickup" || !item.status || isDoneStatus(item.status)) continue;

    const since = dwell.get(item.id)?.since ?? null;
    const elapsed = since ? now - new Date(since).getTime() : null;
    const age = now - new Date(item.date).getTime();

    cards.push({
      id: item.id,
      customId: item.customId ?? item.id,
      title: item.title,
      owner: item.authorName,
      assignees: item.assignees ?? [],
      assigneeAvatars: item.assigneeAvatars ?? {},
      ownerAvatarUrl: item.authorAvatarUrl,
      url: item.url,
      project: item.location,
      status: item.status.toLowerCase(),
      color: item.statusColor,
      stage: stageOf(item.status),
      since,
      elapsedMs: elapsed !== null && Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : null,
      ageMs: Number.isFinite(age) && age >= 0 ? age : null,
    });
  }

  return cards;
}

export const DEFAULT_LIMIT_HOURS: Record<string, number> = {
  "para desenvolver": 120,
  "refinar po": 48,
  "refinar arquiteto": 48,
  "dev liberado": 72,
  "em andamento": 48,
  "dev finalizado": 24,
  "validar solução": 48,
  "em qa": 48,
  bug: 24,
};

export const FALLBACK_LIMIT_HOURS = 72;

export type StatusLimit = { hours: number; enabled: boolean };
export type StatusLimits = Record<string, StatusLimit>;

export function limitFor(status: string, limits: StatusLimits): StatusLimit {
  return (
    limits[status] ?? {
      hours: DEFAULT_LIMIT_HOURS[status] ?? FALLBACK_LIMIT_HOURS,
      enabled: true,
    }
  );
}

export function isOverLimit(card: MonitorCard, limits: StatusLimits): boolean {
  if (card.elapsedMs === null) return false;
  const limit = limitFor(card.status, limits);
  return limit.enabled && card.elapsedMs > limit.hours * HOUR_MS;
}

export const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function formatSpan(ms: number): string {
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${Math.max(Math.floor(ms / 60000), 1)}min`;
}

export function formatLimit(hours: number): string {
  return hours % 24 === 0 ? `${hours / 24}d` : `${hours}h`;
}

export type StatusTile = {
  status: string;
  color: string | null;
  count: number;
  measured: number;
  maxMs: number | null;
  avgMs: number | null;
  over: number;
  limit: StatusLimit;
};

export function buildTiles(
  cards: MonitorCard[],
  statusOrder: string[],
  limits: StatusLimits
): StatusTile[] {
  const byStatus = new Map<string, MonitorCard[]>();
  for (const card of cards) {
    const list = byStatus.get(card.status) ?? [];
    list.push(card);
    byStatus.set(card.status, list);
  }

  const order = [
    ...statusOrder.map((status) => status.toLowerCase()),
    ...[...byStatus.keys()].filter((status) => !statusOrder.some((s) => s.toLowerCase() === status)),
  ];

  return order.flatMap((status) => {
    const list = byStatus.get(status);
    if (!list || !list.length) return [];

    const measured = list.filter((card) => card.elapsedMs !== null);
    const spans = measured.map((card) => card.elapsedMs as number);

    return [
      {
        status,
        color: list[0].color,
        count: list.length,
        measured: measured.length,
        maxMs: spans.length ? Math.max(...spans) : null,
        avgMs: spans.length ? spans.reduce((sum, ms) => sum + ms, 0) / spans.length : null,
        over: list.filter((card) => isOverLimit(card, limits)).length,
        limit: limitFor(status, limits),
      },
    ];
  });
}

export type Health = "ok" | "attention" | "stuck";

export type ProjectSummary = {
  name: string;
  pending: number;
  stuck: number;
  health: Health;
  byStage: number[];
  cards: MonitorCard[];
};

export function buildProjects(
  cards: MonitorCard[],
  projectNames: string[],
  limits: StatusLimits
): ProjectSummary[] {
  const names = [...projectNames];
  for (const card of cards) {
    if (card.project && !names.includes(card.project)) names.push(card.project);
  }

  return names.map((name) => {
    const own = cards.filter((card) => card.project === name);
    const stuck = own.filter((card) => isOverLimit(card, limits)).length;

    return {
      name,
      pending: own.length,
      stuck,
      health: stuck === 0 ? "ok" : stuck / own.length < 0.5 ? "attention" : "stuck",
      byStage: STAGES.map((_, index) => own.filter((card) => card.stage === index).length),
      cards: own,
    };
  });
}

export const HEALTH_STYLE: Record<Health, { color: string; soft: string; label: string }> = {
  ok: { color: "var(--ok)", soft: "color-mix(in srgb, var(--ok) 18%, transparent)", label: "em dia" },
  attention: { color: "var(--warn)", soft: "color-mix(in srgb, var(--warn) 18%, transparent)", label: "atenção" },
  stuck: { color: "var(--danger)", soft: "color-mix(in srgb, var(--danger) 18%, transparent)", label: "travado" },
};

export function stuckRatio(project: ProjectSummary): number {
  return project.pending ? project.stuck / project.pending : 0;
}

export function healthStyle(project: ProjectSummary): { color: string; soft: string; label: string } {
  const ratio = stuckRatio(project);
  const label = HEALTH_STYLE[project.health].label;
  const color =
    ratio <= 0
      ? "var(--ok)"
      : ratio <= 0.5
        ? `color-mix(in srgb, var(--warn) ${Math.round((ratio / 0.5) * 100)}%, var(--ok))`
        : `color-mix(in srgb, var(--danger) ${Math.round(((ratio - 0.5) / 0.5) * 100)}%, var(--warn))`;
  return { color, soft: `color-mix(in srgb, ${color} 18%, transparent)`, label };
}

export function spanColor(card: MonitorCard, limits: StatusLimits): string {
  if (card.elapsedMs === null) return "var(--muted-foreground)";
  if (isOverLimit(card, limits)) return "var(--danger)";
  const limit = limitFor(card.status, limits);
  if (limit.enabled && card.elapsedMs > limit.hours * HOUR_MS * 0.5) return "var(--warn)";
  return "var(--muted-foreground)";
}
