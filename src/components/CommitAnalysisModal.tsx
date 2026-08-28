"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { AnalyzedActivityRecord } from "@/lib/types";
import { scoreColor } from "@/lib/score-color";
import { ScoreIcon } from "@/components/ScoreIcon";

const PROVIDER_LABEL: Record<AnalyzedActivityRecord["provider"], string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
};

export function CommitAnalysisModal({
  record,
  onClose,
}: {
  record: AnalyzedActivityRecord | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!record) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [record, onClose]);

  return (
    <AnimatePresence>
      {record && (
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
            className="w-full max-w-lg rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-xs text-black/40 dark:text-white/40">
                  {record.location} {record.source === "commit" && `· ${record.id.slice(0, 7)}`}
                </p>
                <p className="mt-1 text-sm text-black/80 dark:text-white/80">{record.title}</p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                fechar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium"
                style={{ color: scoreColor(record.score).color, backgroundColor: scoreColor(record.score).bg }}
              >
                <ScoreIcon score={record.score} size={12} />
                {record.score}/10
              </span>
              <span className="text-[11px] text-black/30 dark:text-white/30">
                análise via {PROVIDER_LABEL[record.provider]} · {record.authorName}
              </span>
              {record.additions !== null && record.deletions !== null && (
                <span className="ml-auto font-mono text-xs">
                  <span className="text-green-400">+{record.additions}</span>{" "}
                  <span className="text-red-400">-{record.deletions}</span>
                </span>
              )}
            </div>

            <p className="mt-4 text-sm text-black/80 dark:text-white/80">{record.intent}</p>
            <p className="mt-2 text-sm text-black/50 dark:text-white/50">{record.critique}</p>

            <a
              href={record.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-xs text-black/40 dark:text-white/40 hover:underline"
            >
              {record.source === "commit" ? "ver commit no GitHub" : "ver atividade no ClickUp"}
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
