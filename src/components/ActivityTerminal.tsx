"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export type TerminalLogEntry = {
  id: string;
  timestamp: string;
  text: string;
  tone: "info" | "success" | "warning" | "error";
};

const TONE_COLOR: Record<TerminalLogEntry["tone"], string> = {
  info: "#9ca3af",
  success: "#4ade80",
  warning: "#facc15",
  error: "#f87171",
};

export function ActivityTerminal({
  entries,
  pendingCount,
  doneLastHour,
}: {
  entries: TerminalLogEntry[];
  pendingCount: number;
  doneLastHour: { authorName: string; count: number }[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries]);

  const totalDoneLastHour = doneLastHour.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="w-full shadow shadow-lg overflow-hidden rounded-lg border border-white/15 bg-black/90 font-mono text-[11px] shadow-lg shadow-black/20 backdrop-blur-xl backdrop-brightness-50 backdrop-saturate-150">
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red-500/70" />
        <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
        <span className="h-2 w-2 rounded-full bg-green-500/70" />
      </div>

      <div ref={scrollRef} className="flex max-h-36 flex-col gap-1 overflow-y-auto px-3 py-2">
        <AnimatePresence initial={false}>
          {entries.length === 0 ? (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/30">
              aguardando próxima varredura...
            </motion.p>
          ) : (
            entries.map((entry) => (
              <motion.p
                key={entry.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                style={{ color: TONE_COLOR[entry.tone] }}
              >
                <span className="text-white/25">
                  [{new Date(entry.timestamp).toLocaleTimeString("pt-BR")}]
                </span>{" "}
                {entry.text}
              </motion.p>
            ))
          )}
        </AnimatePresence>
        <motion.span
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 0.5, 1] }}
          className="inline-block h-3 w-1.5 bg-green-400"
        />
      </div>

      <div className="flex flex-col gap-0.5 border-t border-white/10 px-3 py-2 text-white/50">
        <span>{pendingCount} card(s) em &quot;para desenvolver&quot;</span>
        <span>
          {totalDoneLastHour} atividade(s) processada(s) na última hora
          {doneLastHour.length > 0 &&
            ` · ${doneLastHour.map((d) => `${d.authorName} (${d.count})`).join(", ")}`}
        </span>
      </div>
    </div>
  );
}
