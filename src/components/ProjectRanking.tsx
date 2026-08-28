"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { AnalyzedProjectRecord } from "@/lib/types";
import { scoreColor } from "@/lib/score-color";
import { ScoreIcon } from "@/components/ScoreIcon";
import { ProjectScopeAnalysisModal } from "@/components/ProjectScopeAnalysisModal";

export function ProjectRanking({ entries }: { entries: AnalyzedProjectRecord[] }) {
  const [selected, setSelected] = useState<AnalyzedProjectRecord | null>(null);

  const sorted = [...entries].sort((a, b) => a.score - b.score);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-5"
    >
      <div>
        <p className="text-sm text-black/60 dark:text-white/60">Ranking · Escopo x Entrega</p>
        <p className="text-[11px] text-black/30 dark:text-white/30">
          projetos mais críticos primeiro — vendido vs. desenvolvido
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-black/30 dark:text-white/30">
          Nenhum projeto analisado ainda. Defina o escopo e use &quot;analisar escopo do
          projeto&quot; na lista de atividades.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {sorted.map((entry) => {
              const style = scoreColor(entry.score);
              return (
                <motion.li
                  key={entry.projectId}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                >
                  <button
                    onClick={() => setSelected(entry)}
                    className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-black/80 dark:text-white/80">{entry.projectName}</p>
                      <p className="truncate text-[11px] text-black/30 dark:text-white/30">
                        {entry.missingTopics.length > 0 &&
                          `${entry.missingTopics.length} tópico${entry.missingTopics.length > 1 ? "s" : ""} pendente${entry.missingTopics.length > 1 ? "s" : ""}`}
                        {entry.missingTopics.length > 0 && entry.outOfScopeWork.length > 0 && " · "}
                        {entry.outOfScopeWork.length > 0 &&
                          `${entry.outOfScopeWork.length} fora do escopo`}
                        {(entry.missingTopics.length > 0 || entry.outOfScopeWork.length > 0) &&
                          entry.overDelivery.length > 0 &&
                          " · "}
                        {entry.overDelivery.length > 0 && `${entry.overDelivery.length} entrega extra`}
                        {entry.missingTopics.length === 0 &&
                          entry.outOfScopeWork.length === 0 &&
                          entry.overDelivery.length === 0 &&
                          "sem desvios identificados"}
                      </p>
                    </div>

                    <span
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-medium"
                      style={{ color: style.color, backgroundColor: style.bg }}
                    >
                      <ScoreIcon score={entry.score} size={12} />
                      {entry.score}/10
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <ProjectScopeAnalysisModal record={selected} onClose={() => setSelected(null)} />
    </motion.div>
  );
}
