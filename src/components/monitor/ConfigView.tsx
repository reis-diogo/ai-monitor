"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useMonitor } from "@/components/Dashboard";
import { Icon } from "@/components/monitor/Icon";
import { ProfessionalsManager } from "@/components/ProfessionalsManager";
import { ProjectsManager } from "@/components/ProjectsManager";
import { PromptEditorModal } from "@/components/PromptEditorModal";
import { ProviderToggle } from "@/components/ProviderToggle";
import { RepoManager } from "@/components/RepoManager";
import { useStatusLimits } from "@/lib/monitor/limits-store";
import { DEFAULT_LIMIT_HOURS, FALLBACK_LIMIT_HOURS, formatLimit, limitFor } from "@/lib/monitor/model";

const TABS = [
  { key: "equipe", label: "Equipe", icon: "groups", subtitle: "Quem faz parte da equipe e em qual papel." },
  {
    key: "status",
    label: "Status",
    icon: "tune",
    subtitle: "Em quanto tempo um card parado em cada status vira alerta.",
  },
  {
    key: "integracoes",
    label: "Integrações",
    icon: "hub",
    subtitle: "Conexão com o ClickUp e provedor de IA das análises.",
  },
  {
    key: "projetos",
    label: "Projetos",
    icon: "folder",
    subtitle: "Projetos, links do ClickUp e repositórios do GitHub.",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function stepOf(hours: number): number {
  return hours >= 48 ? 24 : 6;
}

function StatusLimitsTable() {
  const m = useMonitor();
  const { limits, setLimit, reset } = useStatusLimits();

  const rows = useMemo(() => {
    const seen = new Set<string>();
    return m.clickupStatuses.flatMap((option) => {
      const status = option.status.toLowerCase();
      if (seen.has(status)) return [];
      seen.add(status);
      return [{ status, color: option.color }];
    });
  }, [m.clickupStatuses]);

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line-card bg-surface-raised px-4 py-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon name="sync" size={18} className="text-ok" />
          Status importados do ClickUp
          {m.lastSync
            ? ` · última sincronização ${m.lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-line-input px-3.5 text-xs font-semibold transition-colors hover:border-primary"
          >
            <Icon name="restart_alt" size={16} />
            Restaurar padrões
          </button>
          <button
            type="button"
            onClick={() => void m.syncClickupStatuses()}
            disabled={m.syncingStatuses}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-line-input px-3.5 text-xs font-semibold transition-colors hover:border-primary disabled:opacity-60"
          >
            <Icon name="refresh" size={16} />
            {m.syncingStatuses ? "Sincronizando…" : "Sincronizar"}
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="grid grid-cols-[minmax(0,1fr)_150px_100px] gap-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-faint">
          <span>Status</span>
          <span>Alerta após</span>
          <span>Monitorar</span>
        </div>
        {rows.map((row) => {
          const base = {
            hours: DEFAULT_LIMIT_HOURS[row.status] ?? FALLBACK_LIMIT_HOURS,
            enabled: true,
          };
          const limit = limitFor(row.status, limits);

          return (
            <div
              key={row.status}
              className="grid grid-cols-[minmax(0,1fr)_150px_100px] items-center gap-3 border-t border-line-soft py-1.5 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: row.color || "var(--muted-foreground)" }}
                />
                <span className="truncate font-semibold uppercase tracking-[0.04em]">{row.status}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`Diminuir alerta de ${row.status}`}
                  onClick={() =>
                    setLimit(row.status, base, {
                      hours: Math.max(6, limit.hours - stepOf(limit.hours - 1)),
                    })
                  }
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Icon name="remove" size={16} />
                </button>
                <span className="min-w-12 text-center tabular-nums">{formatLimit(limit.hours)}</span>
                <button
                  type="button"
                  aria-label={`Aumentar alerta de ${row.status}`}
                  onClick={() =>
                    setLimit(row.status, base, { hours: limit.hours + stepOf(limit.hours) })
                  }
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Icon name="add" size={16} />
                </button>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={limit.enabled}
                aria-label={`Monitorar ${row.status}`}
                onClick={() => setLimit(row.status, base, { enabled: !limit.enabled })}
                className="relative h-5 w-[34px] rounded-full transition-colors"
                style={{ background: limit.enabled ? "var(--primary)" : "var(--line-input)" }}
              >
                <motion.span
                  className="absolute top-0.5 size-4 rounded-full bg-foreground"
                  initial={false}
                  animate={{ left: limit.enabled ? 16 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const m = useMonitor();
  const color = m.status === "ready" ? "var(--ok)" : m.status === "error" ? "var(--danger)" : "var(--warn)";
  const label =
    m.status === "ready"
      ? "sincronizado"
      : m.status === "error"
        ? "erro ao sincronizar"
        : "sincronizando…";

  return (
    <div className="flex max-w-[560px] flex-col gap-4">
      <div className="flex items-center gap-2.5 rounded-[10px] border border-line-card bg-surface-raised px-4 py-3 text-xs">
        <span className="size-2 rounded-full" style={{ background: color }} />
        <span className="font-semibold">ClickUp</span>
        <span className="text-muted-foreground">{label}</span>
        {m.lastSync && (
          <span className="ml-auto text-faint">
            {m.lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-[10px] border border-line-card bg-surface-raised px-4 py-3.5">
        <span className="text-[11px] text-muted-foreground">Provedor de IA das análises</span>
        <ProviderToggle value={m.provider} onChange={m.handleProviderChange} />
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => void m.syncClickupStatuses()}
          disabled={m.syncingStatuses}
          className="flex h-[38px] items-center gap-1.5 rounded-lg border border-line-input px-4 text-xs font-semibold transition-colors hover:border-primary disabled:opacity-60"
        >
          <Icon name="refresh" size={18} />
          {m.syncingStatuses ? "Sincronizando…" : "Sincronizar agora"}
        </button>
        {m.canEditPrompts && (
          <button
            type="button"
            onClick={() => m.setPromptEditorOpen(true)}
            className="flex h-[38px] items-center gap-1.5 rounded-lg border border-line-input px-4 text-xs font-semibold transition-colors hover:border-primary"
          >
            <Icon name="edit_note" size={18} />
            Editar prompts
          </button>
        )}
      </div>
    </div>
  );
}

export function ConfigView({ onClose }: { onClose: () => void }) {
  const m = useMonitor();
  const [active, setActive] = useState<TabKey>("equipe");
  const current = TABS.find((tab) => tab.key === active) ?? TABS[0];

  function pick(key: TabKey) {
    setActive(key);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PromptEditorModal open={m.promptEditorOpen} onClose={() => m.setPromptEditorOpen(false)} />

      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-lg font-semibold">Configurações</h1>
          <span className="text-xs text-muted-foreground">{current.subtitle}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar configurações"
          title="Fechar (Esc)"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-input text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <Icon name="close" size={16} />
        </button>
      </header>

      <div role="tablist" className="flex gap-1.5">
        {TABS.map((tab) => {
          const on = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => pick(tab.key)}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-[7px] text-xs font-semibold transition-colors ${
                on ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {on && (
                <motion.span
                  layoutId="config-tab"
                  className="absolute inset-0 rounded-lg bg-primary/12"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <Icon name={tab.icon} size={16} className="relative" />
              <span className="relative">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {active === "equipe" && (
        <ProfessionalsManager
          commits={m.allCommits}
          professionals={m.professionals}
          onChange={m.fetchProfessionals}
        />
      )}
      {active === "status" && <StatusLimitsTable />}
      {active === "integracoes" && <IntegrationsTab />}
      {active === "projetos" && (
        <div className="flex flex-col gap-8">
          <ProjectsManager
            projects={m.projects}
            onChange={m.fetchProjects}
            knownLocations={m.knownLocations}
          />
          <RepoManager onRepoChange={m.fetchActivity} />
        </div>
      )}
    </div>
  );
}
