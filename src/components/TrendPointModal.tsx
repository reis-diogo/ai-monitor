"use client";

import { motion, AnimatePresence } from "motion/react";
import type { AnalyzedActivityRecord } from "@/lib/types";
import type { TrendPoint } from "@/lib/trend";
import { scoreColor } from "@/lib/score-color";
import { ScoreIcon } from "@/components/ScoreIcon";
import { truncate } from "@/lib/truncate";

export function TrendPointModal({
  point,
  onClose,
  onSelectRecord,
}: {
  point: TrendPoint | null;
  onClose: () => void;
  onSelectRecord: (record: AnalyzedActivityRecord) => void;
}) {
  return (
    <AnimatePresence>
      {point && (
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
            className="flex w-full max-w-md max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-6"
          >
            <div className="flex shrink-0 items-start justify-between gap-4">
              <p className="text-sm text-black/70 dark:text-white/70">
                {point.records.length} atividade{point.records.length > 1 ? "s" : ""} · {point.label}
              </p>
              <button
                onClick={onClose}
                className="shrink-0 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                fechar
              </button>
            </div>

            <ul className="mt-4 flex flex-col gap-2 overflow-y-auto pr-1">
              {point.records.map((record) => (
                <motion.li
                  key={`${record.provider}:${record.id}`}
                  onClick={() => onSelectRecord(record)}
                  whileHover={{ backgroundColor: "var(--accent)" }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/5 dark:border-white/5 p-2.5 text-xs"
                >
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono font-medium"
                    style={{
                      color: scoreColor(record.score).color,
                      backgroundColor: scoreColor(record.score).bg,
                    }}
                  >
                    <ScoreIcon score={record.score} size={11} />
                    {record.score}/10
                  </span>
                  <span className="min-w-0 flex-1 truncate text-black/70 dark:text-white/70">
                    {truncate(record.title, 40)}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
