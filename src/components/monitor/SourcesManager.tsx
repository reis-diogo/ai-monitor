"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/monitor/Icon";
import type { ProjectSource } from "@/lib/productivity-store";

export function SourcesManager({ projectNames }: { projectNames: string[] }) {
  const [sources, setSources] = useState<ProjectSource[] | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [project, setProject] = useState("");
  const [list, setList] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/produtividade/fontes");
      if (res.status === 403) {
        setAllowed(false);
        return;
      }
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch {
      setSources([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (!allowed) return null;

  async function add() {
    if (saving || !project || !list.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/produtividade/fontes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: project, list }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao cadastrar.");
      setList("");
      setMessage(data.webhookError ?? "Lista cadastrada e monitorada.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao cadastrar.");
    }
    setSaving(false);
  }

  async function remove(id: string) {
    await fetch(`/api/produtividade/fontes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-base font-semibold">Listas do ClickUp por projeto</h3>
        <span className="text-xs text-muted-foreground">
          Cada lista cadastrada passa a ter as ações das pessoas (abrir card, mover de status,
          comentar) registradas para a visão de produtividade.
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={project}
          onChange={(event) => setProject(event.target.value)}
          className="h-10 rounded-lg border border-line-input bg-card px-3 text-sm"
        >
          <option value="">projeto…</option>
          {projectNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <input
          value={list}
          onChange={(event) => setList(event.target.value)}
          placeholder="Link ou id da lista do ClickUp"
          className="h-10 min-w-64 flex-1 rounded-lg border border-line-input bg-card px-3 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={saving || !project || !list.trim()}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Icon name={saving ? "progress_activity" : "add"} size={16} className={saving ? "animate-spin" : undefined} />
          Adicionar
        </button>
      </div>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
      <div className="flex flex-col gap-2">
        {(sources ?? []).map((source) => (
          <div
            key={source.id}
            className="flex items-center gap-3 rounded-xl border border-line-card bg-surface-raised px-4 py-2.5 text-sm"
          >
            <span className="font-medium">{source.projectName}</span>
            <span className="text-muted-foreground">
              {source.label ?? "lista"} · {source.listId}
            </span>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                source.webhookId ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"
              }`}
            >
              {source.webhookId ? "monitorando" : "sem webhook"}
            </span>
            <button
              type="button"
              onClick={() => remove(source.id)}
              aria-label="Remover"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon name="delete" size={16} />
            </button>
          </div>
        ))}
        {sources?.length === 0 && (
          <span className="text-xs text-muted-foreground">Nenhuma lista cadastrada ainda.</span>
        )}
      </div>
    </section>
  );
}
