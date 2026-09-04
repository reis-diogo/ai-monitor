"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
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
import { ProjectScopeAnalysisModal } from "@/components/ProjectScopeAnalysisModal";
import { AuthorFilter, type AuthorFilterOption } from "@/components/AuthorFilter";
import { ActivityRoleFilter } from "@/components/ActivityRoleFilter";
import { StatusValueFilter } from "@/components/StatusValueFilter";
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
}) {
  const [selected, setSelected] = useState<AnalyzedActivityRecord | null>(null);
  const [selectedProjectAnalysis, setSelectedProjectAnalysis] = useState<AnalyzedProjectRecord | null>(
    null
  );
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<ActivitySource | null>(null);
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

  const roleFilteredItems = items.filter((item) => !roleFilter || item.source === roleFilter);

  const authors: AuthorFilterOption[] = Array.from(
    new Map(
      roleFilteredItems.map((item) => [
        item.authorName,
        { name: item.authorName, avatarUrl: item.authorAvatarUrl },
      ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const authorFilteredItems = roleFilteredItems.filter(
    (item) => !authorFilter || item.authorName === authorFilter
  );

  const filteredItems = authorFilteredItems.filter(
    (item) => statusFilter.length === 0 || (item.status && statusFilter.includes(item.status.toLowerCase()))
  );

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground dark:text-[#ffd9e8]/70">
          Atividades ({filteredItems.length})
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ActivityRoleFilter
            value={roleFilter}
            onChange={(next) => {
              setRoleFilter(next);
              setAuthorFilter(null);
            }}
          />
          {authors.length > 1 && (
            <AuthorFilter authors={authors} value={authorFilter} onChange={setAuthorFilter} />
          )}
          <StatusValueFilter value={statusFilter} onChange={setStatusFilter} />
        </div>
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
      <ProjectScopeAnalysisModal
        record={selectedProjectAnalysis}
        onClose={() => setSelectedProjectAnalysis(null)}
      />
    </motion.div>
  );
}
