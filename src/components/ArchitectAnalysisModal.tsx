"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { AnalyzedActivityRecord } from "@/lib/types";

const APPROVAL_THRESHOLD = 7;

const PROVIDER_LABEL: Record<AnalyzedActivityRecord["provider"], string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-black/35 dark:text-white/35">
        {title}
      </p>
      <div className="mt-1.5 text-sm break-words [overflow-wrap:anywhere] text-black/80 dark:text-white/80">
        {children}
      </div>
    </div>
  );
}

export function ArchitectAnalysisModal({
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

  const score = record?.architecture ?? null;
  const payload = record?.architecturePayload ?? null;
  const approved = score !== null && score >= APPROVAL_THRESHOLD;

  const copied = !!record && copiedId === record.id;

  async function copyDevPrompt() {
    if (!record || !payload?.devPrompt) return;
    await navigator.clipboard.writeText(payload.devPrompt);
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
                  {record.location} · arquitetura Salesforce
                </p>
                <p className="mt-1 text-sm break-words text-black/80 dark:text-white/80">
                  {record.title}
                </p>
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
                  onClick={onClose}
                  className="rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                >
                  fechar
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-[#38BDF8]/10 px-2 py-0.5 font-mono text-[11px] font-medium text-[#38BDF8]">
                arq {score}/10
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-medium ${
                  payload?.usesCustom
                    ? "bg-amber-400/10 text-amber-500"
                    : "bg-emerald-400/10 text-emerald-500"
                }`}
              >
                {payload?.usesCustom ? "customizado" : "nativo"}
              </span>
              {payload?.appliedStatus && (
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-medium ${
                    approved ? "bg-emerald-400/10 text-emerald-500" : "bg-rose-400/10 text-rose-500"
                  }`}
                >
                  → {payload.appliedStatus}
                </span>
              )}
              <span className="text-[11px] text-black/30 dark:text-white/30">
                via {PROVIDER_LABEL[record.provider]}
              </span>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#38BDF8]/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score * 10}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                className="h-full rounded-full bg-[#38BDF8]"
              />
            </div>

            <Section title="parecer">
              <p className="whitespace-pre-line">
                {record.architectureReasoning ?? "Sem parecer registrado."}
              </p>
            </Section>

            {payload?.nativeSolution && (
              <Section title="solução proposta">
                <p className="whitespace-pre-line">{payload.nativeSolution}</p>
              </Section>
            )}

            {payload?.usesCustom && payload.customJustification && (
              <Section title="por que precisa de customização">
                <p className="whitespace-pre-line">{payload.customJustification}</p>
              </Section>
            )}

            {!!payload?.ambiguities?.length && (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="font-mono text-[11px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  o PO precisa esclarecer · {payload.ambiguities.length}{" "}
                  {payload.ambiguities.length === 1 ? "ponto" : "pontos"}
                </p>
                <ul className="mt-2 space-y-2">
                  {payload.ambiguities.map((item, index) => (
                    <li key={item} className="flex gap-2 text-sm text-black/80 dark:text-white/80">
                      <span className="shrink-0 font-mono text-[11px] text-amber-600/70 dark:text-amber-400/70">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-black/40 dark:text-white/40">
                  Cada ponto virou um item de checklist no card do ClickUp.
                </p>
              </div>
            )}

            {!!payload?.metadataFindings?.length && (
              <Section title="metadados da org">
                <ul className="list-disc space-y-1 pl-4">
                  {payload.metadataFindings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>
            )}

            {!!payload?.docReferences?.length && (
              <Section title="documentação consultada">
                <ul className="space-y-1">
                  {payload.docReferences.map((ref) => (
                    <li key={ref.url}>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-words [overflow-wrap:anywhere] text-[#38BDF8] hover:underline"
                      >
                        {ref.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {!approved && (
              <Section title="prompt para o desenvolvimento">
                <p className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-red-600 dark:text-red-300">
                  Bloqueado: liberado só a partir de {APPROVAL_THRESHOLD}/10. Resolva os pontos
                  acima e reavalie a arquitetura.
                </p>
              </Section>
            )}

            {approved && payload?.devPrompt && (
              <Section title="prompt para o desenvolvimento">
                <div className="rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3">
                  <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-black/70 dark:text-white/70">
                    {payload.devPrompt}
                  </pre>
                  <motion.button
                    onClick={copyDevPrompt}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-2 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 font-mono text-[11px] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                  >
                    {copied ? "copiado" : "copiar prompt"}
                  </motion.button>
                </div>
              </Section>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
