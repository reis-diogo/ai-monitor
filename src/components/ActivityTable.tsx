"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import type {
  ActivityItem,
  ActivitySource,
  AiProvider,
  AnalyzedActivityRecord,
  AnalyzedProjectRecord,
  ClickUpStatusOption,
  Project,
  PullRequestInfo,
} from "@/lib/types";
import { CommitAnalysisModal } from "@/components/CommitAnalysisModal";
import { DifficultyAnalysisModal } from "@/components/DifficultyAnalysisModal";
import { ArchitectAnalysisModal } from "@/components/ArchitectAnalysisModal";
import { DevPromptModal } from "@/components/DevPromptModal";
import { ReviewAnalysisModal } from "@/components/ReviewAnalysisModal";
import { ProjectScopeAnalysisModal } from "@/components/ProjectScopeAnalysisModal";
import { AuthorFilter, type AuthorFilterOption } from "@/components/AuthorFilter";
import { ActivityRoleFilter } from "@/components/ActivityRoleFilter";
import { ProjectFilter } from "@/components/ProjectFilter";
import { ExternalLinkIcon, FilterOffIcon, RefreshIcon } from "@/components/icons";
import { AiIcon } from "@/components/AiIcon";
import { timeAgo } from "@/lib/time-ago";
import { STATUS_OPTIONS } from "@/lib/status-options";
import { ActivityGroup } from "@/components/ActivityGroup";
import { useActivityProgress } from "@/lib/use-activity-progress";

function FilterRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}

