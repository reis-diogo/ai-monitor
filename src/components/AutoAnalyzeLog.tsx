"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { scoreColor } from "@/lib/score-color";
import { truncate } from "@/lib/truncate";
import { ChevronIcon } from "@/components/icons";

export type AutoAnalyzeLogEntry = {
  id: string;
  timestamp: string;
  title: string;
  customId: string | null;
  score: number | null;
  flagged: boolean;
  error: string | null;
};

export function AutoAnalyzeLog({ entries }: { entries: AutoAnalyzeLogEntry[] }) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm text-black/60 dark:text-white/60"
      >
        <span>Log da varredura automática ({entries.length})</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-4 w-4 shrink-0 items-center justify-center text-black/30 dark:text-white/30"
        >
          <ChevronIcon />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <ul className="flex flex-col gap-2 border-t border-black/10 dark:border-white/10 px-5 py-4">
              <AnimatePresence initial={false}>
                {entries.map((entry) => (
                  <motion.li
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="shrink-0 font-mono text-black/30 dark:text-white/30">
                      {new Date(entry.timestamp).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-black/70 dark:text-white/70">
                      {entry.customId ? `${entry.customId} - ` : ""}
                      {truncate(entry.title, 40)}
                    </span>
                    {entry.error ? (
                      <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 font-mono text-red-500">
                        erro
                      </span>
                    ) : (
                      <>
                        {entry.score !== null && (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 font-mono font-medium"
                            style={{
                              color: scoreColor(entry.score).color,
                              backgroundColor: scoreColor(entry.score).bg,
                            }}
                          >
                            {entry.score}/10
                          </span>
                        )}
                        {entry.flagged && (
                          <span className="shrink-0 rounded-full border border-black/10 dark:border-white/10 px-2 py-0.5 text-black/40 dark:text-white/40">
                            sinalizado
                          </span>
                        )}
                      </>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
