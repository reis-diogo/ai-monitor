"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/monitor/Icon";
import {
  APPROVED_STATUS,
  REFINE_STATUS,
  VALIDATE_STATUS,
} from "@/lib/architect-gate";
import type { ArchitectPayload } from "@/lib/types";
import { stageOf, type MonitorCard } from "@/lib/monitor/model";

const SUMMARY_LIMIT = 140;

function shorten(text: string): string {
  const raw = text.trim().split(/(?<=[.!?])\s/)[0] ?? "";
  const plain = raw
    .replace(/\([^)]*\)/g, "")
    .replace(/['"`][^'"`]*['"`]/g, "")
    .replace(/\b\w+\.\w+\b/g, "")
    .replace(/\b[\w-]*_[\w-]*\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[,;:]\s*(?=[,;:.])/g, "")
    .trim();
  const base = plain.length >= 20 ? plain : raw;
  if (base.length <= SUMMARY_LIMIT) return base;
  const cut = base.slice(0, SUMMARY_LIMIT);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 40 ? space : SUMMARY_LIMIT).replace(/[\s,;:]+$/, "")}…`;
}

export function CardDetailModal({
  card,
  description,
  onClose,
  onDecided,
  onDeleted,
}: {
  card: MonitorCard | null;
  description: string;
  onClose: () => void;
  onDecided: (id: string, status: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [deleteStep, setDeleteStep] = useState<
    "idle" | "confirm" | "deleting" | "error"
  >("idle");
  const [decided, setDecided] = useState<string | null>(null);
  const [choice, setChoice] = useState<"approve" | "reject" | "revise" | null>(
    null,
  );
  const [reviseState, setReviseState] = useState<
    "idle" | "loading" | "copied" | "error"
  >("idle");
  const [reviseError, setReviseError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [decisionState, setDecisionState] = useState<"idle" | "saving">("idle");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [qaState, setQaState] = useState<"idle" | "saving" | "error">("idle");
  const [qaChoice, setQaChoice] = useState<"done" | "bug" | null>(null);
  const [qaNote, setQaNote] = useState("");
  const [qaImage, setQaImage] = useState<{ file: File; url: string } | null>(
    null,
  );
  const [qaResultState, setQaResultState] = useState<"idle" | "saving">("idle");
  const [qaError, setQaError] = useState<string | null>(null);
  const [canDecide, setCanDecide] = useState(false);
  const [reviewLoaded, setReviewLoaded] = useState(false);
  const [solution, setSolution] = useState<ArchitectPayload | null>(null);
  const [devState, setDevState] = useState<
    "idle" | "loading" | "copied" | "error"
  >("idle");
  const [copied, setCopied] = useState(false);
  const [promptState, setPromptState] = useState<
    "idle" | "loading" | "copied" | "error"
  >("idle");

  async function copy() {
    if (!card) return;
    try {
      await navigator.clipboard.writeText(
        `${card.title}\n\n${description.trim()}`.trim(),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function createPrompt() {
    if (!card || promptState === "loading") return;
    setPromptState("loading");
    try {
      const res = await fetch("/api/architect/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "po",
          project: card.project,
          cards: [
            {
              id: card.id,
              customId: card.customId,
              title: card.title,
              content: description,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.prompt) throw new Error(data.error ?? "erro");
      await navigator.clipboard.writeText(data.prompt);
      setPromptState("copied");
    } catch {
      setPromptState("error");
    }
    setTimeout(() => setPromptState("idle"), 2500);
  }

  const cardId = card?.id;
  const loadReview = card
    ? (decided ?? card.status).toLowerCase() === VALIDATE_STATUS
    : false;

  useEffect(() => {
    if (!cardId || !loadReview) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/clickup/decision").then((res) => res.json()),
      fetch(`/api/analysis/${encodeURIComponent(cardId)}`).then((res) =>
        res.json(),
      ),
    ])
      .then(([access, analysis]) => {
        if (cancelled) return;
        setCanDecide(access?.canDecide === true);
        setSolution(analysis?.analysis?.architecturePayload ?? null);
        setReviewLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setReviewLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, loadReview]);

  async function submitDecision() {
    if (!card || !choice || decisionState === "saving") return;
    if (choice === "reject" && !reason.trim()) {
      setDecisionError("Escreva o motivo da reprovação.");
      return;
    }
    setDecisionState("saving");
    setDecisionError(null);
    try {
      const res = await fetch("/api/clickup/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, decision: choice, reason }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "Erro ao registrar a decisão.");
      onDecided(card.id, data.status);
      if (choice === "reject") {
        onClose();
      } else {
        setDecided(data.status);
        setChoice(null);
        setReason("");
      }
    } catch (error) {
      setDecisionError(
        error instanceof Error ? error.message : "Erro ao registrar a decisão.",
      );
    }
    setDecisionState("idle");
  }

  async function createRevisionPrompt() {
    if (!card || reviseState === "loading") return;
    if (!reason.trim()) {
      setReviseError("Escreva a observação antes de gerar o prompt.");
      return;
    }
    setReviseState("loading");
    setReviseError(null);
    try {
      const res = await fetch("/api/architect/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "revisao",
          project: card.project,
          observation: reason,
          cards: [
            {
              id: card.id,
              customId: card.customId,
              title: card.title,
              content: description,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.prompt)
        throw new Error(data.error ?? "Erro ao gerar o prompt.");
      await navigator.clipboard.writeText(data.prompt);
      setReviseState("copied");
    } catch (error) {
      setReviseError(
        error instanceof Error ? error.message : "Erro ao gerar o prompt.",
      );
      setReviseState("error");
    }
  }

  function pickQaImage(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) {
      setQaError("O print precisa ser uma imagem de até 4 MB.");
      return;
    }
    setQaError(null);
    setQaImage((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { file, url: URL.createObjectURL(file) };
    });
  }

  function clearQaImage() {
    setQaImage((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });
  }

  async function submitQa() {
    if (!card || !qaChoice || qaResultState === "saving") return;
    if (qaChoice === "bug" && !qaNote.trim()) {
      setQaError("Escreva a observação do bug.");
      return;
    }
    setQaResultState("saving");
    setQaError(null);
    try {
      const form = new FormData();
      form.append("id", card.id);
      form.append("result", qaChoice);
      form.append("note", qaNote);
      if (qaImage) form.append("image", qaImage.file);
      const res = await fetch("/api/clickup/qa", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao registrar o QA.");
      onDecided(card.id, data.status);
      onClose();
    } catch (error) {
      setQaError(
        error instanceof Error ? error.message : "Erro ao registrar o QA.",
      );
    }
    setQaResultState("idle");
  }

  async function deleteCard() {
    if (!card || deleteStep === "deleting") return;
    setDeleteStep("deleting");
    try {
      const res = await fetch(
        `/api/clickup/tasks/${encodeURIComponent(card.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("erro");
      onDeleted(card.id);
      onClose();
    } catch {
      setDeleteStep("error");
    }
  }

  async function advanceToQa() {
    if (!card || qaState === "saving") return;
    setQaState("saving");
    try {
      const res = await fetch("/api/clickup/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao avançar o card.");
      onDecided(card.id, data.status);
      setDecided(data.status);
      setQaState("idle");
    } catch {
      setQaState("error");
    }
  }

  async function copyDevPrompt() {
    if (!card || devState === "loading") return;
    setDevState("loading");
    try {
      const res = await fetch("/api/architect/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "dev",
          project: card.project,
          cards: [
            {
              id: card.id,
              customId: card.customId,
              title: card.title,
              content: description,
            },
          ],
        }),
      });
      const data = await res.json();
      const prompt = data?.prompt;
      if (!res.ok || typeof prompt !== "string" || !prompt.trim())
        throw new Error("sem prompt");
      await navigator.clipboard.writeText(prompt);
      setDevState("copied");
    } catch {
      setDevState("error");
    }
    setTimeout(() => setDevState("idle"), 2500);
  }

  useEffect(() => {
    if (!card) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onClose();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [card, onClose]);

  const status = (decided ?? card?.status ?? "").toLowerCase();
  const awaitingDecision = status === VALIDATE_STATUS;
  const headline =
    solution?.summary?.trim() || shorten(solution?.nativeSolution ?? "");
  const steps = solution?.flow ?? [];
  const released = status === APPROVED_STATUS;
  const inQa = status === "em qa";

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          key="card-detail"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={card.title}
            className="flex max-h-[85vh] w-[min(720px,100%)] flex-col gap-4 overflow-y-auto rounded-2xl border border-line-input bg-card p-6 shadow-[0_24px_64px_var(--shadow-pop)]"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.45, 0.05, 0.35, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-bold text-link">
                  {card.customId}
                </span>
                <h2 className="m-0 text-lg font-semibold leading-snug">
                  {card.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                title="Fechar (Esc)"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line-input text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{
                    background: card.color ?? "var(--muted-foreground)",
                  }}
                />
                {decided ?? card.status}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="person" size={14} />
                {card.owner}
              </span>
            </div>
            {stageOf(status) === 0 && (
              <button
                type="button"
                onClick={createPrompt}
                disabled={promptState === "loading"}
                className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Icon
                  name={
                    promptState === "copied"
                      ? "check"
                      : promptState === "loading"
                        ? "progress_activity"
                        : "code"
                  }
                  size={16}
                  className={
                    promptState === "loading" ? "animate-spin" : undefined
                  }
                />
                {promptState === "copied"
                  ? "Prompt copiado"
                  : promptState === "error"
                    ? "Falhou, tente de novo"
                    : "Criar prompt"}
              </button>
            )}
            {stageOf(status) === 2 && (
              <div
                className={`relative flex min-h-24 flex-col rounded-xl border border-line-card bg-surface-raised ${"min-h-0 flex-1"}`}
              >
                <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap p-4 pb-12 text-sm leading-relaxed text-text-soft">
                  {description.trim() || "Sem descrição."}
                </div>
                <div className="absolute bottom-3 right-3 flex gap-2">
                  {released && (
                    <button
                      type="button"
                      onClick={copyDevPrompt}
                      disabled={devState === "loading"}
                      className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      <Icon
                        name={
                          devState === "copied"
                            ? "check"
                            : devState === "loading"
                              ? "progress_activity"
                              : "code"
                        }
                        size={14}
                        className={
                          devState === "loading" ? "animate-spin" : undefined
                        }
                      />
                      {devState === "copied"
                        ? "Prompt copiado"
                        : devState === "error"
                          ? "Sem prompt do dev"
                          : "Copiar prompt do dev"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={copy}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-line-input bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    <Icon name={copied ? "check" : "content_copy"} size={14} />
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            )}
            {awaitingDecision && (
              <div className="flex shrink-0 flex-col gap-5 rounded-xl border border-line-card bg-surface-raised p-4">
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Solução proposta
                    </span>
                    {solution && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          solution.usesCustom
                            ? "bg-warn/15 text-warn"
                            : "bg-ok/15 text-ok"
                        }`}
                      >
                        {solution.usesCustom ? "customizada" : "nativa"}
                      </span>
                    )}
                  </div>
                  {!reviewLoaded ? (
                    <span className="text-xs text-muted-foreground">
                      Carregando parecer…
                    </span>
                  ) : headline ? (
                    <>
                      <p className="m-0 font-medium leading-snug text-foreground">
                        {headline}
                      </p>
                      {steps.length > 0 && (
                        <div className="flex flex-wrap items-center gap-y-2">
                          {steps.map((step, index) => (
                            <motion.div
                              key={`${index}-${step}`}
                              className="flex items-center"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: index * 0.09,
                                duration: 0.2,
                              }}
                            >
                              <span className="flex items-center gap-1.5 rounded-lg border border-line-input bg-card px-2.5 py-1.5 text-xs text-text-soft">
                                <span className="flex size-4 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">
                                  {index + 1}
                                </span>
                                {step}
                              </span>
                              {index < steps.length - 1 && (
                                <span
                                  className="px-1.5 text-muted-foreground"
                                  aria-hidden="true"
                                >
                                  →
                                </span>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Sem parecer registrado.
                    </span>
                  )}
                </div>
                {reviewLoaded && !canDecide ? (
                  <span className="text-xs text-muted-foreground">
                    Aguardando um arquiteto decidir.
                  </span>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setChoice("approve");
                          setDecisionError(null);
                        }}
                        aria-pressed={choice === "approve"}
                        className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                          choice === "approve"
                            ? "border-ok bg-ok/15 text-ok"
                            : "border-line-input text-muted-foreground hover:border-ok hover:text-ok"
                        }`}
                      >
                        <Icon name="check" size={16} />
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChoice("revise");
                          setDecisionError(null);
                          setReviseError(null);
                          setReviseState("idle");
                        }}
                        aria-pressed={choice === "revise"}
                        className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                          choice === "revise"
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-line-input text-muted-foreground hover:border-primary hover:text-primary"
                        }`}
                      >
                        <Icon name="edit_note" size={16} />
                        Revisão
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChoice("reject");
                          setDecisionError(null);
                        }}
                        aria-pressed={choice === "reject"}
                        className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                          choice === "reject"
                            ? "border-destructive bg-destructive/15 text-destructive"
                            : "border-line-input text-muted-foreground hover:border-destructive hover:text-destructive"
                        }`}
                      >
                        <Icon name="close" size={16} />
                        Reprovar
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {choice && (
                        <motion.div
                          key="decision-form"
                          className="flex flex-col gap-2 overflow-hidden"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            duration: 0.18,
                            ease: [0.45, 0.05, 0.35, 1],
                          }}
                        >
                          <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            rows={3}
                            placeholder={
                              choice === "revise"
                                ? "Observação (obrigatória): o ponto que você quer questionar no prompt do dev. É a primeira pergunta do debate."
                                : choice === "reject"
                                  ? `Motivo da reprovação (obrigatório). O card volta para "${REFINE_STATUS}".`
                                  : `Justificativa (opcional). O card vai para "${APPROVED_STATUS}".`
                            }
                            className="w-full resize-none rounded-lg border border-line-input bg-card p-3 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:border-primary"
                          />
                          {choice === "revise" && reviseError && (
                            <span className="text-xs text-destructive">
                              {reviseError}
                            </span>
                          )}
                          {choice === "revise" && reviseState === "copied" && (
                            <span className="text-xs text-muted-foreground">
                              Prompt copiado. Cole na sua máquina: ao fim do
                              debate o card vai para &quot;{APPROVED_STATUS}
                              &quot;.
                            </span>
                          )}
                          {choice !== "revise" && decisionError && (
                            <span className="text-xs text-destructive">
                              {decisionError}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={
                              choice === "revise"
                                ? createRevisionPrompt
                                : submitDecision
                            }
                            disabled={
                              decisionState === "saving" ||
                              reviseState === "loading" ||
                              ((choice === "reject" || choice === "revise") &&
                                !reason.trim())
                            }
                            className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            {(decisionState === "saving" ||
                              reviseState === "loading") && (
                              <Icon
                                name="progress_activity"
                                size={16}
                                className="animate-spin"
                              />
                            )}
                            {choice === "approve"
                              ? "Confirmar aprovação"
                              : choice === "revise"
                                ? reviseState === "copied"
                                  ? "Copiar de novo"
                                  : "Gerar prompt de revisão"
                                : "Confirmar reprovação"}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            )}
            {released && (
              <button
                type="button"
                onClick={advanceToQa}
                disabled={qaState === "saving"}
                className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Icon
                  name={qaState === "saving" ? "progress_activity" : "check"}
                  size={16}
                  className={qaState === "saving" ? "animate-spin" : undefined}
                />
                {qaState === "error"
                  ? "Falhou, tente de novo"
                  : "Avançar para QA"}
              </button>
            )}
            {inQa && (
              <div className="flex shrink-0 flex-col gap-4 rounded-xl border border-line-card bg-surface-raised p-4">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Resultado do QA
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQaChoice("done");
                      setQaError(null);
                    }}
                    aria-pressed={qaChoice === "done"}
                    className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                      qaChoice === "done"
                        ? "border-ok bg-ok/15 text-ok"
                        : "border-line-input text-muted-foreground hover:border-ok hover:text-ok"
                    }`}
                  >
                    <Icon name="check" size={16} />
                    Deploy UAT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQaChoice("bug");
                      setQaError(null);
                    }}
                    aria-pressed={qaChoice === "bug"}
                    className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                      qaChoice === "bug"
                        ? "border-destructive bg-destructive/15 text-destructive"
                        : "border-line-input text-muted-foreground hover:border-destructive hover:text-destructive"
                    }`}
                  >
                    <Icon name="warning" size={16} />
                    Bug
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {qaChoice && (
                    <motion.div
                      key="qa-form"
                      className="flex flex-col gap-2 overflow-hidden"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        duration: 0.18,
                        ease: [0.45, 0.05, 0.35, 1],
                      }}
                    >
                      <textarea
                        value={qaNote}
                        onChange={(event) => setQaNote(event.target.value)}
                        onPaste={(event) => {
                          const item = Array.from(
                            event.clipboardData.items,
                          ).find((entry) => entry.type.startsWith("image/"));
                          const file = item?.getAsFile();
                          if (file) {
                            event.preventDefault();
                            pickQaImage(file);
                          }
                        }}
                        rows={3}
                        placeholder={
                          qaChoice === "bug"
                            ? "Observação (obrigatória): o que falhou e como reproduzir. Cole um print aqui (Ctrl/Cmd+V). O card vai para bug."
                            : "Observação (opcional): o que foi testado e confirmado. O card vai para deploy uat."
                        }
                        className="w-full resize-none rounded-lg border border-line-input bg-card p-3 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:border-primary"
                      />
                      {qaImage ? (
                        <div className="flex items-center gap-3 rounded-lg border border-line-input bg-card p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qaImage.url}
                            alt="Print anexado"
                            className="h-14 w-20 rounded-md object-cover"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            {qaImage.file.name || "print.png"}
                          </span>
                          <button
                            type="button"
                            onClick={clearQaImage}
                            aria-label="Remover print"
                            className="flex size-7 items-center justify-center rounded-md border border-line-input text-muted-foreground hover:border-destructive hover:text-destructive"
                          >
                            <Icon name="close" size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex h-8 w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-line-input px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
                          <Icon name="add" size={14} />
                          Anexar print
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              pickQaImage(event.target.files?.[0]);
                              event.target.value = "";
                            }}
                          />
                        </label>
                      )}
                      {qaError && (
                        <span className="text-xs text-destructive">
                          {qaError}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={submitQa}
                        disabled={
                          qaResultState === "saving" ||
                          (qaChoice === "bug" && !qaNote.trim())
                        }
                        className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {qaResultState === "saving" && (
                          <Icon
                            name="progress_activity"
                            size={16}
                            className="animate-spin"
                          />
                        )}
                        {qaChoice === "bug"
                          ? "Confirmar bug"
                          : "Confirmar deploy uat"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <a
              href={card.url}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-line-input text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <Icon name="open_in_new" size={16} />
              Abrir no ClickUp
            </a>
            <button
              type="button"
              onClick={() =>
                deleteStep === "confirm"
                  ? deleteCard()
                  : setDeleteStep("confirm")
              }
              onBlur={() =>
                setDeleteStep((step) => (step === "confirm" ? "idle" : step))
              }
              disabled={deleteStep === "deleting"}
              className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] border text-sm font-semibold transition-colors disabled:opacity-60 ${
                deleteStep === "confirm" || deleteStep === "error"
                  ? "border-destructive bg-destructive/15 text-destructive"
                  : "border-line-input text-muted-foreground hover:border-destructive hover:text-destructive"
              }`}
            >
              <Icon
                name={
                  deleteStep === "deleting" ? "progress_activity" : "delete"
                }
                size={16}
                className={
                  deleteStep === "deleting" ? "animate-spin" : undefined
                }
              />
              {deleteStep === "confirm"
                ? "Clique de novo para apagar no ClickUp"
                : deleteStep === "error"
                  ? "Não foi possível apagar (só o admin apaga)"
                  : "Apagar card"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
