"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { AnalyzedProjectRecord } from "@/lib/types";
import { scoreColor } from "@/lib/score-color";
import { ScoreIcon } from "@/components/ScoreIcon";

const PROVIDER_LABEL: Record<AnalyzedProjectRecord["provider"], string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
};

function AnalysisList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] font-medium text-black/50 dark:text-white/50">
        {title} <span className="text-black/30 dark:text-white/30">({items.length})</span>
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="rounded-md border px-2.5 py-1.5 text-xs text-black/70 dark:text-white/70"
            style={{ borderColor: `${tone}33`, backgroundColor: `${tone}0d` }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectScopeAnalysisModal({
  record,
  onClose,
}: {
  record: AnalyzedProjectRecord | null;
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
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-xs text-black/40 dark:text-white/40">análise de escopo</p>
                <p className="mt-1 text-sm text-black/80 dark:text-white/80">{record.projectName}</p>
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
                análise via {PROVIDER_LABEL[record.provider]} · {record.commitCount} commit
                {record.commitCount !== 1 ? "s" : ""} considerados
              </span>
            </div>

            <p className="mt-4 text-sm text-black/70 dark:text-white/70">{record.critique}</p>

            <div className="mt-4 flex flex-col gap-4 overflow-y-auto pr-1">
              <AnalysisList title="tópicos do escopo ainda não tratados" items={record.missingTopics} tone="#eab308" />
              <AnalysisList title="trabalho fora do escopo vendido" items={record.outOfScopeWork} tone="#ef4444" />
              <AnalysisList title="excesso de entrega (além do vendido)" items={record.overDelivery} tone="#60a5fa" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
