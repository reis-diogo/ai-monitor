"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckIcon, CopyIcon } from "@/components/icons";
import type { ActivityItem, AiProvider } from "@/lib/types";

export function LocalArchitectModal({
  project,
  cards,
  provider,
  kind = "architect",
  projectAuthors,
  onClose,
}: {
  project: string | null;
  cards: ActivityItem[];
  provider: AiProvider;
  kind?: "architect" | "review";
  projectAuthors: string[];
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!project) return;

    let cancelled = false;

    fetch("/api/architect/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project,
        provider,
        kind,
        projectAuthors,
        cards: cards.map((card) => ({
          id: card.id,
          customId: card.customId,
          title: card.title,
          content: card.content,
        })),
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro ao gerar o prompt.");
        if (cancelled) return;
        setPrompt(data.prompt);
        setExpiresAt(data.expiresAt);
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
  }, [project, provider, cards, kind, projectAuthors]);

  useEffect(() => {
    if (!project) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [project, onClose]);

  function close() {
    setStatus("loading");
    setPrompt("");
    setError(null);
    setCopied(false);
    onClose();
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  return (
    <AnimatePresence>
      {project && (
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
                  {kind === "review" ? "revisão da entrega" : "arquitetura local"} · {project}
                </p>
                <p className="mt-1 text-sm text-black/80 dark:text-white/80">
                  Cole na sua IA local, apontando para o retrieve da org.{" "}
                  {kind === "review"
                    ? `Ela confere ${cards.length} entrega(s) contra a especificação e devolve o parecer.`
                    : `Ela analisa ${cards.length} card(s) e devolve o parecer pro app.`}
                </p>
              </div>
              <button
                onClick={close}
                className="shrink-0 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                fechar
              </button>
            </div>

            {status === "loading" && (
              <p className="mt-6 text-center font-mono text-xs text-black/40 dark:text-white/40">
                gerando prompt...
              </p>
            )}

            {status === "error" && (
              <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-[11px] text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            {status === "ready" && (
              <>
                <pre className="mt-4 flex-1 overflow-auto rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap text-black/70 dark:text-white/70">
                  {prompt}
                </pre>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="font-mono text-[11px] text-black/35 dark:text-white/35">
                    o token expira em{" "}
                    {expiresAt ? new Date(expiresAt).toLocaleString("pt-BR") : "12h"}
                  </p>
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
