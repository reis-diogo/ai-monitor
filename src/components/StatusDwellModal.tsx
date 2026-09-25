"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ActivityItem, StatusDwell } from "@/lib/types";
import { DWELL_BUCKETS, dwellBucket, formatDwell } from "@/lib/dwell";
import { ExternalLinkIcon } from "@/components/icons";
import { truncate } from "@/lib/truncate";

// Nestes dois status quem destrava o card e uma pessoa, nao o time: agrupar por ela
// transforma a lista num pedido de acao com destinatario.
const GROUPED_BY_OWNER = new Set(["refinar po", "em qa"]);

export type DwellSelection = {
  status: string;
  project: string | null;
};

function bucketColor(elapsedMs: number): string {
  const key = dwellBucket(elapsedMs);
  return DWELL_BUCKETS.find((bucket) => bucket.key === key)?.color ?? "#a1a1aa";
}

export function StatusDwellModal({
  selection,
  items,
  dwellMap,
  now,
  onClose,
}: {
  selection: DwellSelection | null;
  items: ActivityItem[];
  dwellMap: Map<string, StatusDwell>;
  now: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!selection) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection, onClose]);

  const cards = useMemo(() => {
    if (!selection) return [];

    return items
      .filter(
        (item) =>
          item.source === "clickup" &&
          item.status?.toLowerCase() === selection.status &&
          (!selection.project || item.location === selection.project)
      )
      .map((item) => ({ item, since: dwellMap.get(item.id)?.since ?? null }))
      .sort((a, b) => {
        // Sem tempo apurado vai para o fim: a lista existe para mostrar quem esta
        // parado ha mais tempo, e "nao sei" nao compete com um numero.
        if (!a.since) return 1;
        if (!b.since) return -1;
        return new Date(a.since).getTime() - new Date(b.since).getTime();
      });
  }, [selection, items, dwellMap]);

  const groups = useMemo(() => {
    if (!selection) return [];
    if (!GROUPED_BY_OWNER.has(selection.status)) {
      return [{ owner: null as string | null, cards }];
    }

    const byOwner = new Map<string, typeof cards>();
    for (const entry of cards) {
      const list = byOwner.get(entry.item.authorName) ?? [];
      list.push(entry);
      byOwner.set(entry.item.authorName, list);
    }

    return Array.from(byOwner.entries())
      .map(([owner, ownerCards]) => ({ owner, cards: ownerCards }))
      .sort((a, b) => b.cards.length - a.cards.length);
  }, [selection, cards]);

  return (
    <AnimatePresence>
      {selection && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 font-mono"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-black/40 dark:text-white/40">
                  parado em &quot;{selection.status}&quot;
                  {selection.project && ` · ${selection.project}`}
                </p>
                <p className="mt-1 text-sm text-black/80 dark:text-white/80">
                  {cards.length} card{cards.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                fechar
              </button>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
              {groups.map((group) => (
                <div key={group.owner ?? "todos"}>
                  {group.owner && (
                    <p className="mb-1.5 text-[11px] text-black/40 dark:text-white/40">
                      {group.owner} · {group.cards.length} card
                      {group.cards.length === 1 ? "" : "s"}
                    </p>
                  )}

                  <ul className="flex flex-col gap-1">
                    {group.cards.map(({ item, since }) => (
                      <li key={item.id} className="flex items-baseline gap-2 text-[11px]">
                        <span
                          className="w-14 shrink-0 text-right tabular-nums"
                          style={{
                            color: since
                              ? bucketColor(now - new Date(since).getTime())
                              : undefined,
                          }}
                        >
                          {since ? formatDwell(since, now) : "—"}
                        </span>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex shrink-0 items-center gap-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                        >
                          {item.customId ?? item.id}
                          <ExternalLinkIcon size={9} />
                        </a>

                        <span className="min-w-0 flex-1 truncate text-black/50 dark:text-white/50">
                          {truncate(item.title, 60)}
                        </span>

                        {!selection.project && (
                          <span className="shrink-0 text-black/30 dark:text-white/30">
                            {item.location}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
