"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { ActivityItem, StatusDwell } from "@/lib/types";
import { DWELL_BUCKETS, DWELL_STATUSES, dwellBucket } from "@/lib/dwell";
import { StatusDwellModal, type DwellSelection } from "@/components/StatusDwellModal";

type Slots = Record<string, number>;

type ProjectRow = {
  project: string;
  total: number;
  unknown: number;
  slots: Slots;
};

type StatusRow = {
  status: string;
  total: number;
  projects: ProjectRow[];
};

function emptySlots(): Slots {
  return Object.fromEntries(DWELL_BUCKETS.map((bucket) => [bucket.key, 0]));
}

function Bar({
  slots,
  unknown,
  total,
  maxTotal,
  onClick,
  title,
}: {
  slots: Slots;
  unknown: number;
  total: number;
  maxTotal: number;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-5 min-w-0 flex-1 items-stretch gap-px overflow-hidden rounded-full bg-muted/30 transition-opacity hover:opacity-80"
      style={{ maxWidth: `${(total / maxTotal) * 100}%` }}
    >
      {DWELL_BUCKETS.map((bucket) => {
        const count = slots[bucket.key];
        if (!count) return null;

        return (
          <motion.span
            key={bucket.key}
            layout
            initial={{ flexGrow: 0 }}
            animate={{ flexGrow: count }}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
            className="flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: bucket.color }}
          >
            <span className="px-1 text-[10px] font-medium tabular-nums text-black/70">
              {count}
            </span>
          </motion.span>
        );
      })}

      {unknown > 0 && (
        <span
          className="flex items-center justify-center overflow-hidden bg-muted-foreground/20"
          style={{ flexGrow: unknown }}
        >
          <span className="px-1 text-[10px] tabular-nums text-muted-foreground">{unknown}</span>
        </span>
      )}
    </button>
  );
}

export function StatusDwellChart({
  items,
  dwellMap,
  onSeed,
  seeding,
  now,
}: {
  items: ActivityItem[];
  dwellMap: Map<string, StatusDwell>;
  onSeed: () => void;
  seeding: boolean;
  now: number;
}) {
  const [selection, setSelection] = useState<DwellSelection | null>(null);

  const rows: StatusRow[] = useMemo(() => {
    return DWELL_STATUSES.map((status) => {
      const cards = items.filter(
        (item) => item.source === "clickup" && item.status?.toLowerCase() === status
      );

      const byProject = new Map<string, ProjectRow>();

      for (const card of cards) {
        const row =
          byProject.get(card.location) ??
          { project: card.location, total: 0, unknown: 0, slots: emptySlots() };

        row.total += 1;

        const since = dwellMap.get(card.id)?.since;
        if (since) row.slots[dwellBucket(now - new Date(since).getTime())] += 1;
        else row.unknown += 1;

        byProject.set(card.location, row);
      }

      return {
        status,
        total: cards.length,
        // Projeto com mais card parado primeiro: e onde o PO precisa olhar.
        projects: Array.from(byProject.values()).sort((a, b) => b.total - a.total),
      };
    }).filter((row) => row.total > 0);
  }, [items, dwellMap, now]);

  const maxTotal = Math.max(...rows.flatMap((row) => row.projects.map((p) => p.total)), 1);
  const pendingSeed = rows.reduce(
    (sum, row) => sum + row.projects.reduce((inner, p) => inner + p.unknown, 0),
    0
  );

  if (!rows.length) return null;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5 font-mono dark:shadow-lg dark:shadow-black/40"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-muted-foreground dark:text-[#ffd9e8]/70">
            Tempo parado no status
          </p>
          <div className="flex items-center gap-3">
            {DWELL_BUCKETS.map((bucket) => (
              <span key={bucket.key} className="flex items-center gap-1 text-[11px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: bucket.color }} />
                <span className="text-muted-foreground">{bucket.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.status} className="flex flex-col gap-1">
              <button
                onClick={() => setSelection({ status: row.status, project: null })}
                className="flex w-fit items-baseline gap-2 text-[11px] text-foreground hover:underline"
              >
                {row.status}
                <span className="tabular-nums text-muted-foreground">{row.total}</span>
              </button>

              {row.projects.map((project) => (
                <div key={project.project} className="flex items-center gap-3 text-[11px]">
                  <span className="w-32 shrink-0 truncate pl-3 text-muted-foreground">
                    {project.project}
                  </span>

                  <div className="flex min-w-0 flex-1 items-stretch">
                    <Bar
                      slots={project.slots}
                      unknown={project.unknown}
                      total={project.total}
                      maxTotal={maxTotal}
                      onClick={() =>
                        setSelection({ status: row.status, project: project.project })
                      }
                      title={`${project.total} card(s) de ${project.project} em "${row.status}"`}
                    />
                  </div>

                  <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                    {project.total}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {pendingSeed > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 text-[11px]">
            <span className="text-muted-foreground">
              {pendingSeed} card{pendingSeed > 1 ? "s" : ""} sem tempo apurado. O sync só enxerga
              mudança a partir de agora — o histórico vem do ClickUp.
            </span>
            <motion.button
              onClick={onSeed}
              disabled={seeding}
              whileHover={{ scale: seeding ? 1 : 1.03 }}
              whileTap={{ scale: seeding ? 1 : 0.97 }}
              className="shrink-0 rounded-full border border-border px-3 py-1 text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40"
            >
              {seeding ? "apurando..." : "apurar tempo"}
            </motion.button>
          </div>
        )}
      </motion.div>

      <StatusDwellModal
        selection={selection}
        items={items}
        dwellMap={dwellMap}
        now={now}
        onClose={() => setSelection(null)}
      />
    </>
  );
}
