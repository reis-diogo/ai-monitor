"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserButton } from "@clerk/nextjs";
import type {
  ActivityItem,
  AiProvider,
  AnalyzedActivityRecord,
  AnalyzedProjectRecord,
  AuthorActivity,
  ClickUpStatusOption,
  ClickUpTaskActivity,
  Professional,
  Project,
  PullRequestInfo,
  RankingEntry,
} from "@/lib/types";
import { RepoManager } from "@/components/RepoManager";
import { ProviderToggle } from "@/components/ProviderToggle";
import { ActivityTable } from "@/components/ActivityTable";
import { Ranking } from "@/components/Ranking";
import { ProjectRanking } from "@/components/ProjectRanking";
import { ProfessionalsManager } from "@/components/ProfessionalsManager";
import { ProjectsManager } from "@/components/ProjectsManager";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ProjectFilter } from "@/components/ProjectFilter";
import { normalizeLocation } from "@/lib/normalize-location";
import { resolveAuthorName } from "@/lib/normalize-author";
import { getPresetRange, isWithinRange, type DatePreset } from "@/lib/date-range";
import { timeAgo } from "@/lib/time-ago";
import { ExternalLinkIcon, RefreshIcon } from "@/components/icons";

const REFRESH_COOLDOWN_MS = 10_000;
const RELATIVE_TIME_TICK_MS = 30_000;
const PROVIDER_STORAGE_KEY = "getnow:ai-provider";

type Status = "loading" | "ready" | "error";

