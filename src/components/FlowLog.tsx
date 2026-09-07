"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckIcon, CopyIcon } from "@/components/icons";

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

function FlowLogRow({
  entry,
  copied,
  onCopy,
}: {
  entry: FlowLogEntry;
  copied: boolean;
  onCopy: () => void;
}) {
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
      className="group flex items-center gap-2.5 border-b border-white/5 px-3 py-0.5 text-[11px] leading-4 transition-colors last:border-b-0 hover:bg-white/5"
    >
      <span className="w-[58px] shrink-0 text-[#FE2B77]/40">{time}</span>
      <motion.span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        animate={entry.status === "running" ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
        transition={entry.status === "running" ? { repeat: Infinity, duration: 1 } : undefined}
      />
      <span className="w-32 shrink-0 truncate font-medium text-[#ffd9e8]">{entry.agent}</span>
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-white/55">{entry.description}</span>
        <button
          onClick={onCopy}
          title="Copiar log completo"
          className={`absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-[#1a0d20] via-[#1a0d20] to-transparent pl-4 pr-0.5 transition-opacity ${
            copied
              ? "text-[#4ade80] opacity-100"
              : "text-white/40 opacity-0 hover:text-white group-hover:opacity-100"
          }`}
        >
          {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
        </button>
      </span>
      {entry.metric && (
        <span className="shrink-0 rounded border border-white/10 px-1 text-[9px] text-white/40">
          {entry.metric}
        </span>
      )}
      <span className="w-7 shrink-0 text-right text-[9px] font-semibold text-[#FE2B77]/70">
        {entry.actorInitials}
      </span>
      <span className="w-[64px] shrink-0 text-right text-[10px] font-medium" style={{ color }}>
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyEntry(entry: FlowLogEntry) {
    const time = new Date(entry.startedAt).toLocaleString("pt-BR");
    await navigator.clipboard.writeText(`[${time}] ${entry.agent}: ${entry.description}`);
    setCopiedId(entry.id);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [entries]);

  const sorted = [...entries].sort((a, b) => b.startedAt - a.startedAt);
  const totalDoneLastHour = doneLastHour.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[#FE2B77]/20 bg-gradient-to-b from-[#52193C]/60 to-[#0F0713] font-mono shadow-lg shadow-black/40 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[#FE2B77]/20 px-3 py-2 text-[11px] tracking-wide">
        <span className="text-[#ffd9e8]/60">
          FLUXO DE ACIONAMENTOS <span className="ml-2 font-semibold text-[#ffd9e8]">
            roda a cada 30s</span>
        </span>
        <span className="text-[#ffd9e8]/40">
          {entries.length} registro{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div ref={scrollRef} className="flex max-h-80 flex-col overflow-y-auto">
        <AnimatePresence initial={false}>
          {sorted.length === 0 ? (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-3 py-5 text-center text-[11px] text-[#ffd9e8]/30"
            >
              aguardando primeira execução...
            </motion.p>
          ) : (
            sorted.map((entry) => (
              <FlowLogRow
                key={entry.id}
                entry={entry}
                copied={copiedId === entry.id}
                onCopy={() => copyEntry(entry)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col border-t border-[#FE2B77]/20 px-3 py-1.5 text-[10px] leading-4 text-[#ffd9e8]/40">
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
