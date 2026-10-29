"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/monitor/Icon";
import { ZoneTabs } from "@/components/monitor/ZoneTabs";
import { formatSpan } from "@/lib/monitor/model";
import { clock, type Update } from "@/lib/monitor/updates";

export const NODE_W = 1500;
export const NODE_H = 1300;
export const NODE_GAP = 120;

export function ProjectUpdatesNode({
  project,
  updates,
  titles,
  now,
  dir,
  x,
  y,
  anchorX,
  gap,
  onClose,
}: {
  project: string;
  updates: Update[];
  titles: Map<string, string>;
  now: number;
  dir: "up" | "down";
  anchorX: number;
  gap: number;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("__all");
  const people = useMemo(() => {
    const groups = new Map<string, Update[]>();
    for (const update of updates) {
      const name = update.assignee ?? update.owner ?? "Sem responsável";
      const list = groups.get(name) ?? [];
      list.push(update);
      groups.set(name, list);
    }
    return [...groups.entries()]
      .sort((a, b) => b[1][0].at - a[1][0].at)
      .map(([name, list]) => ({ name, list }));
  }, [updates]);
  const active = people.some((person) => person.name === tab) ? tab : "__all";
  const visible = active === "__all" ? updates : (people.find((person) => person.name === active)?.list ?? []);
  const origin = dir === "up" ? "50% 100%" : "50% 0%";
  const lineY = dir === "up" ? y + NODE_H : y - gap;
  const centerX = x + NODE_W / 2;
  const minX = Math.min(anchorX, centerX) - 6;
  const spanW = Math.abs(anchorX - centerX) + 12;
  const ax = anchorX - minX;
  const cx = centerX - minX;
  const nodeY = dir === "up" ? 0 : gap;
  const regionY = dir === "up" ? gap : 0;
  const busY = dir === "up" ? gap * 0.22 : gap * 0.78;
  const path = `M ${cx} ${nodeY} L ${cx} ${busY} L ${ax} ${busY} L ${ax} ${regionY}`;

  return (
    <>
      <svg
        className="pointer-events-none absolute z-20 overflow-visible"
        style={{ left: minX, top: lineY, width: spanW, height: gap }}
        aria-hidden="true"
      >
        <motion.path
          d={path}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2 10"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.45, 0.05, 0.35, 1] }}
        />
        <circle cx={ax} cy={regionY} r={9} fill="var(--primary)" />
      </svg>
      <motion.div
        role="dialog"
        aria-label={`Últimas atualizações de ${project}`}
        className="absolute z-30 flex flex-col gap-4 overflow-hidden rounded-3xl border-2 border-primary bg-card p-7 shadow-[0_24px_64px_var(--shadow-pop)]"
        style={{ left: x, top: y, width: NODE_W, height: NODE_H, transformOrigin: origin }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.25, ease: [0.45, 0.05, 0.35, 1] }}
      >
        <div className="flex items-center gap-4">
          <span className="truncate rounded-xl border-2 border-line-input bg-surface-raised px-5 py-2 text-[32px] font-bold">
            {project}
          </span>
          <span className="text-[24px] text-muted-foreground">últimas atualizações</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="ml-auto flex h-16 shrink-0 items-center justify-center gap-3 rounded-xl border-2 border-line-input bg-surface-raised px-8 text-[26px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Icon name="close" size={28} />
            Fechar detalhes
          </button>
        </div>

        {people.length > 0 && (
          <ZoneTabs
            tabs={[
              {
                key: "__all",
                label: "Todos",
                badge: updates.length,
                idleMs: updates.length ? Math.max(now - updates[0].at, 0) : null,
              },
              ...people.map((person) => ({
                key: person.name,
                label: person.name,
                badge: person.list.length,
                idleMs: Math.max(now - person.list[0].at, 0),
              })),
            ]}
            active={active}
            onSelect={setTab}
            badgeLabel="movimentações"
          />
        )}

        {updates.length === 0 && (
          <span className="text-[22px] text-faint">Nenhuma movimentação registrada neste projeto.</span>
        )}

        <div
          data-scroll
          className="scroll-visible flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-3"
        >
          {visible.map((update) => {
            const when = clock(update.at);
            const title = update.ticket ? titles.get(update.ticket) : undefined;
            return (
              <div
                key={update.key}
                className="flex flex-col gap-1 rounded-2xl border-2 border-line-card bg-surface-raised px-5 py-3"
              >
                <div className="flex items-baseline justify-between gap-4 text-[24px]">
                  <span className="min-w-0 truncate">
                    <span className="font-bold text-link">{update.ticket}</span>{" "}
                    <span className="text-muted-foreground">foi para</span> {update.to}
                  </span>
                  <span className="shrink-0 text-[19px] text-faint">
                    há {formatSpan(Math.max(now - update.at, 0))}
                  </span>
                </div>
                {title && <span className="truncate text-[20px] text-text-soft">{title}</span>}
                <span className="text-[18px] text-faint">
                  {when.day ? `${when.day} ${when.time}` : when.time}
                  {update.assignee ? ` · responsável: ${update.assignee}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
