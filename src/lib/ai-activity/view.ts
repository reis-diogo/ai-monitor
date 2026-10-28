import { C, avatarOf, fmtAgo, fmtDuration, fnv, inkMix, tint, topicBase } from "@/lib/ai-activity/format";
import type { ActivityPrompt } from "@/lib/ai-activity/types";

const STALE_MS = 30 * 60_000;
const IDLE_MS = 30 * 60_000;

export type EffectiveStatus = ActivityPrompt["status"] | "stale";

export type PromptRow = ActivityPrompt & {
  n: number;
  effective: EffectiveStatus;
  startMs: number;
  endMs: number | null;
  updatedMs: number;
};

export type RowView = {
  id: string;
  n: number;
  summary: string;
  chip: string;
  area: string;
  tok: number;
  chipBg: string;
  chipFg: string;
  live: boolean;
  statusColor: string;
  time: string;
  activity: string;
  showActivity: boolean;
  bg: string;
  kbId: string | null;
};

export type GroupView = ReturnType<typeof groupView>;

export function toPromptRows(prompts: ActivityPrompt[], now: number): PromptRow[] {
  const byUser: Record<string, ActivityPrompt[]> = {};
  for (const prompt of prompts) (byUser[prompt.user] ??= []).push(prompt);

  return Object.values(byUser).flatMap((list) =>
    [...list]
      .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
      .map((prompt, i) => {
        const updatedMs = Date.parse(prompt.updatedAt);
        const live = prompt.status === "running" || prompt.status === "waiting";
        return {
          ...prompt,
          n: i + 1,
          effective: live && now - updatedMs > STALE_MS ? ("stale" as const) : prompt.status,
          startMs: Date.parse(prompt.startedAt),
          endMs: prompt.endedAt ? Date.parse(prompt.endedAt) : null,
          updatedMs,
        };
      })
  );
}

export const isLive = (p: PromptRow) => p.effective === "running" || p.effective === "waiting";

export function rowView(r: PromptRow, now: number): RowView {
  const hue = fnv(r.project) % 360;
  const st = r.effective;
  const dur = fmtDuration((r.endMs ?? now) - r.startMs);
  const statusColor =
    st === "running" ? C.blue : st === "waiting" ? C.amber : st === "error" ? C.red : C.grey;
  const time =
    st === "waiting"
      ? `aguardando · ${dur}`
      : st === "error"
        ? `erro · ${dur}`
        : st === "stale"
          ? `sem sinal há ${fmtAgo(now - r.updatedMs)}`
          : dur;

  return {
    id: r.id,
    n: r.n,
    summary: r.summary,
    chip: r.project,
    area: r.area || "—",
    tok: r.tokensIn + r.tokensOut,
    chipBg: tint(topicBase(hue), 14),
    chipFg: inkMix(topicBase(hue)),
    live: st === "running" || st === "waiting",
    statusColor,
    time,
    activity: st === "waiting" ? (r.activity ?? "Aguardando sua resposta") : (r.activity ?? ""),
    showActivity: (st === "running" || st === "waiting") && !!(r.activity || st === "waiting"),
    bg: st === "waiting" ? tint("var(--wait)", 8) : "transparent",
    kbId: r.kbId,
  };
}

function summaryItems(list: PromptRow[], now: number) {
  const live = list.filter(isLive).sort((a, b) => b.startMs - a.startMs);
  if (live.length) {
    const items = live.slice(0, 3).map((r) => ({
      text: r.summary,
      color: r.effective === "waiting" ? C.amber : C.blue,
      meta: `${r.effective === "waiting" ? "aguardando · " : ""}${fmtDuration(now - r.startMs)} · ${r.project}${
        r.effective === "running" && r.activity ? ` · ${r.activity}` : ""
      }`,
    }));
    return live.length > 3
      ? [...items, { text: `+${live.length - 3} em andamento`, meta: "", color: C.grey }]
      : items;
  }

  const last = [...list].sort((a, b) => (b.endMs ?? b.updatedMs) - (a.endMs ?? a.updatedMs))[0];
  return last
    ? [
        {
          text: `Último: ${last.summary}`,
          color: last.effective === "error" ? C.red : C.grey,
          meta: `${last.effective === "error" ? "erro · " : ""}há ${fmtAgo(now - (last.endMs ?? last.updatedMs))} · ${last.project}`,
        },
      ]
    : [];
}

export function groupView(name: string, all: PromptRow[], visible: PromptRow[], now: number) {
  const live = all.filter(isLive);
  const waiting = live.filter((r) => r.effective === "waiting").length;
  const lastAct = Math.max(...all.map((r) => r.endMs ?? r.updatedMs));

  return {
    ...avatarOf(name),
    name,
    meta: `${all.length} ${all.length > 1 ? "pedidos" : "pedido"}`,
    tok: all.reduce((sum, r) => sum + r.tokensIn + r.tokensOut, 0),
    hasLive: live.length > 0,
    liveColor: waiting ? C.amber : C.blue,
    liveBg: tint(waiting ? "var(--wait)" : "var(--run)", 12),
    liveLabel: waiting ? `${waiting} aguardando resposta` : `${live.length} em andamento`,
    idle: !live.length && now - lastAct >= IDLE_MS,
    idleLabel: `sem atividade há ${fmtAgo(now - lastAct)}`,
    sumItems: summaryItems(all, now),
    last: Math.max(...all.map((r) => r.updatedMs)),
    rows: [...visible].sort((a, b) => b.startMs - a.startMs).map((r) => rowView(r, now)),
  };
}
