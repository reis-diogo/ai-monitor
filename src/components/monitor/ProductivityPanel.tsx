"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/monitor/Icon";
import { formatSpan } from "@/lib/monitor/model";
import type { PersonSummary } from "@/lib/productivity-store";

export const PANEL_W = 920;

function toneOf(status: string | null): string {
  const name = (status ?? "").toLowerCase();
  if (/^(para|aguard)/.test(name))
    return "bg-surface-raised text-muted-foreground ring-1 ring-line-input";
  if (/conclu|finaliz|done|complete/.test(name)) return "bg-ok/15 text-ok";
  if (/bug|bloque|cancel|reprov/.test(name)) return "bg-warn/15 text-warn";
  if (/andamento|desenvolv|progress/.test(name))
    return "bg-primary/15 text-link";
  return "bg-surface-raised text-muted-foreground ring-1 ring-line-input";
}

function StatusBadge({ status }: { status: string | null }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${toneOf(status)}`}
    >
      {status ?? "—"}
    </span>
  );
}

const DAY_FORMAT = { timeZone: "America/Sao_Paulo" } as const;

function dayKeyOf(date: Date): string {
  return date.toLocaleDateString("sv-SE", DAY_FORMAT);
}

const SERIES = [
  { key: "created", label: "abriu", color: "var(--color-primary, #a78bfa)" },
  { key: "moved", label: "moveu", color: "var(--color-ok, #4ade80)" },
  { key: "commented", label: "comentou", color: "var(--color-warn, #facc15)" },
] as const;

function DailyChart({
  people,
  days,
  now,
  focus,
}: {
  people: PersonSummary[];
  days: number;
  now: number;
  focus: string | null;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = Array.from({ length: days }, (_, index) => {
    const date = new Date(now - (days - 1 - index) * 86400000);
    const key = dayKeyOf(date);
    const totals = { created: 0, moved: 0, commented: 0 };
    for (const person of people) {
      if (focus && person.name !== focus) continue;
      const entry = person.byDay[key];
      if (!entry) continue;
      totals.created += entry.created;
      totals.moved += entry.moved;
      totals.commented += entry.commented;
    }
    return {
      key,
      date,
      ...totals,
      sum: totals.created + totals.moved + totals.commented,
    };
  });
  const max = Math.max(1, ...rows.map((row) => row.sum));
  const width = 840;
  const height = 150;
  const slot = width / rows.length;
  const bar = Math.max(2, slot * 0.7);
  const active = hover === null ? null : rows[hover];
  const activePeople = active
    ? people
        .filter((person) => !focus || person.name === focus)
        .map((person) => {
          const entry = person.byDay[active.key];
          return {
            name: person.name,
            count: entry ? entry.created + entry.moved + entry.commented : 0,
          };
        })
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count)
    : [];
  const anchor = hover === null ? 0 : (hover + 0.5) / rows.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <div className="flex items-center gap-3">
          {SERIES.map((item) => (
            <span key={item.key} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-sm"
                style={{ background: item.color }}
              />
              {item.label}
            </span>
          ))}
          {focus && <span className="text-foreground">· {focus}</span>}
        </div>
        <span className="tabular-nums">
          {active
            ? `${active.date.toLocaleDateString("pt-BR", { ...DAY_FORMAT, day: "2-digit", month: "short" })} · ${active.sum} (${active.created} abriu, ${active.moved} moveu, ${active.commented} comentou)`
            : "passe o mouse sobre um dia"}
        </span>
      </div>
      <div className="relative" onMouseLeave={() => setHover(null)}>
        {active && activePeople.length > 0 && (
          <div
            className="pointer-events-none absolute top-0 z-10 flex min-w-44 flex-col gap-1 rounded-lg border border-line-card bg-surface-raised px-3 py-2 text-[12px] shadow-lg"
            style={{
              left: `${anchor * 100}%`,
              transform: `translateX(${anchor > 0.6 ? "calc(-100% - 12px)" : "12px"})`,
            }}
          >
            {activePeople.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-4"
              >
                <span className="whitespace-nowrap text-foreground">{item.name}</span>
                <span className="font-semibold tabular-nums">{item.count}</span>
              </div>
            ))}
          </div>
        )}
        <svg viewBox={`0 0 ${width} ${height + 18}`} className="w-full">
          {rows.map((row, index) => {
            const x = index * slot + (slot - bar) / 2;
            let offset = height;
            return (
              <g key={row.key} onMouseEnter={() => setHover(index)}>
                <rect
                  x={index * slot}
                  y={0}
                  width={slot}
                  height={height}
                  fill="transparent"
                />
                {hover === index && (
                  <rect
                    x={index * slot}
                    y={0}
                    width={slot}
                    height={height}
                    className="fill-white/5"
                  />
                )}
                {row.sum > 0 && slot >= 14 && (
                  <motion.text
                    x={index * slot + slot / 2}
                    y={height - (row.sum / max) * (height - 18) - 4}
                    textAnchor="middle"
                    className="fill-foreground text-[10px] font-semibold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.012 }}
                  >
                    {row.sum}
                  </motion.text>
                )}
                {SERIES.map((item, order) => {
                  const value = row[item.key];
                  if (!value) return null;
                  const h = (value / max) * (height - 18);
                  offset -= h;
                  return (
                    <motion.rect
                      key={item.key}
                      x={x}
                      width={bar}
                      rx={1.5}
                      fill={item.color}
                      initial={{ y: height, height: 0 }}
                      animate={{ y: offset, height: h }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.012 + order * 0.05,
                        ease: "easeOut",
                      }}
                    />
                  );
                })}
              </g>
            );
          })}
          {rows.map((row, index) =>
            index % Math.max(1, Math.ceil(rows.length / 8)) === 0 ? (
              <text
                key={row.key}
                x={index * slot + slot / 2}
                y={height + 14}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {row.date.toLocaleDateString("pt-BR", {
                  ...DAY_FORMAT,
                  day: "2-digit",
                  month: "2-digit",
                })}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </div>
  );
}

const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

const KIND_LABEL = {
  created: "abriu",
  status: "moveu",
  comment: "comentou",
  assignee: "atribuiu",
} as const;

export function ProductivityPanel({
  x,
  y,
  projects,
  now,
}: {
  x: number;
  y: number;
  projects: string[];
  now: number;
}) {
  const [days, setDays] = useState(30);
  const [project, setProject] = useState("");
  const [people, setPeople] = useState<PersonSummary[] | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [sources, setSources] = useState<
    { listId: string; label: string; url?: string | null }[]
  >([]);
  const [list, setList] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const query = new URLSearchParams({ days: String(days) });
    if (project) query.set("project", project);
    if (list) query.set("list", list);
    fetch(`/api/produtividade?${query}`)
      .then(async (res) => {
        if (res.status === 403) {
          if (!cancelled) setAllowed(false);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setPeople(data.people ?? []);
          setSources(data.sources ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setPeople([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, project, list, reload]);

  if (!allowed) return null;

  return (
    <motion.div
      className="absolute flex flex-col gap-5 rounded-2xl border border-line-card bg-card p-8"
      style={{ left: x, top: y, width: PANEL_W }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="m-0 text-[28px] font-semibold">Produtividade</h2>
        <div className="flex items-center gap-2 text-[13px]">
          {PERIODS.map((item) => (
            <button
              key={item.days}
              type="button"
              onClick={() => setDays(item.days)}
              className={`h-9 rounded-lg border px-3 transition-colors ${
                days === item.days
                  ? "border-primary text-foreground"
                  : "border-line-input text-muted-foreground hover:border-primary"
              }`}
            >
              {item.label}
            </button>
          ))}
          <select
            value={project}
            onChange={(event) => setProject(event.target.value)}
            className="h-9 rounded-lg border border-line-input bg-card px-2 text-muted-foreground"
          >
            <option value="">todos os projetos</option>
            {projects.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            disabled={loading}
            aria-label="Atualizar"
            title="Atualizar"
            className="flex size-9 items-center justify-center rounded-lg border border-line-input text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-60"
          >
            <Icon
              name="refresh"
              size={16}
              className={loading ? "animate-spin" : undefined}
            />
          </button>
        </div>
      </div>

      {sources.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[13px]">
          {[
            { listId: "", label: "todas as origens", url: null },
            ...sources,
          ].map((item) => (
            <div
              key={item.listId}
              className={`flex h-9 items-center rounded-lg border transition-colors ${
                list === item.listId
                  ? "border-primary text-foreground"
                  : "border-line-input text-muted-foreground hover:border-primary"
              }`}
            >
              <button
                type="button"
                onClick={() => setList(item.listId)}
                className={`h-full px-3 ${item.url ? "pr-2" : ""}`}
              >
                {item.label}
              </button>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir a lista no ClickUp"
                  aria-label="Abrir a lista no ClickUp"
                  className="flex h-full items-center pl-0.5 pr-2.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon name="open_in_new" size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {people !== null && people.length > 0 && (
        <DailyChart people={people} days={days} now={now} focus={open} />
      )}

      {people === null ? (
        <span className="text-sm text-muted-foreground">Carregando…</span>
      ) : people.length === 0 ? (
        <span className="text-sm leading-relaxed text-muted-foreground">
          Nenhuma ação registrada neste período. As ações só passam a contar
          depois que a lista do projeto é cadastrada em Configurações →
          Projetos.
        </span>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_90px_90px_100px_90px] px-4 text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
            <span>pessoa</span>
            <span className="text-right">abriu</span>
            <span className="text-right">moveu</span>
            <span className="text-right">comentou</span>
            <span className="text-right">total</span>
          </div>
          {people.map((person) => {
            const expanded = open === person.name;
            return (
              <div
                key={person.name}
                className="rounded-xl border border-line-card bg-surface-raised"
              >
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : person.name)}
                  className="grid w-full grid-cols-[1fr_90px_90px_100px_90px] items-center px-4 py-3 text-left text-[15px]"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Icon
                      name={expanded ? "expand_less" : "expand_more"}
                      size={16}
                    />
                    {person.name}
                  </span>
                  <span className="text-right tabular-nums">
                    {person.created}
                  </span>
                  <span className="text-right tabular-nums">
                    {person.moved}
                  </span>
                  <span className="text-right tabular-nums">
                    {person.commented}
                  </span>
                  <span className="text-right font-semibold tabular-nums">
                    {person.total}
                  </span>
                </button>
                {expanded && (
                  <div className="flex flex-col gap-3 border-t border-line-card px-4 py-3 text-[13px]">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(person.byProject)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, count]) => (
                          <span
                            key={name}
                            className="rounded-full border border-line-input px-2.5 py-0.5 text-muted-foreground"
                          >
                            {name} · {count}
                          </span>
                        ))}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {person.timeline.map((item, index) => (
                        <div
                          key={index}
                          className="flex flex-col gap-0.5 rounded-lg border border-line-card px-3 py-2"
                        >
                          <div className="flex items-baseline gap-3">
                            <span className="shrink-0 font-semibold text-link">
                              {item.card}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
                              {item.title ?? "Sem título"}
                            </span>
                            <span className="shrink-0 rounded-full border border-line-input px-2.5 py-0.5 text-muted-foreground">
                              {item.project}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-text-soft">
                            <span className="w-20 shrink-0 text-faint">
                              há{" "}
                              {formatSpan(
                                Math.max(now - new Date(item.at).getTime(), 0),
                              )}
                            </span>
                            {item.kind === "status" ? (
                              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                <span>moveu</span>
                                <StatusBadge status={item.from} />
                                <span className="text-faint">→</span>
                                <StatusBadge status={item.to} />
                              </span>
                            ) : (
                              <span className="min-w-0 flex-1 truncate">
                                {KIND_LABEL[item.kind]}
                                {item.kind === "comment" && item.detail
                                  ? `: ${item.detail}`
                                  : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
