"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckIcon, CopyIcon } from "@/components/icons";

type SkillTokenRecord = {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

export function SkillPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokens, setTokens] = useState<SkillTokenRecord[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    fetch("/api/skill-tokens")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setTokens(data.tokens ?? []);
      })
      .catch(() => {
        // A lista e acessoria: sem ela ainda da para gerar um token novo.
      });

    return () => {
      cancelled = true;
    };
  }, [open, reloadKey]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function generate() {
    setStatus("loading");
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/skill-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "skill refinar-arquiteto" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar o token.");
      setPrompt(data.installPrompt);
      setStatus("ready");
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar o token.");
      setStatus("error");
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/skill-tokens?id=${id}`, { method: "DELETE" });
    setReloadKey((key) => key + 1);
  }

  function close() {
    setPrompt("");
    setStatus("idle");
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
              <div className="min-w-0">
                <p className="font-mono text-xs text-black/40 dark:text-white/40">
                  skill do claude code
                </p>
                <p className="mt-1 text-sm text-black/80 dark:text-white/80">
                  refinar arquitetura direto do terminal
                </p>
              </div>
              <button
                onClick={close}
                className="shrink-0 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                fechar
              </button>
            </div>

            <p className="mt-3 text-[11px] text-black/40 dark:text-white/40">
              Gere o prompt e cole no Claude Code. Ele instala a skill; rodar
              <span className="font-mono"> /refinar-arquiteto </span>
              lista os projetos com fila, pergunta qual você quer e executa o crivo do arquiteto.
              O token dentro do prompt é seu: não versione e não compartilhe.
            </p>

            {status !== "ready" && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <motion.button
                  onClick={generate}
                  disabled={status === "loading"}
                  whileHover={{ scale: status === "loading" ? 1 : 1.03 }}
                  whileTap={{ scale: status === "loading" ? 1 : 0.97 }}
                  className="rounded-md bg-foreground px-3 py-1.5 font-mono text-[11px] font-medium text-background disabled:opacity-50"
                >
                  {status === "loading" ? "gerando..." : "gerar prompt da skill"}
                </motion.button>
                {status === "error" && (
                  <p className="font-mono text-xs text-red-400">{error}</p>
                )}
              </div>
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

            {tokens.length > 0 && (
              <div className="mt-4 border-t border-black/10 dark:border-white/10 pt-3">
                <p className="font-mono text-[11px] text-black/40 dark:text-white/40">
                  seus tokens ativos
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {tokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center justify-between gap-3 font-mono text-[11px] text-black/50 dark:text-white/50"
                    >
                      <span className="truncate">
                        {new Date(token.createdAt).toLocaleDateString("pt-BR")}
                        {token.lastUsedAt
                          ? ` · usado em ${new Date(token.lastUsedAt).toLocaleDateString("pt-BR")}`
                          : " · nunca usado"}
                      </span>
                      <button
                        onClick={() => revoke(token.id)}
                        className="shrink-0 text-red-400/70 hover:text-red-400"
                      >
                        revogar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
