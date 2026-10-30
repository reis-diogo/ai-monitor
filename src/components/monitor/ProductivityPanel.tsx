"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/monitor/Icon";
import { formatSpan } from "@/lib/monitor/model";
import type { PersonSummary } from "@/lib/productivity-store";

export const PANEL_W = 920;

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
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ days: String(days) });
    if (project) query.set("project", project);
    fetch(`/api/produtividade?${query}`)
      .then(async (res) => {
        if (res.status === 403) {
          if (!cancelled) setAllowed(false);
          return;
        }
        const data = await res.json();
        if (!cancelled) setPeople(data.people ?? []);
      })
      .catch(() => {
        if (!cancelled) setPeople([]);
      });
    return () => {
      cancelled = true;
    };
  }, [days, project]);

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
        </div>
      </div>

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
                        <div key={index} className="flex items-baseline gap-3">
                          <span className="w-20 shrink-0 text-faint">
                            há {formatSpan(Math.max(now - new Date(item.at).getTime(), 0))}
                          </span>
                          <span className="font-semibold text-link">{item.card}</span>
                          <span className="min-w-0 flex-1 truncate text-text-soft">
                            {KIND_LABEL[item.kind]}
                            {item.kind === "status" && ` ${item.from ?? "—"} → ${item.to ?? "—"}`}
                            {item.kind === "comment" && item.detail ? `: ${item.detail}` : ""}
                            {item.title ? ` · ${item.title}` : ""}
                          </span>
                          <span className="shrink-0 text-faint">{item.project}</span>
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
