"use client";

import { motion, AnimatePresence } from "motion/react";
import type { AnalyzedActivityRecord } from "@/lib/types";
import type { TrendPoint } from "@/lib/trend";
import { scoreColor } from "@/lib/score-color";
import { truncate } from "@/lib/truncate";
import { dataColor } from "@/lib/data-color";

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
            className="flex w-full max-w-md max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border bg-popover p-6"
          >
            <div className="flex shrink-0 items-start justify-between gap-4">
              <p className="text-sm text-foreground">
                {point.records.length} atividade{point.records.length > 1 ? "s" : ""} · {point.label}
              </p>
              <button
                onClick={onClose}
                className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
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
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 p-2.5 text-xs"
                >
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono font-medium"
                    style={{
                      color: dataColor(scoreColor(record.score).color),
                      backgroundColor: scoreColor(record.score).bg,
                    }}
                  >
                    qlt {record.score}/10
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">
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