export function Dashboard() {
  const [authors, setAuthors] = useState<AuthorActivity[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [analyzedActivities, setAnalyzedActivities] = useState<AnalyzedActivityRecord[]>([]);
  const [projectAnalyses, setProjectAnalyses] = useState<AnalyzedProjectRecord[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clickupTasks, setClickupTasks] = useState<ClickUpTaskActivity[]>([]);
  const [clickupStatuses, setClickupStatuses] = useState<ClickUpStatusOption[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [repoPullRequests, setRepoPullRequests] = useState<
    { owner: string; name: string; pullRequests: PullRequestInfo[] }[]
  >([]);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects ?? []);
  }, []);

  const fetchAnalyzed = useCallback(async () => {
    const res = await fetch("/api/analysis");
    const data = await res.json();
    setAnalyzedActivities(data.activities ?? []);
  }, []);

  const fetchProjectAnalyses = useCallback(async () => {
    const res = await fetch("/api/project-analysis");
    const data = await res.json();
    setProjectAnalyses(data.analyses ?? []);
  }, []);

  const fetchPendingPullRequests = useCallback(async () => {
    const res = await fetch("/api/repos/pending-prs");
    const data = await res.json();
    setRepoPullRequests(data.repoPullRequests ?? []);
  }, []);

  const fetchProfessionals = useCallback(async () => {
    const res = await fetch("/api/professionals");
    const data = await res.json();
    setProfessionals(data.professionals ?? []);
  }, []);

  const fetchClickupTasks = useCallback(async () => {
    const res = await fetch("/api/clickup/tasks");
    const data = await res.json();
    setClickupTasks(data.tasks ?? []);
  }, []);

  const fetchClickupStatuses = useCallback(async () => {
    const res = await fetch("/api/clickup/statuses");
    const data = await res.json();
    setClickupStatuses(data.statuses ?? []);
  }, []);

  const updateClickupTaskStatus = useCallback(
    (taskId: string, status: string) => {
      setClickupTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                statusColor:
                  clickupStatuses.find((s) => s.status === status)?.color ?? task.statusColor,
              }
            : task
        )
      );
    },
    [clickupStatuses]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalyzed();
    fetchProjectAnalyses();
    fetchProfessionals();
    fetchClickupTasks();
    fetchClickupStatuses();
    fetchProjects();
    fetchPendingPullRequests();
  }, [
    fetchAnalyzed,
    fetchProjectAnalyses,
    fetchProfessionals,
    fetchClickupTasks,
    fetchClickupStatuses,
    fetchProjects,
    fetchPendingPullRequests,
  ]);

  useEffect(() => {
    const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (stored === "anthropic" || stored === "openai" || stored === "gemini") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProvider(stored);
    }
  }, []);

  function handleProviderChange(next: AiProvider) {
    setProvider(next);
    localStorage.setItem(PROVIDER_STORAGE_KEY, next);
  }

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      const data = await res.json();
      setAuthors(data.authors);
      setErrors(data.errors ?? []);
      setStatus("ready");
      setLastSync(new Date());
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchActivity();
  }, [fetchActivity]);

  const [, setRelativeTimeTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setRelativeTimeTick((tick) => tick + 1),
      RELATIVE_TIME_TICK_MS
    );
    return () => clearInterval(interval);
  }, []);

  const [refreshCooldown, setRefreshCooldown] = useState(0);

  function handleRefresh() {
    if (refreshCooldown > 0) return;
    fetchActivity();
    fetchAnalyzed();
    fetchProjectAnalyses();
    fetchProfessionals();
    fetchClickupTasks();
    fetchClickupStatuses();
    fetchProjects();
    fetchPendingPullRequests();
    setRefreshCooldown(REFRESH_COOLDOWN_MS / 1000);
  }

  useEffect(() => {
    if (refreshCooldown <= 0) return;
    const timer = setTimeout(() => setRefreshCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [refreshCooldown]);

  const allCommits = (authors ?? []).flatMap((author) => author.commits);

  const activityItems: ActivityItem[] = useMemo(() => {
    const projectNames = projects.map((p) => p.name);

    const commitItems: ActivityItem[] = allCommits.map((commit) => ({
      id: commit.sha,
      source: "commit",
      customId: null,
      authorName: resolveAuthorName(commit.authorName, professionals),
      authorAvatarUrl: commit.authorAvatarUrl,
      authorClickupId: null,
      title: commit.message,
      content: commit.diff,
      url: commit.url,
      date: commit.date,
      location: normalizeLocation(`${commit.repoOwner}/${commit.repoName}`, projectNames),
      additions: commit.additions,
      deletions: commit.deletions,
      status: null,
      statusColor: null,
    }));

    const poProfessionals = professionals.filter((p) => p.role === "po" && p.clickupEmail);

    const taskItems: ActivityItem[] = clickupTasks
      .map((task): ActivityItem | null => {
        if (task.status.toLowerCase() === "concluído") return null;

        const owner = poProfessionals.find(
          (p) => p.clickupEmail?.toLowerCase() === task.authorEmail.toLowerCase()
        );
        if (!owner) return null;

        return {
          id: task.id,
          source: "clickup",
          customId: task.customId,
          authorName: resolveAuthorName(owner.authorName, professionals),
          authorAvatarUrl: task.authorAvatarUrl,
          authorClickupId: task.authorClickupId,
          title: task.name,
          content: task.description,
          url: task.url,
          date: task.date,
          location: normalizeLocation(task.location, projectNames),
          additions: null,
          deletions: null,
          status: task.status,
          statusColor: task.statusColor,
        };
      })
      .filter((item): item is ActivityItem => item !== null);

    return [...commitItems, ...taskItems];
  }, [allCommits, clickupTasks, professionals, projects]);

  const projectNames = useMemo(
    () => Array.from(new Set(activityItems.map((item) => item.location))).sort((a, b) => a.localeCompare(b)),
    [activityItems]
  );

  const pendingPrsByProject = useMemo(() => {
    const registeredProjectNames = projects.map((p) => p.name);
    const map = new Map<string, PullRequestInfo[]>();
    for (const repo of repoPullRequests) {
      const location = normalizeLocation(`${repo.owner}/${repo.name}`, registeredProjectNames);
      const list = map.get(location) ?? [];
      list.push(...repo.pullRequests);
      map.set(location, list);
    }
    return map;
  }, [repoPullRequests, projects]);

  const dateRange = useMemo(
    () => getPresetRange(datePreset, { start: customStart, end: customEnd }),
    [datePreset, customStart, customEnd]
  );

  const filteredActivityItems = useMemo(
    () =>
      activityItems
        .filter((item) => isWithinRange(item.date, dateRange))
        .filter((item) => !projectFilter || item.location === projectFilter),
    [activityItems, dateRange, projectFilter]
  );

  const resolvedAnalyzedActivities = useMemo(
    () =>
      analyzedActivities.map((record) => ({
        ...record,
        authorName: resolveAuthorName(record.authorName, professionals),
      })),
    [analyzedActivities, professionals]
  );

  const filteredAnalyzedActivities = useMemo(
    () =>
      resolvedAnalyzedActivities
        .filter((record) => isWithinRange(record.date, dateRange))
        .filter((record) => !projectFilter || record.location === projectFilter),
    [resolvedAnalyzedActivities, dateRange, projectFilter]
  );

  const projectFilteredAnalyzedActivities = useMemo(
    () =>
      resolvedAnalyzedActivities.filter(
        (record) => !projectFilter || record.location === projectFilter
      ),
    [resolvedAnalyzedActivities, projectFilter]
  );

  const buildRanking = useCallback(
    (role: "dev" | "po"): RankingEntry[] => {
      const expectedSource = role === "dev" ? "commit" : "clickup";
      const roleProfessionals = professionals.filter((p) => p.role === role);
      const authorNames = Array.from(
        new Set(roleProfessionals.map((p) => resolveAuthorName(p.authorName, professionals)))
      );

      return authorNames
        .map((authorName): RankingEntry | null => {
          const scores = filteredAnalyzedActivities.filter(
            (record) =>
              record.provider === provider &&
              record.authorName === authorName &&
              record.source === expectedSource
          );
          if (scores.length === 0) return null;

          const avatarUrl =
            roleProfessionals.find(
              (p) => resolveAuthorName(p.authorName, professionals) === authorName && p.avatarUrl
            )?.avatarUrl ??
            filteredActivityItems.find((item) => item.authorName === authorName)
              ?.authorAvatarUrl ??
            null;
          const averageScore =
            scores.reduce((sum, record) => sum + record.score, 0) / scores.length;

          return { authorName, avatarUrl, averageScore, analyzedCount: scores.length };
        })
        .filter((entry): entry is RankingEntry => entry !== null)
        .sort((a, b) => b.averageScore - a.averageScore);
    },
    [professionals, filteredAnalyzedActivities, provider, filteredActivityItems]
  );

  const devRanking = useMemo(() => buildRanking("dev"), [buildRanking]);
  const poRanking = useMemo(() => buildRanking("po"), [buildRanking]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Weenow 360</h1>
          <div className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40">
            <StatusDot status={status} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={status + (lastSync?.toISOString() ?? "")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {status === "loading" && "sincronizando atividade..."}
                {status === "ready" && lastSync && `atualizado ${timeAgo(lastSync.toISOString())}`}
                {status === "error" && "erro ao sincronizar atividade"}
              </motion.span>
            </AnimatePresence>
          </div>

          <motion.button
            onClick={handleRefresh}
            disabled={refreshCooldown > 0 || status === "loading"}
            whileHover={refreshCooldown === 0 && status !== "loading" ? { scale: 1.03 } : undefined}
            whileTap={refreshCooldown === 0 && status !== "loading" ? { scale: 0.97 } : undefined}
            title="Sincronizar"
            className="flex w-fit items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-black/70 dark:text-white/70 hover:border-black/30 dark:hover:border-white/30 disabled:cursor-default disabled:opacity-50"
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
              <RefreshIcon size={13} />
            </motion.span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={status === "loading" ? "loading" : refreshCooldown > 0 ? refreshCooldown : "idle"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {status === "loading"
                  ? "sincronizando..."
                  : refreshCooldown > 0
                    ? `aguarde ${refreshCooldown}s`
                    : "sincronizar"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <ProviderToggle value={provider} onChange={handleProviderChange} />
            <UserButton />
          </div>
          <a
            href="https://app.clickup.com/9007062280/v/l/6-901328264773-1"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 px-3 py-1 text-xs text-black/50 dark:text-white/50 hover:border-black/30 dark:hover:border-white/30 hover:text-black/80 dark:hover:text-white/80"
          >
            <ExternalLinkIcon size={11} />
            click-up
          </a>
        </div>
      </motion.header>

      {projectNames.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.03 }}
        >
          <ProjectFilter projects={projectNames} value={projectFilter} onChange={setProjectFilter} />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <DateRangeFilter
          value={datePreset}
          customStart={customStart}
          customEnd={customEnd}
          onChange={setDatePreset}
          onCustomChange={(start, end) => {
            setCustomStart(start);
            setCustomEnd(end);
          }}
        />
      </motion.div>

      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-700 dark:text-red-300"
          >
            {errors.join(" · ")}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {authors === null ? (
          <motion.p
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-black/30 dark:text-white/30"
          >
            carregando atividade...
          </motion.p>
        ) : filteredActivityItems.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-black/30 dark:text-white/30"
          >
            {activityItems.length === 0
              ? "Nenhuma atividade encontrada. Cadastre um repositório abaixo."
              : "Nenhuma atividade no período selecionado."}
          </motion.p>
        ) : (
          <motion.div key="content" className="flex flex-col gap-8">
            <Ranking
              title="Ranking · Devs"
              entries={devRanking}
              analyzedActivities={projectFilteredAnalyzedActivities}
            />

            <Ranking
              title="Ranking · PO's"
              entries={poRanking}
              analyzedActivities={projectFilteredAnalyzedActivities}
            />

            <ProjectRanking
              entries={projectAnalyses.filter(
                (record) =>
                  record.provider === provider &&
                  projects.some((p) => p.id === record.projectId) &&
                  (!projectFilter || record.projectName === projectFilter)
              )}
            />

            <ActivityTable
              items={filteredActivityItems}
              allItems={activityItems}
              provider={provider}
              analyzedActivities={filteredAnalyzedActivities}
              projects={projects}
              projectAnalyses={projectAnalyses}
              pendingPrsByProject={pendingPrsByProject}
              clickupStatuses={clickupStatuses}
              onActivityAnalyzed={fetchAnalyzed}
              onProjectAnalyzed={fetchProjectAnalyses}
              onTaskStatusUpdate={updateClickupTaskStatus}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ProfessionalsManager commits={allCommits} onChange={fetchProfessionals} />

      <ProjectsManager onChange={fetchProjects} />

      <RepoManager onRepoChange={fetchActivity} />
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  const color = status === "ready" ? "#22c55e" : status === "error" ? "#ef4444" : "#eab308";

  return (
    <span className="relative flex h-2 w-2 items-center justify-center">
      {status !== "error" && (
        <motion.span
          className="absolute h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
          animate={{ scale: [1, 1, 2.6], opacity: [0, 0.6, 0] }}
          transition={{
            repeat: Infinity,
            duration: status === "loading" ? 1 : 1.8,
            times: [0, 0.15, 1],
            ease: "easeOut",
          }}
        />
      )}
      <motion.span
        className="relative h-1.5 w-1.5 rounded-full"
        animate={{ backgroundColor: color }}
        transition={{ duration: 0.2 }}
      />
    </span>
  );
}
