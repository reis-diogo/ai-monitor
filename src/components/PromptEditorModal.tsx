"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { AiPrompt } from "@/lib/types";

export function PromptEditorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    fetch("/api/prompts")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro ao carregar prompts.");
        if (cancelled) return;
        const list: AiPrompt[] = data.prompts ?? [];
        setPrompts(list);
        setActiveKey(list[0]?.key ?? null);
        setDraft(list[0]?.content ?? "");
        setStatus("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar prompts.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);


  function close() {
    setStatus("loading");
    setError(null);
    onClose();
  }

  function selectPrompt(key: string) {
    const prompt = prompts.find((p) => p.key === key);
    if (!prompt) return;
    setActiveKey(key);
    setDraft(prompt.content);
  }

  async function persist(reset: boolean) {
    if (!activeKey) return;
    setStatus("saving");
    setError(null);

    try {
      const res = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: activeKey, content: draft, reset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar prompt.");

      const saved: AiPrompt = data.prompt;
      setPrompts((prev) => prev.map((p) => (p.key === saved.key ? saved : p)));
      setDraft(saved.content);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar prompt.");
      setStatus("error");
    }
  }

  const active = prompts.find((p) => p.key === activeKey) ?? null;
  const dirty = !!active && active.content !== draft;

  return (
    <AnimatePresence>
      {open && (
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
              <div>
                <p className="font-mono text-xs text-black/40 dark:text-white/40">
                  prompts do arquiteto
                </p>
                <p className="mt-1 text-sm text-black/80 dark:text-white/80">
                  Editar altera o comportamento das próximas análises.
                </p>
              </div>
              <button
                onClick={close}
                className="shrink-0 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                fechar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-1">
              {prompts.map((prompt) => (
                <button
                  key={prompt.key}
                  onClick={() => selectPrompt(prompt.key)}
                  className={`relative rounded-full px-3 py-1.5 font-mono text-[11px] transition-colors ${
                    prompt.key === activeKey ? "text-background" : "text-foreground/50"
                  }`}
                >
                  {prompt.key === activeKey && (
                    <motion.span
                      layoutId="prompt-editor-pill"
                      className="absolute inset-0 rounded-full bg-foreground"
                      transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    />
                  )}
                  <span className="relative">{prompt.label}</span>
                </button>
              ))}
            </div>

            {status === "loading" ? (
              <p className="mt-6 text-center font-mono text-xs text-black/40 dark:text-white/40">
                carregando...
              </p>
            ) : (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                className="mt-3 min-h-[320px] flex-1 resize-none rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 font-mono text-[12px] leading-5 text-black/80 dark:text-white/80 outline-none focus:border-primary/40"
              />
            )}

            {error && (
              <p className="mt-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-[11px] text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                onClick={() => persist(true)}
                disabled={status === "saving"}
                className="rounded-md border border-black/10 dark:border-white/10 px-2 py-1 font-mono text-[11px] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white disabled:opacity-40"
              >
                restaurar padrão
              </button>

              <div className="flex items-center gap-2">
                {dirty && (
                  <span className="font-mono text-[11px] text-amber-500">alterações não salvas</span>
                )}
                <motion.button
                  onClick={() => persist(false)}
                  disabled={status === "saving" || !dirty}
                  whileHover={dirty ? { scale: 1.03 } : undefined}
                  whileTap={dirty ? { scale: 0.97 } : undefined}
                  className="rounded-md bg-foreground px-3 py-1.5 font-mono text-[11px] font-medium text-background disabled:opacity-40"
                >
                  {status === "saving" ? "salvando..." : "salvar"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
