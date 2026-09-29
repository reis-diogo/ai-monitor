"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { AnalyzedActivityRecord } from "@/lib/types";
import { useFullAnalysis } from "@/lib/use-full-analysis";

const PROVIDER_LABEL: Record<AnalyzedActivityRecord["provider"], string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
};

const DIFFICULTY_LABEL = (value: number) => {
  if (value <= 2) return "trivial";
  if (value <= 4) return "simples";
  if (value <= 6) return "moderada";
  if (value <= 8) return "complexa";
  return "muito complexa";
};

export function DifficultyAnalysisModal({
  record: listRecord,
  onClose,
}: {
  record: AnalyzedActivityRecord | null;
  onClose: () => void;
}) {
  // A listagem chega sem os campos longos; o parecer inteiro vem aqui, ao abrir.
  const record = useFullAnalysis(listRecord);

  useEffect(() => {
    if (!record) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [record, onClose]);

  const difficulty = record?.difficulty ?? null;

  return (
    <AnimatePresence>
      {record && difficulty !== null && (
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
            className="w-full max-w-lg rounded-2xl border border-border bg-popover p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted-foreground">
                  {record.location} · dificuldade técnica
                </p>
                <p className="mt-1 text-sm text-foreground">{record.title}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {record.url && (
                  <a
                    href={record.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {record.source === "commit" ? "ver no GitHub" : "ver no ClickUp"}
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  fechar
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-[#8B5CF6]/10 px-2 py-0.5 font-mono text-[11px] font-medium text-[#8B5CF6]">
                dif {difficulty}/10
              </span>
              <span className="text-[11px] text-muted-foreground/60">
                {DIFFICULTY_LABEL(difficulty)} · estimada via {PROVIDER_LABEL[record.provider]}
              </span>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#8B5CF6]/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${difficulty * 10}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                className="h-full rounded-full bg-[#8B5CF6]"
              />
            </div>

            <p className="mt-4 whitespace-pre-line text-sm text-foreground">
              {record.difficultyReasoning ?? "Sem justificativa registrada."}
            </p>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
