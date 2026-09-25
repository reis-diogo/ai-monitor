"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type {
  ActivityItem,
  ActivityProgress,
  AiProvider,
  AnalyzedActivityRecord,
  AnalyzedProjectRecord,
  ClickUpStatusOption,
  StatusDwell,
  Project,
  PullRequestInfo,
} from "@/lib/types";
import { ActivityTableRow } from "@/components/ActivityTableRow";
import { scoreColor } from "@/lib/score-color";
import { ScoreIcon } from "@/components/ScoreIcon";
import { AiIcon } from "@/components/AiIcon";
import { ChevronIcon, PullRequestIcon, RefreshIcon } from "@/components/icons";
import { LocalArchitectModal } from "@/components/LocalArchitectModal";
import { ActivityProgressBadge } from "@/components/ActivityProgressBadge";
import { PendingTasksModal } from "@/components/PendingTasksModal";
import { PendingPullRequestsModal } from "@/components/PendingPullRequestsModal";
import { buildStatusOptions } from "@/lib/status-options";

type ScopeStatus = "idle" | "loading" | "error";

export function ActivityGroup({
  project,
  items,
  provider,
  analyzedMap,
  progressMap,
  dwellMap,
  now,
  defaultOpen = true,
  onActivityAnalyzed,
  onSelect,
  onSelectDifficulty,
  onSelectArchitecture,
  onSelectDevPrompt,
  onSelectReview,
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
  progressMap: Map<string, ActivityProgress>;
  dwellMap: Map<string, StatusDwell>;
  now: number;
  defaultOpen?: boolean;
  onActivityAnalyzed: () => void;
  onSelect: (record: AnalyzedActivityRecord) => void;
  onSelectDifficulty: (record: AnalyzedActivityRecord) => void;
  onSelectArchitecture: (record: AnalyzedActivityRecord) => void;
  onSelectDevPrompt: (record: AnalyzedActivityRecord) => void;
  onSelectReview: (record: AnalyzedActivityRecord) => void;
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
  const [openStatus, setOpenStatus] = useState<string | null>(null);
  const [showPendingPrs, setShowPendingPrs] = useState(false);
  const pendingPrCount = pendingPullRequests.length;
  const [scopeStatus, setScopeStatus] = useState<ScopeStatus>("idle");
  const [scopeError, setScopeError] = useState<string | null>(null);

  const [localArchitectCards, setLocalArchitectCards] = useState<ActivityItem[] | null>(null);
  const [localReviewCards, setLocalReviewCards] = useState<ActivityItem[] | null>(null);
  const projectAuthors = useMemo(
    () => Array.from(new Set(items.map((item) => item.authorName))).sort(),
    [items]
  );

  const commitCount = items.filter((item) => item.source === "commit").length;
  // Um chip por status presente no grupo, na ordem da lista do ClickUp: status
  // novo na lista aparece aqui sem ninguem precisar mexer na tela.
  const statusGroups = useMemo(() => {
    const byStatus = new Map<string, { items: ActivityItem[]; color: string | null }>();
    for (const item of items) {
      if (item.source !== "clickup" || !item.status) continue;
      const value = item.status.toLowerCase();
      const group = byStatus.get(value) ?? { items: [], color: item.statusColor };
      group.items.push(item);
      byStatus.set(value, group);
    }

    return buildStatusOptions(
      clickupStatuses ?? [],
      Array.from(byStatus, ([value, group]) => ({ value, color: group.color }))
    ).flatMap((option) => {
      const group = byStatus.get(option.value);
      return group ? [{ ...option, items: group.items }] : [];
    });
  }, [items, clickupStatuses]);

  const openStatusItems =
    statusGroups.find((group) => group.value === openStatus)?.items ?? null;

  // Com o grupo fechado a linha do card nao existe, e e justamente quando alguem
  // esta rodando uma etapa que a pessoa precisa saber sem ter que abrir tudo.
  const runningItems = items.flatMap((item) => {
    const progress = progressMap.get(item.id);
    return progress ? [{ item, progress }] : [];
  });

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
    <motion.div
      layout
      className="rounded-lg border border-border/60 bg-card"
    >
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
        className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">
            {project} <span className="font-normal text-muted-foreground">({items.length})</span>
          </span>

          {commitCount > 0 && (
            <span className="text-muted-foreground">
              {commitCount} commit{commitCount > 1 ? "s" : ""}
            </span>
          )}

          {runningItems.map(({ item, progress }) => (
            <ActivityProgressBadge
              key={item.id}
              progress={progress}
              label={item.customId ?? item.id}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
            />
          ))}

          {statusGroups.map((group) => (
            <motion.button
              key={group.value}
              onClick={(e) => {
                e.stopPropagation();
                setOpenStatus(group.value);
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className="flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium"
              style={{
                borderColor: `${group.color}4d`,
                backgroundColor: `${group.color}1a`,
                color: group.color,
              }}
              title={`${group.items.length} tarefa${group.items.length > 1 ? "s" : ""} com status "${group.label}"`}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              {group.items.length} {group.label}
            </motion.button>
          ))}

          {pendingPrCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPendingPrs(true);
              }}
              className="flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2 py-0.5 font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-400/20"
              title={`${pendingPrCount} pull request${pendingPrCount > 1 ? "s" : ""} aberto${pendingPrCount > 1 ? "s" : ""} aguardando merge`}
            >
              <PullRequestIcon size={11} />
              {pendingPrCount} PR{pendingPrCount > 1 ? "s" : ""} pendente{pendingPrCount > 1 ? "s" : ""}
            </button>
          )}

        </div>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground"
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
                className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-2"
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
                      className="flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
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
                    className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/40 disabled:opacity-40"
                  >
                    <AiIcon size={11} />
                    {scopeStatus === "loading"
                      ? "analisando escopo..."
                      : scopeStatus === "error"
                        ? "tentar de novo"
                        : "analisar escopo do projeto"}
                  </motion.button>
                ) : (
                  <span className="text-[11px] text-muted-foreground/50">
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
                  <tr className="text-muted-foreground">
                    <th className="pb-2 pr-3 font-normal">autor</th>
                    <th className="pb-2 pr-3 font-normal">item</th>
                    <th className="pb-2 pr-3 font-normal">status</th>
                    <th className="pb-2 pr-3 font-normal">+/-</th>
                    <th className="pb-2 font-normal">nota</th>
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
                        progress={progressMap.get(item.id) ?? null}
                        dwell={dwellMap.get(item.id) ?? null}
                        now={now}
                        showLocation={false}
                        clickupStatuses={clickupStatuses}
                        onAnalyzed={onActivityAnalyzed}
                        onSelect={onSelect}
                        onSelectDifficulty={onSelectDifficulty}
                        onSelectArchitecture={onSelectArchitecture}
                        onArchitectLocal={(card) => setLocalArchitectCards([card])}
                        onSelectDevPrompt={onSelectDevPrompt}
                        onSelectReview={onSelectReview}
                        onReviewLocal={(card) => setLocalReviewCards([card])}
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
        items={openStatusItems}
        onClose={() => setOpenStatus(null)}
        label={openStatus ?? undefined}
      />

      <LocalArchitectModal
        project={localArchitectCards ? project : null}
        cards={localArchitectCards ?? []}
        provider={provider}
        projectAuthors={projectAuthors}
        onClose={() => setLocalArchitectCards(null)}
      />

      <LocalArchitectModal
        project={localReviewCards ? project : null}
        cards={localReviewCards ?? []}
        provider={provider}
        kind="review"
        projectAuthors={projectAuthors}
        onClose={() => setLocalReviewCards(null)}
      />

      <PendingPullRequestsModal
        pullRequests={showPendingPrs ? pendingPullRequests : null}
        onClose={() => setShowPendingPrs(false)}
      />

    </motion.div>
  );
}
