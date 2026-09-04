"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export type FlowLogEntry = {
  id: string;
  startedAt: number;
  agent: string;
  description: string;
  metric?: string;
  actorInitials: string;
  status: "running" | "ok" | "error";
  finishedAt?: number;
};

const STATUS_COLOR: Record<FlowLogEntry["status"], string> = {
  running: "#FE2B77",
  ok: "#4ade80",
  error: "#f87171",
};

function FlowLogRow({ entry }: { entry: FlowLogEntry }) {
  const time = new Date(entry.startedAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const color = STATUS_COLOR[entry.status];
  const durationText =
    entry.status === "running"
      ? "····· EXEC"
      : entry.finishedAt
        ? `${((entry.finishedAt - entry.startedAt) / 1000).toFixed(1)}s ${entry.status === "ok" ? "OK" : "ERR"}`
        : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5 text-[12px] last:border-b-0"
    >
      <span className="w-[72px] shrink-0 text-[#FE2B77]/40">{time}</span>
      <motion.span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        animate={entry.status === "running" ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
        transition={entry.status === "running" ? { repeat: Infinity, duration: 1 } : undefined}
      />
      <span className="w-36 shrink-0 truncate font-medium text-[#ffd9e8]">{entry.agent}</span>
      <span className="min-w-0 flex-1 truncate text-white/55">{entry.description}</span>
      {entry.metric && (
        <span className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
          {entry.metric}
        </span>
      )}
      <span className="w-8 shrink-0 text-right text-[10px] font-semibold text-[#FE2B77]/70">
        {entry.actorInitials}
      </span>
      <span className="w-[74px] shrink-0 text-right text-[11px] font-medium" style={{ color }}>
        {durationText}
      </span>
    </motion.div>
  );
}

export function FlowLog({
  entries,
  pendingCount,
  doneLastHour,
}: {
  entries: FlowLogEntry[];
  pendingCount: number;
  doneLastHour: { authorName: string; count: number }[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [entries]);

  const sorted = [...entries].sort((a, b) => b.startedAt - a.startedAt);
  const totalDoneLastHour = doneLastHour.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[#FE2B77]/20 bg-gradient-to-b from-[#52193C]/60 to-[#180A1B] font-mono shadow-lg shadow-black/40 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[#FE2B77]/20 px-4 py-3 text-[12px] tracking-wide">
        <span className="text-[#ffd9e8]/60">
          FLUXO DE ACIONAMENTOS <span className="ml-2 font-semibold text-[#ffd9e8]">atualiza a cada 30s</span>
        </span>
        <span className="text-[#ffd9e8]/40">
          {entries.length} registro{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div ref={scrollRef} className="flex max-h-72 flex-col overflow-y-auto">
        <AnimatePresence initial={false}>
          {sorted.length === 0 ? (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-6 text-center text-[12px] text-[#ffd9e8]/30"
            >
              aguardando primeira execução...
            </motion.p>
          ) : (
            sorted.map((entry) => <FlowLogRow key={entry.id} entry={entry} />)
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-0.5 border-t border-[#FE2B77]/20 px-4 py-2.5 text-[11px] text-[#ffd9e8]/40">
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