export function ActivityTable({
  items,
  allItems,
  provider,
  analyzedActivities,
  projects,
  projectAnalyses,
  pendingPrsByProject,
  clickupStatuses,
  onActivityAnalyzed,
  onProjectAnalyzed,
  onTaskStatusUpdate,
  onSyncStatuses,
  syncingStatuses,
  lastSyncedAt,
  projectNames,
  projectFilter,
  projectCounts,
  onProjectFilterChange,
  canEditPrompts,
  onOpenPrompts,
}: {
  items: ActivityItem[];
  allItems: ActivityItem[];
  provider: AiProvider;
  analyzedActivities: AnalyzedActivityRecord[];
  projects: Project[];
  projectAnalyses: AnalyzedProjectRecord[];
  pendingPrsByProject: Map<string, PullRequestInfo[]>;
  clickupStatuses: ClickUpStatusOption[];
  onActivityAnalyzed: () => void;
  onProjectAnalyzed: () => void;
  onTaskStatusUpdate: (taskId: string, status: string) => void;
  onSyncStatuses: () => Promise<void>;
  syncingStatuses: boolean;
  lastSyncedAt: Date | null;
  projectNames: string[];
  projectFilter: string[];
  projectCounts: Map<string, number>;
  onProjectFilterChange: (projects: string[]) => void;
  canEditPrompts: boolean;
  onOpenPrompts: () => void;
}) {
  const [selected, setSelected] = useState<AnalyzedActivityRecord | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<AnalyzedActivityRecord | null>(null);
  const [selectedArchitecture, setSelectedArchitecture] = useState<AnalyzedActivityRecord | null>(
    null
  );
  const [selectedDevPrompt, setSelectedDevPrompt] = useState<AnalyzedActivityRecord | null>(null);
  const [selectedReview, setSelectedReview] = useState<AnalyzedActivityRecord | null>(null);
  const [selectedProjectAnalysis, setSelectedProjectAnalysis] = useState<AnalyzedProjectRecord | null>(
    null
  );
  const [authorFilter, setAuthorFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<ActivitySource[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const analyzedMap = useMemo(() => {
    const map = new Map<string, AnalyzedActivityRecord>();
    for (const record of analyzedActivities) {
      map.set(`${record.provider}:${record.id}`, record);
    }
    return map;
  }, [analyzedActivities]);

  const allCommitsByLocation = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    for (const item of allItems) {
      if (item.source !== "commit") continue;
      const list = map.get(item.location) ?? [];
      list.push(item);
      map.set(item.location, list);
    }
    return map;
  }, [allItems]);

  const projectAnalysisMap = useMemo(() => {
    const map = new Map<string, AnalyzedProjectRecord>();
    for (const record of projectAnalyses) {
      if (record.provider !== provider) continue;
      map.set(record.projectId, record);
    }
    return map;
  }, [projectAnalyses, provider]);

  const roleCounts = useMemo(() => {
    const counts = new Map<ActivitySource, number>();
    for (const item of items) counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
    return counts;
  }, [items]);

  const roleFilteredItems = items.filter(
    (item) => !roleFilter.length || roleFilter.includes(item.source)
  );

  const authorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of roleFilteredItems) {
      counts.set(item.authorName, (counts.get(item.authorName) ?? 0) + 1);
    }
    return counts;
  }, [roleFilteredItems]);

  // Em quais projetos cada pessoa aparece, no mesmo escopo da contagem.
  const authorProjects = useMemo(() => {
    const byAuthor = new Map<string, Set<string>>();
    for (const item of roleFilteredItems) {
      const set = byAuthor.get(item.authorName) ?? new Set<string>();
      set.add(item.location);
      byAuthor.set(item.authorName, set);
    }
    return new Map(
      Array.from(byAuthor.entries()).map(([author, set]) => [
        author,
        Array.from(set).sort((a, b) => a.localeCompare(b)),
      ])
    );
  }, [roleFilteredItems]);

  const authors: AuthorFilterOption[] = Array.from(
    new Map(
      roleFilteredItems.map((item) => [
        item.authorName,
        { name: item.authorName, avatarUrl: item.authorAvatarUrl },
      ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const authorFilteredItems = roleFilteredItems.filter(
    (item) => !authorFilter.length || authorFilter.includes(item.authorName)
  );

  // Contagem no escopo atual: as tags respeitam os filtros de papel e autor, mas
  // nao o de status — senao selecionar um zeraria os demais.
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of authorFilteredItems) {
      if (item.status) {
        const key = item.status.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      if ((pendingPrsByProject.get(item.location)?.length ?? 0) > 0) {
        counts.set("pr_pendente", (counts.get("pr_pendente") ?? 0) + 1);
      }
    }
    return counts;
  }, [authorFilteredItems, pendingPrsByProject]);

  const filteredItems = authorFilteredItems.filter((item) => {
    if (statusFilter.length === 0) return true;
    const matchesStatus = !!item.status && statusFilter.includes(item.status.toLowerCase());
    const matchesPendingPr =
      statusFilter.includes("pr_pendente") && (pendingPrsByProject.get(item.location)?.length ?? 0) > 0;
    return matchesStatus || matchesPendingPr;
  });

  const progressMap = useActivityProgress();

  // O portal so pode montar no cliente. useSyncExternalStore devolve o snapshot
  // do servidor (false) na renderizacao inicial e o do cliente (true) depois,
  // sem setState em efeito.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const activeFilterCount =
    projectFilter.length + roleFilter.length + authorFilter.length + statusFilter.length;

  function clearAllFilters() {
    onProjectFilterChange([]);
    setRoleFilter([]);
    setAuthorFilter([]);
    setStatusFilter([]);
  }

  const groups = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    for (const item of filteredItems) {
      const list = map.get(item.location) ?? [];
      list.push(item);
      map.set(item.location, list);
    }
    return Array.from(map.entries())
      .map(([project, groupItems]) => {
        const matchingProject = projects.find((p) => p.name === project) ?? null;
        return {
          project,
          items: groupItems,
          matchingProject,
          projectAnalysis: matchingProject ? projectAnalysisMap.get(matchingProject.id) ?? null : null,
        };
      })
      .sort((a, b) => b.items.length - a.items.length);
  }, [filteredItems, projects, projectAnalysisMap]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5 font-mono dark:shadow-lg dark:shadow-black/40"
    >
      <p className="text-sm text-muted-foreground dark:text-[#ffd9e8]/70">
        Atividades ({filteredItems.length})
      </p>

      <div className="mt-4 flex flex-col gap-1.5">
        {projectNames.length > 1 && (
          <FilterRow>
            <ProjectFilter
              projects={projectNames}
              value={projectFilter}
              counts={projectCounts}
              onChange={onProjectFilterChange}
            />
          </FilterRow>
        )}

        <FilterRow>
          <ActivityRoleFilter
            value={roleFilter}
            counts={roleCounts}
            onChange={(next) => {
              setRoleFilter(next);
              setAuthorFilter([]);
            }}
          />
          {authors.length > 1 && (
            <AuthorFilter
              authors={authors}
              value={authorFilter}
              counts={authorCounts}
              projectsByAuthor={authorProjects}
              allProjects={projectNames}
              onChange={setAuthorFilter}
            />
          )}
        </FilterRow>

        <FilterRow>
          {STATUS_OPTIONS.map((option) => {
            const active = statusFilter.includes(option.value);
            const count = statusCounts.get(option.value) ?? 0;

            // Some quando nao ha nada nesse status. Se estiver selecionado, fica:
            // esconder um filtro ativo deixaria a lista vazia sem como desfazer.
            if (count === 0 && !active) return null;

            return (
              <motion.button
                key={option.value}
                onClick={() =>
                  setStatusFilter(
                    active
                      ? statusFilter.filter((v) => v !== option.value)
                      : [...statusFilter, option.value]
                  )
                }
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
                title={`${count} em "${option.label.toLowerCase()}"`}
                className="flex items-baseline gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors"
                style={{
                  borderColor: active ? `${option.color}80` : `${option.color}24`,
                  backgroundColor: active
                    ? `color-mix(in srgb, ${option.color} 14%, var(--card))`
                    : "var(--card)",
                  color: active ? option.color : `${option.color}a6`,
                }}
              >
                {option.label.toLowerCase()}
                <span className="tabular-nums" style={{ opacity: 0.6 }}>
                  {count}
                </span>
              </motion.button>
            );
          })}
        </FilterRow>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {groups.map((group) => (
          <ActivityGroup
            key={group.project}
            project={group.project}
            items={group.items}
            provider={provider}
            analyzedMap={analyzedMap}
            progressMap={progressMap}
            defaultOpen={false}
            onActivityAnalyzed={onActivityAnalyzed}
            onSelect={setSelected}
            onSelectDifficulty={setSelectedDifficulty}
            onSelectArchitecture={setSelectedArchitecture}
            onSelectDevPrompt={setSelectedDevPrompt}
            onSelectReview={setSelectedReview}
            matchingProject={group.matchingProject}
            allProjectCommits={allCommitsByLocation.get(group.project) ?? []}
            projectAnalysis={group.projectAnalysis}
            pendingPullRequests={pendingPrsByProject.get(group.project) ?? []}
            clickupStatuses={clickupStatuses}
            onProjectAnalyzed={onProjectAnalyzed}
            onTaskStatusUpdate={onTaskStatusUpdate}
            onSelectProjectAnalysis={setSelectedProjectAnalysis}
          />
        ))}
      </div>

      <CommitAnalysisModal record={selected} onClose={() => setSelected(null)} />
      <DifficultyAnalysisModal
        record={selectedDifficulty}
        onClose={() => setSelectedDifficulty(null)}
      />
      <ArchitectAnalysisModal
        record={selectedArchitecture}
        onClose={() => setSelectedArchitecture(null)}
      />
      <DevPromptModal
        record={selectedDevPrompt}
        provider={provider}
        onClose={() => setSelectedDevPrompt(null)}
      />
      <ReviewAnalysisModal record={selectedReview} onClose={() => setSelectedReview(null)} />

      {/* Portal e nao um fixed inline: este card e um motion.div com layout, e o
          transform dele faria um position:fixed filho ancorar no card, nao na tela. */}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed right-6 bottom-6 z-40 flex items-end justify-end gap-3">
            <div className="flex shrink-0 flex-col items-end gap-2">
            <AnimatePresence>
              {activeFilterCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  onClick={clearAllFilters}
                  title="Remover todos os filtros aplicados"
                  className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 py-2 font-mono text-[11px] text-primary shadow-lg shadow-black/30 backdrop-blur hover:bg-primary/25"
                >
                  <FilterOffIcon size={11} />
                  limpar {activeFilterCount} filtro{activeFilterCount > 1 ? "s" : ""}
                </motion.button>
              )}
            </AnimatePresence>

            {canEditPrompts && (
              <motion.button
                onClick={onOpenPrompts}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                title="Editar os prompts das análises"
                  className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground shadow-lg shadow-black/40 backdrop-blur hover:border-primary/40 hover:text-foreground"
                >
                <AiIcon size={12} />
                prompts
              </motion.button>
            )}

            <motion.a
              href="https://app.clickup.com/9007062280/v/l/6-901328264773-1"
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              title="Abrir a lista no ClickUp"
                className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground shadow-lg shadow-black/40 backdrop-blur hover:border-primary/40 hover:text-foreground"
              >
              <ExternalLinkIcon size={11} />
              click-up
            </motion.a>

            <motion.button
              onClick={onSyncStatuses}
              disabled={syncingStatuses}
              whileHover={!syncingStatuses ? { scale: 1.04 } : undefined}
              whileTap={!syncingStatuses ? { scale: 0.96 } : undefined}
              title="Buscar status e pareceres atualizados no ClickUp"
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground shadow-lg shadow-black/40 backdrop-blur hover:border-primary/40 hover:text-foreground disabled:opacity-60"
            >
              <motion.span
                className="flex items-center justify-center"
                animate={syncingStatuses ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  syncingStatuses
                    ? { repeat: Infinity, duration: 0.8, ease: "linear" }
                    : { duration: 0.2 }
                }
              >
                <RefreshIcon size={12} />
              </motion.span>
              {syncingStatuses ? (
                "atualizando..."
              ) : (
                <>
                  atualizar
                  {lastSyncedAt && (
                    <span className="text-muted-foreground/45">
                      {timeAgo(lastSyncedAt.toISOString())}
                    </span>
                  )}
                </>
              )}
            </motion.button>
            </div>
          </div>,
          document.body
        )}
      <ProjectScopeAnalysisModal
        record={selectedProjectAnalysis}
        onClose={() => setSelectedProjectAnalysis(null)}
      />
    </motion.div>
  );
}
