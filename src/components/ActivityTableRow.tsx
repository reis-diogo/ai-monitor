"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ActivityItem, AiProvider, AnalyzedActivityRecord, ClickUpStatusOption } from "@/lib/types";
import { scoreColor } from "@/lib/score-color";
import { truncate } from "@/lib/truncate";
import { ScoreIcon } from "@/components/ScoreIcon";
import { AiIcon } from "@/components/AiIcon";
import { RefreshIcon } from "@/components/icons";
import { StatusMenu } from "@/components/StatusMenu";
import { ActivityItemDetailModal } from "@/components/ActivityItemDetailModal";

const PROVIDER_LABEL: Record<AiProvider, string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
};

type Status = "idle" | "loading" | "error";

export function ActivityTableRow({
  item,
  provider,
  cachedAnalysis,
  showLocation = true,
  clickupStatuses = [],
  onAnalyzed,
  onSelect,
  onStatusUpdate,
}: {
  item: ActivityItem;
  provider: AiProvider;
  cachedAnalysis: AnalyzedActivityRecord | null;
  showLocation?: boolean;
  clickupStatuses?: ClickUpStatusOption[];
  onAnalyzed: () => void;
  onSelect: (record: AnalyzedActivityRecord) => void;
  onStatusUpdate?: (taskId: string, status: string) => void;
}) {
  const columnCount = showLocation ? 8 : 7;
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [localAnalysis, setLocalAnalysis] = useState<AnalyzedActivityRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const analysis = localAnalysis ?? cachedAnalysis;

  async function handleAnalyze(force = false) {
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
          force,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao analisar atividade.");
      setLocalAnalysis(data.analysis);
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
    <>
      <motion.tr
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-t border-border/60"
      >
        <td className="py-2 pr-3">
          <div className="flex items-center gap-2">
            {item.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.authorAvatarUrl}
                alt={item.authorName}
                className="h-5 w-5 rounded-full"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-medium">
                {item.authorName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-foreground/80">{item.authorName}</span>
          </div>
        </td>
        <td className="py-2 pr-3 text-foreground">
          {item.source === "commit" ? (
            <span className="font-mono text-muted-foreground">{item.id.slice(0, 7)}</span>
          ) : (
            <button
              onClick={() => setShowDetail(true)}
              title={item.title}
              className="hover:underline"
            >
              {item.customId
                ? `${item.customId} - ${truncate(item.title, 24).toLowerCase()}`
                : truncate(item.title, 24).toLowerCase()}
            </button>
          )}
        </td>
        {showLocation && <td className="py-2 pr-3 text-muted-foreground">{item.location}</td>}
        <td className="py-2 pr-3">
          {item.source === "clickup" && item.status && item.statusColor ? (
            <StatusMenu
              taskId={item.id}
              status={item.status}
              statusColor={item.statusColor}
              statuses={clickupStatuses}
              onOptimisticChange={(next) => onStatusUpdate?.(item.id, next)}
            />
          ) : (
            <span className="text-muted-foreground/50">—</span>
          )}
        </td>
        <td className="py-2 pr-3 font-mono">
          {item.additions !== null && item.deletions !== null ? (
            <>
              <span className="text-green-400">+{item.additions}</span>{" "}
              <span className="text-red-400">-{item.deletions}</span>
            </>
          ) : (
            <span className="text-muted-foreground/50">—</span>
          )}
        </td>
        <td className="py-2 pr-3">
          {analysis ? (
            <div className="flex items-center gap-1.5">
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono font-medium"
                style={{
                  color: scoreColor(analysis.score).color,
                  backgroundColor: scoreColor(analysis.score).bg,
                }}
              >
                <ScoreIcon score={analysis.score} size={11} />
                {analysis.score}/10
              </span>
              {analysis.difficulty !== null && analysis.difficulty !== undefined && (
                <span
                  title={analysis.difficultyReasoning ?? undefined}
                  className="flex items-center gap-1 rounded-full bg-[#8B5CF6]/10 px-2 py-0.5 font-mono font-medium text-[#8B5CF6]"
                >
                  dif {analysis.difficulty}/10
                </span>
              )}
              <motion.button
                onClick={() => handleAnalyze(true)}
                disabled={status === "loading"}
                whileHover={status !== "loading" ? { scale: 1.1 } : undefined}
                whileTap={status !== "loading" ? { scale: 0.9 } : undefined}
                title="Reavaliar"
                className="flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <motion.span
                  className="flex items-center justify-center"
                  animate={status === "loading" ? { rotate: 360 } : { rotate: 0 }}
                  transition={
                    status === "loading"
                      ? { repeat: Infinity, duration: 0.8, ease: "linear" }
                      : { duration: 0.2 }
                  }
                >
                  <RefreshIcon size={11} />
                </motion.span>
              </motion.button>
            </div>
          ) : (
            <motion.button
              onClick={() => handleAnalyze()}
              disabled={status === "loading"}
              whileHover={status !== "loading" ? { scale: 1.04 } : undefined}
              whileTap={status !== "loading" ? { scale: 0.96 } : undefined}
              className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-muted-foreground hover:border-primary/40 disabled:opacity-40"
            >
              <AiIcon size={11} />
              {status === "loading"
                ? "analisando..."
                : status === "error"
                  ? "tentar de novo"
                  : "analisar"}
            </motion.button>
          )}
        </td>
        <td
          onClick={() => analysis && onSelect(analysis)}
          className={`py-2 pr-3 text-muted-foreground ${analysis ? "cursor-pointer hover:underline" : ""}`}
        >
          {analysis ? truncate(analysis.intent, 10) : "—"}
        </td>
        <td className="py-2 text-muted-foreground">
          {analysis ? PROVIDER_LABEL[analysis.provider] : "—"}
        </td>
      </motion.tr>

      <AnimatePresence>
        {error && (
          <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <td colSpan={columnCount} className="px-0 pb-2">
              <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-[11px] text-red-700 dark:text-red-300">
                {error}
              </p>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>

      <ActivityItemDetailModal item={showDetail ? item : null} onClose={() => setShowDetail(false)} />
    </>
  );
}
