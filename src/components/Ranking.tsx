"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { AnalyzedActivityRecord, RankingEntry } from "@/lib/types";
import { scoreColor } from "@/lib/score-color";
import { ScoreIcon } from "@/components/ScoreIcon";
import { RankingTrend } from "@/components/RankingTrend";
import { TrendPeriodToggle } from "@/components/TrendPeriodToggle";
import { TrendPointModal } from "@/components/TrendPointModal";
import { CommitAnalysisModal } from "@/components/CommitAnalysisModal";
import { buildTrend, type TrendPeriod, type TrendPoint } from "@/lib/trend";
import { ChevronIcon } from "@/components/icons";

const MEDAL = ["🥇", "🥈", "🥉"];

const PERIOD_LABEL: Record<TrendPeriod, string> = {
  "30d": "últimos 30 dias",
  "3m": "últimos 3 meses",
  "12m": "últimos 12 meses",
};

export function Ranking({
  title,
  entries,
  analyzedActivities,
}: {
  title: string;
  entries: RankingEntry[];
  analyzedActivities: AnalyzedActivityRecord[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("30d");
  const [selectedPoint, setSelectedPoint] = useState<TrendPoint | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AnalyzedActivityRecord | null>(null);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-5"
    >
      <p className="text-sm text-black/60 dark:text-white/60">{title}</p>

      {entries.length === 0 ? (
        <p className="text-xs text-black/30 dark:text-white/30">Sem dados ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {entries.map((entry, i) => {
              const style = scoreColor(entry.averageScore);
              const isExpanded = expanded === entry.authorName;

              return (
                <motion.li
                  key={entry.authorName}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className={`rounded-lg ${i === 0 ? "border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.04]" : ""}`}
                >
                  <button
                    onClick={() => setExpanded(isExpanded ? null : entry.authorName)}
                    className="flex w-full items-center gap-3 p-2.5 text-left"
                  >
                    <span className="w-5 shrink-0 text-center text-xs text-black/40 dark:text-white/40">
                      {MEDAL[i] ?? `#${i + 1}`}
                    </span>

                    {entry.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.avatarUrl}
                        alt={entry.authorName}
                        className="h-8 w-8 shrink-0 rounded-full"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10 dark:bg-white/10 text-[10px] font-medium">
                        {entry.authorName.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-black/80 dark:text-white/80">{entry.authorName}</p>
                      <p className="text-[11px] text-black/30 dark:text-white/30">
                        {entry.analyzedCount} commit{entry.analyzedCount > 1 ? "s" : ""} analisado
                        {entry.analyzedCount > 1 ? "s" : ""}
                      </p>
                    </div>

                    <span
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-medium"
                      style={{ color: style.color, backgroundColor: style.bg }}
                    >
                      <ScoreIcon score={entry.averageScore} size={12} />
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={entry.averageScore.toFixed(1)}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="inline-block"
                        >
                          {entry.averageScore.toFixed(1)}/10
                        </motion.span>
                      </AnimatePresence>
                    </span>

                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-4 w-4 shrink-0 items-center justify-center text-black/30 dark:text-white/30"
                    >
                      <ChevronIcon />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-2.5 pb-3 pt-1">
                          <div className="mb-2 flex items-center justify-between gap-2 px-1">
                            <p className="text-[10px] text-black/30 dark:text-white/30">
                              nota média · {PERIOD_LABEL[trendPeriod]}
                            </p>
                            <TrendPeriodToggle
                              groupId={`trend-${entry.authorName}`}
                              value={trendPeriod}
                              onChange={setTrendPeriod}
                            />
                          </div>
                          <RankingTrend
                            points={buildTrend(analyzedActivities, entry.authorName, trendPeriod)}
                            onSelectPoint={setSelectedPoint}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <TrendPointModal
        point={selectedPoint}
        onClose={() => setSelectedPoint(null)}
        onSelectRecord={(record) => setSelectedRecord(record)}
      />

      <CommitAnalysisModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </motion.div>
  );
}
