"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/monitor/Icon";
import type { ProjectSource } from "@/lib/productivity-store";

export function SourcesManager() {
  const [sources, setSources] = useState<(ProjectSource & { url?: string | null })[] | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [list, setList] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [importing, setImporting] = useState(false);
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
    if (saving || !list.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/produtividade/fontes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list }),
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

  async function importHistory() {
    if (importing) return;
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/produtividade/historico", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao importar o histórico.");
      const results = data.results as {
        label: string;
        created: number;
        comments: number;
        error?: string;
      }[];
      const created = results.reduce((sum, item) => sum + item.created, 0);
      const comments = results.reduce((sum, item) => sum + item.comments, 0);
      const failed = results.filter((item) => item.error).map((item) => item.label);
      setMessage(
        `Importado: ${created} cards criados e ${comments} comentários.` +
          (failed.length ? ` Falhou em: ${failed.join(", ")}.` : ""),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao importar o histórico.");
    }
    setImporting(false);
  }

  async function saveNickname(id: string) {
    setEditing(null);
    await fetch("/api/produtividade/fontes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, nickname: draft }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/produtividade/fontes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-base font-semibold">Links do ClickUp monitorados</h3>
        <span className="text-xs text-muted-foreground">
          Tudo o que acontece nesses links (abrir card, mover de status, comentar) é registrado
          para a visão de produtividade. O projeto de cada ação vem do próprio card.
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={list}
          onChange={(event) => setList(event.target.value)}
          placeholder="Link ou id da lista do ClickUp"
          className="h-10 min-w-64 flex-1 rounded-lg border border-line-input bg-card px-3 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={saving || !list.trim()}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Icon name={saving ? "progress_activity" : "add"} size={16} className={saving ? "animate-spin" : undefined} />
          Adicionar
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={importHistory}
          disabled={importing || !sources?.length}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-line-input px-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
        >
          <Icon
            name={importing ? "progress_activity" : "history"}
            size={14}
            className={importing ? "animate-spin" : undefined}
          />
          {importing ? "Importando…" : "Importar histórico (90 dias)"}
        </button>
        <span className="text-xs text-muted-foreground">
          Traz cards criados e comentários anteriores ao cadastro. Movimentos de status só contam
          a partir do cadastro.
        </span>
      </div>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
      <div className="flex flex-col gap-2">
        {(sources ?? []).map((source) => (
          <div
            key={source.id}
            className="flex items-center gap-3 rounded-xl border border-line-card bg-surface-raised px-4 py-2.5 text-sm"
          >
            {editing === source.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => saveNickname(source.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") setEditing(null);
                }}
                placeholder={source.label ?? "Apelido"}
                maxLength={60}
                className="h-8 w-56 rounded-lg border border-line-input bg-card px-2 text-sm"
              />
            ) : (
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {source.nickname ?? source.label ?? "Lista"}
                </span>
                {source.nickname && source.label && ` (${source.label})`}
                {" · "}
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir a lista no ClickUp"
                    className="text-link underline-offset-2 hover:underline"
                  >
                    {source.listId}
                  </a>
                ) : (
                  source.listId
                )}
              </span>
            )}
            {editing !== source.id && (
              <button
                type="button"
                onClick={() => {
                  setDraft(source.nickname ?? "");
                  setEditing(source.id);
                }}
                aria-label="Dar apelido"
                title="Dar apelido"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon name="edit_note" size={16} />
              </button>
            )}
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
