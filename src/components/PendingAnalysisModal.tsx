"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import type { ActivityItem, AiProvider, AnalyzedActivityRecord } from "@/lib/types";
import { truncate } from "@/lib/truncate";
import { scoreColor } from "@/lib/score-color";
import { AiIcon } from "@/components/AiIcon";
import { dataColor } from "@/lib/data-color";

type RowStatus = "idle" | "loading" | "error";

function PendingAnalysisRow({
  item,
  provider,
  onAnalyzed,
  onStatusUpdate,
}: {
  item: ActivityItem;
  provider: AiProvider;
  onAnalyzed: () => void;
  onStatusUpdate?: (taskId: string, status: string) => void;
}) {
  const [status, setStatus] = useState<RowStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzedActivityRecord | null>(null);

  async function handleAnalyze() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/activities/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          source: item.source,
          title: item.title,
          content: item.content,
          provider,
          authorName: item.authorName,
          authorAvatarUrl: item.authorAvatarUrl,
          authorClickupId: item.authorClickupId,
          url: item.url,
          date: item.date,
          location: item.location,
          additions: item.additions,
          deletions: item.deletions,
          status: item.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao analisar atividade.");
      setAnalysis(data.analysis);
      setStatus("idle");
      if (data.clickupStatusUpdate) {
        onStatusUpdate?.(item.id, data.clickupStatusUpdate);
      }
      onAnalyzed();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erro ao analisar atividade.");
    }
  }

  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-border/50 p-2.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-foreground">
          {item.source === "commit" && (
            <span className="font-mono text-muted-foreground">{item.id.slice(0, 7)} · </span>
          )}
          {truncate(item.title, 50)}
        </span>
        <span className="shrink-0 text-muted-foreground/60">{item.authorName}</span>

        {analysis ? (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono font-medium"
            style={{
              color: dataColor(scoreColor(analysis.score).color),
              backgroundColor: scoreColor(analysis.score).bg,
            }}
          >
            qlt {analysis.score}/10
          </span>
        ) : (
          <motion.button
            onClick={handleAnalyze}
            disabled={status === "loading"}
            whileHover={status !== "loading" ? { scale: 1.04 } : undefined}
            whileTap={status !== "loading" ? { scale: 0.96 } : undefined}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-muted-foreground hover:border-ring disabled:opacity-40"
          >
            <AiIcon size={11} />
            {status === "loading"
              ? "analisando..."
              : status === "error"
                ? "tentar de novo"
                : "analisar"}
          </motion.button>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/5 px-2 py-1 text-[10px] text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </li>
  );
}

export function PendingAnalysisModal({
  items,
  provider,
  onClose,
  onAnalyzed,
  onStatusUpdate,
}: {
  items: ActivityItem[] | null;
  provider: AiProvider;
  onClose: () => void;
  onAnalyzed: () => void;
  onStatusUpdate?: (taskId: string, status: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!items) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {items && (
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
            className="flex w-full max-w-lg max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border bg-popover p-6"
          >
            <div className="flex shrink-0 items-center justify-between gap-4">
              <p className="text-sm text-foreground">
                {items.length} pendente{items.length > 1 ? "s" : ""} de análise
              </p>
              <button
                onClick={onClose}
                className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                fechar
              </button>
            </div>

            <ul className="mt-4 flex flex-col gap-2 overflow-y-auto pr-1">
              {items.map((item) => (
                <PendingAnalysisRow
                  key={`${item.source}:${item.id}`}
                  item={item}
                  provider={provider}
                  onAnalyzed={onAnalyzed}
                  onStatusUpdate={onStatusUpdate}
                />
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
