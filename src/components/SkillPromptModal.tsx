"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { buildSkillInstallPrompt, type SkillKind } from "@/lib/ai/skill-prompt";

type SkillTokenRecord = {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

const SKILL_OPTIONS: {
  value: SkillKind;
  label: string;
  command: string;
  headline: string;
  blurb: string;
  needsToken: boolean;
}[] = [
  {
    value: "architect",
    label: "arquiteto",
    command: "/refinar-arquiteto",
    headline: "refinar arquitetura direto do terminal",
    blurb: "lista os projetos com fila, pergunta qual você quer e executa o crivo do arquiteto.",
    needsToken: true,
  },
  {
    value: "review",
    label: "revisor",
    command: "/revisar-entrega",
    headline: "revisar entregas direto do terminal",
    blurb:
      'lista os projetos com cards em "dev finalizado", pergunta qual você quer e confere a entrega contra a especificação do arquiteto.',
    needsToken: true,
  },
  {
    value: "pr",
    label: "pr",
    command: "/pr",
    headline: "abrir o PR do dia direto do terminal",
    blurb:
      "confere o typecheck, cria a branch do dia com o seu nome, commita o pendente e abre o PR sem merge, no padrão do time.",
    needsToken: false,
  },
];

export function SkillPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [skill, setSkill] = useState<SkillKind>("architect");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokens, setTokens] = useState<SkillTokenRecord[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const option = SKILL_OPTIONS.find((item) => item.value === skill) ?? SKILL_OPTIONS[0];

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

  function resetPrompt() {
    setPrompt("");
    setStatus("idle");
    setError(null);
    setCopied(false);
  }

  function selectSkill(next: SkillKind) {
    if (next === skill) return;
    setSkill(next);
    resetPrompt();
  }

  async function generate() {
    setError(null);
    setCopied(false);

    if (!option.needsToken) {
      setPrompt(buildSkillInstallPrompt({ skill: "pr" }));
      setStatus("ready");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/skill-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill }),
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
    resetPrompt();
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
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-popover p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted-foreground">
                  skills do claude code
                </p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={option.value}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="mt-1 text-sm text-foreground"
                  >
                    {option.headline}
                  </motion.p>
                </AnimatePresence>
              </div>
              <button
                onClick={close}
                className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                fechar
              </button>
            </div>

            <LayoutGroup id="skill-kind">
              <div className="mt-4 inline-flex self-start rounded-full border border-border bg-muted p-0.5 font-mono text-[11px]">
                {SKILL_OPTIONS.map((item) => {
                  const active = item.value === skill;
                  return (
                    <button
                      key={item.value}
                      onClick={() => selectSkill(item.value)}
                      className={`relative rounded-full px-3 py-1 transition-colors ${
                        active ? "text-primary-foreground" : "text-foreground/50 hover:text-foreground/80"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="skill-kind-pill"
                          className="absolute inset-0 rounded-full bg-primary"
                          transition={{ type: "spring", stiffness: 500, damping: 34 }}
                        />
                      )}
                      <span className="relative">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>

            <p className="mt-3 text-[11px] text-muted-foreground">
              Gere o prompt e cole no Claude Code. Ele instala a skill; rodar
              <span className="font-mono"> {option.command} </span>
              {option.blurb}
              {option.needsToken && " O token dentro do prompt é seu: não versione e não compartilhe."}
            </p>

            {status !== "ready" && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <motion.button
                  onClick={generate}
                  disabled={status === "loading"}
                  whileHover={{ scale: status === "loading" ? 1 : 1.03 }}
                  whileTap={{ scale: status === "loading" ? 1 : 0.97 }}
                  className="rounded-md bg-primary px-3 py-1.5 font-mono text-[11px] font-medium text-primary-foreground disabled:opacity-50"
                >
                  {status === "loading" ? "gerando..." : `gerar prompt da skill ${option.command}`}
                </motion.button>
                {status === "error" && (
                  <p className="font-mono text-xs text-red-400">{error}</p>
                )}
              </div>
            )}

            {status === "ready" && (
              <>
                <pre className="mt-3 flex-1 overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap text-foreground">
                  {prompt}
                </pre>

                <div className="mt-3 flex justify-end">
                  <motion.button
                    onClick={copyPrompt}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-[11px] font-medium text-primary-foreground"
                  >
                    {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                    {copied ? "copiado" : "copiar prompt"}
                  </motion.button>
                </div>
              </>
            )}

            {tokens.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="font-mono text-[11px] text-muted-foreground">
                  seus tokens ativos
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {tokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center justify-between gap-3 font-mono text-[11px] text-muted-foreground"
                    >
                      <span className="truncate">
                        {token.label && (
                          <span className="text-foreground">
                            {token.label.replace(/^skill\s+/, "")} ·{" "}
                          </span>
                        )}
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
