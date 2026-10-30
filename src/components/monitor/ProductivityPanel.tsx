"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/monitor/Icon";
import { formatSpan } from "@/lib/monitor/model";
import type { PersonSummary } from "@/lib/productivity-store";

export const PANEL_W = 920;

function toneOf(status: string | null): string {
  const name = (status ?? "").toLowerCase();
  if (/^(para|aguard)/.test(name)) return "bg-surface-raised text-muted-foreground ring-1 ring-line-input";
  if (/conclu|finaliz|done|complete/.test(name)) return "bg-ok/15 text-ok";
  if (/bug|bloque|cancel|reprov/.test(name)) return "bg-warn/15 text-warn";
  if (/andamento|desenvolv|progress/.test(name)) return "bg-primary/15 text-link";
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
  const [sources, setSources] = useState<{ listId: string; label: string; url?: string | null }[]>([]);
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
          {[{ listId: "", label: "todas as origens", url: null }, ...sources].map((item) => (
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

      {people === null ? (
        <span className="text-sm text-muted-foreground">Carregando…</span>
      ) : people.length === 0 ? (
        <span className="text-sm leading-relaxed text-muted-foreground">
          Nenhuma ação registrada neste período. As ações só passam a contar depois que
          a lista do projeto é cadastrada em Configurações → Projetos.
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
                    <Icon name={expanded ? "expand_less" : "expand_more"} size={16} />
                    {person.name}
                  </span>
                  <span className="text-right tabular-nums">{person.created}</span>
                  <span className="text-right tabular-nums">{person.moved}</span>
                  <span className="text-right tabular-nums">{person.commented}</span>
                  <span className="text-right font-semibold tabular-nums">{person.total}</span>
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
                            <span className="shrink-0 font-semibold text-link">{item.card}</span>
                            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
                              {item.title ?? "Sem título"}
                            </span>
                            <span className="shrink-0 rounded-full border border-line-input px-2.5 py-0.5 text-muted-foreground">
                              {item.project}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-text-soft">
                            <span className="w-20 shrink-0 text-faint">
                              há {formatSpan(Math.max(now - new Date(item.at).getTime(), 0))}
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
                                {item.kind === "comment" && item.detail ? `: ${item.detail}` : ""}
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
