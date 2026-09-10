"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckIcon, CopyIcon } from "@/components/icons";
import type { AiProvider, AnalyzedActivityRecord } from "@/lib/types";

export function DevPromptModal({
  record,
  provider,
  onClose,
}: {
  record: AnalyzedActivityRecord | null;
  provider: AiProvider;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const recordId = record?.id ?? null;

  // O prompt gravado e so o texto do arquiteto. O bloco de progresso precisa de um
  // token proprio, entao o lote do dev nasce aqui, na hora de abrir o modal.
  useEffect(() => {
    if (!recordId || !record) return;

    let cancelled = false;

    fetch("/api/architect/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: record.location,
        provider,
        kind: "dev",
        projectAuthors: [],
        cards: [
          {
            id: record.id,
            customId: null,
            title: record.title,
            content: "",
          },
        ],
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro ao gerar o prompt.");
        if (cancelled) return;
        setPrompt(data.prompt);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao gerar o prompt.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [recordId, record, provider]);

  useEffect(() => {
    if (!record) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [record, onClose]);

  function close() {
    setStatus("loading");
    setPrompt("");
    setError(null);
    setCopied(false);
    onClose();
  }

  async function copyPrompt() {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  return (
    <AnimatePresence>
      {record && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
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
              <div className="flex shrink-0 items-center gap-2">
                {record.url && (
                  <a
                    href={record.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                  >
                    {"ver no ClickUp"}
                  </a>
                )}
                <button
                  onClick={close}
                  className="rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                >
                  fechar
                </button>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-black/40 dark:text-white/40">
              Cole na IA que vai aplicar o desenvolvimento na org. Ele é autocontido — quem receber
              não precisa do card nem desta tela. Enquanto ela trabalha, a linha do card mostra em
              que etapa está.
            </p>

            {status === "loading" && (
              <p className="mt-6 text-center font-mono text-xs text-black/40 dark:text-white/40">
                gerando o prompt...
              </p>
            )}

            {status === "error" && (
              <p className="mt-6 text-center font-mono text-xs text-red-400">{error}</p>
            )}

            {status === "ready" && (
              <>
                <pre className="mt-3 flex-1 overflow-auto rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap text-black/70 dark:text-white/70">
                  {prompt}
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
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
