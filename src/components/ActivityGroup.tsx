"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type {
  ActivityItem,
  AiProvider,
  AnalyzedActivityRecord,
  AnalyzedProjectRecord,
  ClickUpStatusOption,
  Project,
  PullRequestInfo,
} from "@/lib/types";
import { ActivityTableRow } from "@/components/ActivityTableRow";
import { scoreColor } from "@/lib/score-color";
import { ScoreIcon } from "@/components/ScoreIcon";
import { AiIcon } from "@/components/AiIcon";
import { ChevronIcon, PullRequestIcon, RefreshIcon } from "@/components/icons";
import { timeAgo } from "@/lib/time-ago";
import { PendingTasksModal } from "@/components/PendingTasksModal";
import { PendingPullRequestsModal } from "@/components/PendingPullRequestsModal";
import { PendingAnalysisModal } from "@/components/PendingAnalysisModal";

type ScopeStatus = "idle" | "loading" | "error";

export function ActivityGroup({
  project,
  items,
  provider,
  analyzedMap,
  defaultOpen = true,
  onActivityAnalyzed,
  onSelect,
  matchingProject,
  allProjectCommits,
  projectAnalysis,
  pendingPullRequests = [],
  clickupStatuses,
  onProjectAnalyzed,
  onSelectProjectAnalysis,
  onTaskStatusUpdate,
}: {
  project: string;
  items: ActivityItem[];
  provider: AiProvider;
  analyzedMap: Map<string, AnalyzedActivityRecord>;
  defaultOpen?: boolean;
  onActivityAnalyzed: () => void;
  onSelect: (record: AnalyzedActivityRecord) => void;
  matchingProject?: Project | null;
  allProjectCommits?: ActivityItem[];
  projectAnalysis?: AnalyzedProjectRecord | null;
  pendingPullRequests?: PullRequestInfo[];
  clickupStatuses?: ClickUpStatusOption[];
  onProjectAnalyzed?: () => void;
  onSelectProjectAnalysis?: (record: AnalyzedProjectRecord) => void;
  onTaskStatusUpdate?: (taskId: string, status: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showPendingTasks, setShowPendingTasks] = useState(false);
  const [showRefiningTasks, setShowRefiningTasks] = useState(false);
  const [showPendingPrs, setShowPendingPrs] = useState(false);
  const [showPendingAnalysis, setShowPendingAnalysis] = useState(false);
  const pendingPrCount = pendingPullRequests.length;
  const [scopeStatus, setScopeStatus] = useState<ScopeStatus>("idle");
  const [scopeError, setScopeError] = useState<string | null>(null);

  const analyzedScores = items
    .map((item) => analyzedMap.get(`${provider}:${item.id}`)?.score)
    .filter((score): score is number => score !== undefined);

  const averageScore =
    analyzedScores.length > 0
      ? analyzedScores.reduce((sum, score) => sum + score, 0) / analyzedScores.length
      : null;

  const lastActivityDate = items.reduce<string | null>((latest, item) => {
    if (!latest) return item.date;
    return new Date(item.date) > new Date(latest) ? item.date : latest;
  }, null);

  const commitCount = items.filter((item) => item.source === "commit").length;
  const taskCount = items.length - commitCount;
  const pendingAnalysisItems = items.filter(
    (item) => !analyzedMap.has(`${provider}:${item.id}`)
  );
  const pendingCount = pendingAnalysisItems.length;
  const pendingTaskItems = items.filter(
    (item) => item.source === "clickup" && item.status?.toLowerCase() === "para desenvolver"
  );
  const pendingTaskCount = pendingTaskItems.length;
  const refiningTaskItems = items.filter(
    (item) => item.source === "clickup" && item.status?.toLowerCase() === "refinar po"
  );
  const refiningTaskCount = refiningTaskItems.length;

  async function handleAnalyzeScope(force = false) {
    if (!matchingProject) return;
    setScopeStatus("loading");
    setScopeError(null);
    try {
      const commits = (allProjectCommits ?? [])
        .filter((item) => item.source === "commit")
        .map((item) => ({ message: item.title, date: item.date }));

      const res = await fetch(`/api/projects/${matchingProject.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, commits, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao analisar o escopo do projeto.");
      setScopeStatus("idle");
      onProjectAnalyzed?.();
    } catch (err) {
      setScopeStatus("error");
      setScopeError(err instanceof Error ? err.message : "Erro ao analisar o escopo do projeto.");
    }
  }

  return (
    <motion.div layout className="rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-black/60 dark:text-white/60"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-black/80 dark:text-white/80">
            {project} <span className="font-normal text-black/30 dark:text-white/30">({items.length})</span>
          </span>

          <span className="text-black/30 dark:text-white/30">
            {commitCount > 0 && `${commitCount} commit${commitCount > 1 ? "s" : ""}`}
            {commitCount > 0 && taskCount > 0 && " · "}
            {taskCount > 0 && `${taskCount} tarefa${taskCount > 1 ? "s" : ""}`}
          </span>

          {pendingTaskCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPendingTasks(true);
              }}
              className="flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-400/20"
              title={`${pendingTaskCount} tarefa${pendingTaskCount > 1 ? "s" : ""} ainda com status "para desenvolver"`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              {pendingTaskCount} para desenvolver
            </button>
          )}

          {refiningTaskCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRefiningTasks(true);
              }}
              className="flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-400/20"
              title={`${refiningTaskCount} tarefa${refiningTaskCount > 1 ? "s" : ""} com status "refinar po"`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              {refiningTaskCount} refinar po
            </button>
          )}

          {pendingPrCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPendingPrs(true);
              }}
              className="flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-400/20"
              title={`${pendingPrCount} pull request${pendingPrCount > 1 ? "s" : ""} aberto${pendingPrCount > 1 ? "s" : ""} aguardando merge`}
            >
              <PullRequestIcon size={11} />
              {pendingPrCount} PR{pendingPrCount > 1 ? "s" : ""} pendente{pendingPrCount > 1 ? "s" : ""}
            </button>
          )}

          {pendingCount > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPendingAnalysis(true);
              }}
              className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-400/20"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""} de análise
            </button>
          ) : (
            <span className="text-black/30 dark:text-white/30">
              {analyzedScores.length}/{items.length} analisados
            </span>
          )}

          {averageScore !== null && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono font-medium"
              style={{ color: scoreColor(averageScore).color, backgroundColor: scoreColor(averageScore).bg }}
            >
              <ScoreIcon score={averageScore} size={11} />
              {averageScore.toFixed(1)}/10
            </span>
          )}

          {lastActivityDate && (
            <span className="text-black/30 dark:text-white/30">última atividade {timeAgo(lastActivityDate)}</span>
          )}
        </div>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-4 w-4 shrink-0 items-center justify-center text-black/30 dark:text-white/30"
        >
          <ChevronIcon />
        </motion.span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {matchingProject && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-wrap items-center gap-2 border-t border-black/5 dark:border-white/5 px-3 py-2"
              >
                {projectAnalysis ? (
                  <>
                    <button
                      onClick={() => onSelectProjectAnalysis?.(projectAnalysis)}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium hover:opacity-80"
                      style={{
                        color: scoreColor(projectAnalysis.score).color,
                        backgroundColor: scoreColor(projectAnalysis.score).bg,
                      }}
                    >
                      <ScoreIcon score={projectAnalysis.score} size={11} />
                      escopo {projectAnalysis.score}/10
                    </button>
                    <motion.button
                      onClick={() => handleAnalyzeScope(true)}
                      disabled={scopeStatus === "loading"}
                      whileHover={scopeStatus !== "loading" ? { scale: 1.1 } : undefined}
                      whileTap={scopeStatus !== "loading" ? { scale: 0.9 } : undefined}
                      title="Reavaliar escopo"
                      className="flex h-4 w-4 items-center justify-center text-black/30 dark:text-white/30 hover:text-black/70 dark:hover:text-white/70 disabled:opacity-40"
                    >
                      <motion.span
                        className="flex items-center justify-center"
                        animate={scopeStatus === "loading" ? { rotate: 360 } : { rotate: 0 }}
                        transition={
                          scopeStatus === "loading"
                            ? { repeat: Infinity, duration: 0.8, ease: "linear" }
                            : { duration: 0.2 }
                        }
                      >
                        <RefreshIcon size={11} />
                      </motion.span>
                    </motion.button>
                  </>
                ) : matchingProject.scope ? (
                  <motion.button
                    onClick={() => handleAnalyzeScope()}
                    disabled={scopeStatus === "loading"}
                    whileHover={scopeStatus !== "loading" ? { scale: 1.04 } : undefined}
                    whileTap={scopeStatus !== "loading" ? { scale: 0.96 } : undefined}
                    className="flex items-center gap-1.5 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-[11px] text-black/60 dark:text-white/60 hover:border-black/30 dark:hover:border-white/30 disabled:opacity-40"
                  >
                    <AiIcon size={11} />
                    {scopeStatus === "loading"
                      ? "analisando escopo..."
                      : scopeStatus === "error"
                        ? "tentar de novo"
                        : "analisar escopo do projeto"}
                  </motion.button>
                ) : (
                  <span className="text-[11px] text-black/20 dark:text-white/20">
                    defina o escopo do projeto em &quot;Projetos&quot; para habilitar a análise
                  </span>
                )}

                <AnimatePresence>
                  {scopeError && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full rounded-md border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[11px] text-red-700 dark:text-red-300"
                    >
                      {scopeError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="overflow-x-auto px-3 pb-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-black/30 dark:text-white/30">
                    <th className="pb-2 pr-3 font-normal">autor</th>
                    <th className="pb-2 pr-3 font-normal">item</th>
                    <th className="pb-2 pr-3 font-normal">status</th>
                    <th className="pb-2 pr-3 font-normal">+/-</th>
                    <th className="pb-2 pr-3 font-normal">nota</th>
                    <th className="pb-2 pr-3 font-normal">detalhamento</th>
                    <th className="pb-2 font-normal">IA</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <ActivityTableRow
                        key={`${item.source}:${item.id}`}
                        item={item}
                        provider={provider}
                        cachedAnalysis={analyzedMap.get(`${provider}:${item.id}`) ?? null}
                        showLocation={false}
                        clickupStatuses={clickupStatuses}
                        onAnalyzed={onActivityAnalyzed}
                        onSelect={onSelect}
                        onStatusUpdate={onTaskStatusUpdate}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PendingTasksModal
        items={showPendingTasks ? pendingTaskItems : null}
        onClose={() => setShowPendingTasks(false)}
      />

      <PendingTasksModal
        items={showRefiningTasks ? refiningTaskItems : null}
        onClose={() => setShowRefiningTasks(false)}
        label="refinar po"
      />

      <PendingPullRequestsModal
        pullRequests={showPendingPrs ? pendingPullRequests : null}
        onClose={() => setShowPendingPrs(false)}
      />

      <PendingAnalysisModal
        items={showPendingAnalysis ? pendingAnalysisItems : null}
        provider={provider}
        onClose={() => setShowPendingAnalysis(false)}
        onAnalyzed={() => onActivityAnalyzed()}
        onStatusUpdate={onTaskStatusUpdate}
      />
    </motion.div>
  );
}
