"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckIcon, CopyIcon } from "@/components/icons";
import type { AnalyzedActivityRecord } from "@/lib/types";

export function DevPromptModal({
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

  const devPrompt = record?.architecturePayload?.devPrompt ?? "";
  const copied = !!record && copiedId === record.id;

  async function copyPrompt() {
    if (!record || !devPrompt) return;
    await navigator.clipboard.writeText(devPrompt);
    setCopiedId(record.id);
  }

  return (
    <AnimatePresence>
      {record && devPrompt && (
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
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-xs text-black/40 dark:text-white/40">
                  {record.location} · prompt de desenvolvimento
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

            <p className="mt-3 text-[11px] text-black/40 dark:text-white/40">
              Cole na IA que vai aplicar o desenvolvimento na org. Ele é autocontido — quem receber
              não precisa do card nem desta tela.
            </p>

            <pre className="mt-3 flex-1 overflow-auto rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap text-black/70 dark:text-white/70">
              {devPrompt}
            </pre>

            <div className="mt-3 flex justify-end">
              <motion.button
                onClick={copyPrompt}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 font-mono text-[11px] font-medium text-background"
              >
                {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                {copied ? "copiado" : "copiar prompt"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
