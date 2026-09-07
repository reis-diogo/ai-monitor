"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckIcon, CopyIcon } from "@/components/icons";
import type { AnalyzedActivityRecord } from "@/lib/types";

const APPROVAL_THRESHOLD = 7;

function List({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  if (!items.length) return null;

  return (
    <div className="mt-4">
      <p className="font-mono text-[11px] uppercase tracking-wide" style={{ color }}>
        {title} · {items.length}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="break-words [overflow-wrap:anywhere] text-sm text-black/80 dark:text-white/80"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewAnalysisModal({
  record,
  onClose,
}: {
  record: AnalyzedActivityRecord | null;
  onClose: () => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!record) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [record, onClose]);

  const score = record?.review ?? null;
  const payload = record?.reviewPayload ?? null;
  const approved = score !== null && score >= APPROVAL_THRESHOLD;
  const copied = !!record && copiedId === record.id;

  async function copyFixPrompt() {
    if (!record || !payload?.fixPrompt) return;
    await navigator.clipboard.writeText(payload.fixPrompt);
    setCopiedId(record.id);
  }

  return (
    <AnimatePresence>
      {record && score !== null && (
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
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-xs text-black/40 dark:text-white/40">
                  {record.location} · revisão da entrega
                </p>
                <p className="mt-1 text-sm break-words text-black/80 dark:text-white/80">
                  {record.title}
                </p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                fechar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#2dd4bf]/10 px-2 py-0.5 font-mono text-[11px] font-medium text-[#2dd4bf]">
                rev {score}/10
              </span>
              {payload?.appliedStatus && (
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-medium ${
                    approved ? "bg-emerald-400/10 text-emerald-500" : "bg-orange-400/10 text-orange-500"
                  }`}
                >
                  → {payload.appliedStatus}
                </span>
              )}
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#2dd4bf]/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score * 10}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                className="h-full rounded-full bg-[#2dd4bf]"
              />
            </div>

            <p className="mt-4 whitespace-pre-line break-words text-sm text-black/80 dark:text-white/80">
              {record.reviewReasoning ?? "Sem parecer registrado."}
            </p>

            <List title="faltando" items={payload?.missing ?? []} color="#f87171" />
            <List title="desvios" items={payload?.deviations ?? []} color="#fb923c" />
            <List title="entregue" items={payload?.delivered ?? []} color="#34d399" />

            {!approved && payload?.fixPrompt && (
              <div className="mt-4">
                <p className="font-mono text-[11px] uppercase tracking-wide text-black/35 dark:text-white/35">
                  prompt de correção
                </p>
                <div className="mt-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3">
                  <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-black/70 dark:text-white/70">
                    {payload.fixPrompt}
                  </pre>
                  <motion.button
                    onClick={copyFixPrompt}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-2 flex items-center gap-1.5 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 font-mono text-[11px] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                  >
                    {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                    {copied ? "copiado" : "copiar prompt"}
                  </motion.button>
                </div>
              </div>
            )}

            <a
              href={record.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-xs text-black/40 dark:text-white/40 hover:underline"
            >
              ver atividade no ClickUp
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
