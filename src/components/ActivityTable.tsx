"use client";

import { useMemo, useState } from "react";
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
import { ProjectScopeAnalysisModal } from "@/components/ProjectScopeAnalysisModal";
import { AuthorFilter, type AuthorFilterOption } from "@/components/AuthorFilter";
import { ActivityRoleFilter } from "@/components/ActivityRoleFilter";
import { ProjectFilter } from "@/components/ProjectFilter";
import { CloseIcon, RefreshIcon } from "@/components/icons";
import { timeAgo } from "@/lib/time-ago";
import { STATUS_OPTIONS } from "@/lib/status-options";
import { ActivityGroup } from "@/components/ActivityGroup";

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
}) {
  const [selected, setSelected] = useState<AnalyzedActivityRecord | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<AnalyzedActivityRecord | null>(null);
  const [selectedArchitecture, setSelectedArchitecture] = useState<AnalyzedActivityRecord | null>(
    null
  );
  const [selectedDevPrompt, setSelectedDevPrompt] = useState<AnalyzedActivityRecord | null>(null);
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
      <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground dark:text-[#ffd9e8]/70">
            Atividades ({filteredItems.length})
          </p>
          <motion.button
            onClick={onSyncStatuses}
            disabled={syncingStatuses}
            whileHover={!syncingStatuses ? { scale: 1.04 } : undefined}
            whileTap={!syncingStatuses ? { scale: 0.96 } : undefined}
            title="Buscar status e pareceres atualizados no ClickUp"
            className="flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40"
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
              <RefreshIcon size={11} />
            </motion.span>
            {syncingStatuses ? "atualizando..." : "status"}
          </motion.button>
          {lastSyncedAt && !syncingStatuses && (
            <span className="font-mono text-[11px] text-muted-foreground/50">
              {timeAgo(lastSyncedAt.toISOString())}
            </span>
          )}

          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.button
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                onClick={clearAllFilters}
                title="Remover todos os filtros aplicados"
                className="flex shrink-0 items-center gap-1 overflow-hidden whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-primary hover:bg-primary/20"
              >
                <CloseIcon size={9} />
                limpar {activeFilterCount} filtro{activeFilterCount > 1 ? "s" : ""}
              </motion.button>
            )}
          </AnimatePresence>
      </div>

      {/* Tres faixas fixas — projetos, pessoas, status. Cada uma em sua propria
          linha para que mudar a contagem de uma nao reflua as outras. */}
      {projectNames.length > 1 && (
        <div className="mt-4">
          <ProjectFilter
            projects={projectNames}
            value={projectFilter}
            counts={projectCounts}
            onChange={onProjectFilterChange}
          />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
            onChange={setAuthorFilter}
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {STATUS_OPTIONS.map((option) => {
          const active = statusFilter.includes(option.value);
          const count = statusCounts.get(option.value) ?? 0;
          const empty = count === 0;

          return (
            <motion.button
              key={option.value}
              disabled={empty}
              onClick={() =>
                setStatusFilter(
                  active
                    ? statusFilter.filter((v) => v !== option.value)
                    : [...statusFilter, option.value]
                )
              }
              whileHover={!empty ? { y: -1 } : undefined}
              whileTap={!empty ? { scale: 0.98 } : undefined}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              title={
                empty
                  ? `Nenhuma atividade em "${option.label.toLowerCase()}"`
                  : `${count} em "${option.label.toLowerCase()}"`
              }
              className="flex items-baseline gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors disabled:cursor-default"
              style={{
                borderColor: active ? `${option.color}80` : `${option.color}24`,
                backgroundColor: active ? `${option.color}1f` : "transparent",
                color: option.color,
                opacity: empty ? 0.22 : active ? 1 : 0.7,
              }}
            >
              {option.label.toLowerCase()}
              <span className="tabular-nums" style={{ opacity: active ? 0.75 : 0.55 }}>
                {count}
              </span>
            </motion.button>
          );
        })}

      </div>

      <div className="mt-4 flex flex-col gap-2">
        {groups.map((group) => (
          <ActivityGroup
            key={group.project}
            project={group.project}
            items={group.items}
            provider={provider}
            analyzedMap={analyzedMap}
            defaultOpen={false}
            onActivityAnalyzed={onActivityAnalyzed}
            onSelect={setSelected}
            onSelectDifficulty={setSelectedDifficulty}
            onSelectArchitecture={setSelectedArchitecture}
            onSelectDevPrompt={setSelectedDevPrompt}
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
      <DevPromptModal record={selectedDevPrompt} onClose={() => setSelectedDevPrompt(null)} />
      <ProjectScopeAnalysisModal
        record={selectedProjectAnalysis}
        onClose={() => setSelectedProjectAnalysis(null)}
      />
    </motion.div>
  );
}
