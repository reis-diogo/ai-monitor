"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/monitor/Icon";

type Option = { id: string; name: string };
type ListOption = { listId: string; label: string };
type Created = { id: string; customId: string | null; url: string; status: string | null };

const FIELD =
  "w-full rounded-[9px] border border-line-input bg-surface-raised px-3 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:border-primary";

export function NewCardForm({
  open,
  onClose,
  onCreated,
  defaultProject,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultProject?: string | null;
}) {
  const [lists, setLists] = useState<ListOption[]>([]);
  const [listId, setListId] = useState("");
  const [options, setOptions] = useState<Option[] | null>(null);
  const [firstStatus, setFirstStatus] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const query = listId ? `?list=${encodeURIComponent(listId)}` : "";
    fetch(`/api/clickup/new-card${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const projects: Option[] | null = data.projects ?? null;
        setLists(data.lists ?? []);
        if (!listId && data.listId) setListId(data.listId);
        setOptions(projects);
        setFirstStatus(data.firstStatus ?? null);
        setLoadError(data.error ?? null);
        const match =
          defaultProject && projects
            ? projects.find(
                (option) =>
                  option.name.trim().toLowerCase() === defaultProject.trim().toLowerCase(),
              )
            : null;
        setProjectId(match ? match.id : "");
      })
      .catch(() => {
        if (!cancelled) setLoadError("Não foi possível carregar as listas.");
      });
    const focus = setTimeout(() => nameRef.current?.focus(), 180);
    return () => {
      cancelled = true;
      clearTimeout(focus);
    };
  }, [open, defaultProject, listId]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !sending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sending, onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/clickup/new-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, projectId, listId, startDate, dueDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar o card.");
        return;
      }
      setCreated(data.task);
      setPrompt(data.prompt ?? "");
      setPromptError(data.promptError ?? null);
      setCopied(false);
      onCreated();
    } catch {
      setError("Não foi possível criar o card.");
    } finally {
      setSending(false);
    }
  }

  function again() {
    setCreated(null);
    setPrompt("");
    setPromptError(null);
    setCopied(false);
    setName("");
    setDescription("");
    setStartDate("");
    setDueDate("");
    setError(null);
    setTimeout(() => nameRef.current?.focus(), 50);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setPromptError("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }

  const ready =
    name.trim().length > 0 && listId !== "" && (options === null || projectId !== "") && !sending;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="new-card"
          role="dialog"
          aria-label="Novo card"
          className="absolute left-4 top-[68px] z-30 w-[min(420px,calc(100%-2rem))] rounded-2xl border border-line-input bg-card p-5 shadow-[0_24px_64px_var(--shadow-pop)]"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.45, 0.05, 0.35, 1] }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="m-0 text-base font-semibold">Novo card</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              title="Fechar (Esc)"
              className="flex size-8 items-center justify-center rounded-lg border border-line-input text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          {created ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 rounded-xl border border-line-card bg-surface-raised p-4 text-sm">
                <span className="font-semibold text-ok">Card criado no ClickUp</span>
                <span className="text-muted-foreground">
                  {created.customId ?? created.id} · status &ldquo;{created.status ?? "padrão da lista"}&rdquo;
                </span>
              </div>
              {prompt ? (
                <button
                  type="button"
                  onClick={copyPrompt}
                  className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Icon name={copied ? "check" : "code"} size={16} />
                  {copied ? "Prompt copiado" : "Copiar prompt do arquiteto"}
                </button>
              ) : (
                <span className="text-xs text-warn">
                  {promptError ?? "Prompt do arquiteto indisponível."}
                </span>
              )}
              {prompt && (
                <span className="text-xs text-muted-foreground">
                  Cole no Claude Code na sua máquina. O arquiteto vai conversar com você e, ao esclarecer tudo, move o card para &ldquo;validar solução&rdquo;.
                </span>
              )}
              <div className="flex gap-2">
                <a
                  href={created.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Icon name="open_in_new" size={16} />
                  Abrir no ClickUp
                </a>
                <button
                  type="button"
                  onClick={again}
                  className="h-10 rounded-[10px] border border-line-input px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  Criar outro
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                Link monitorado
                <select
                  value={listId}
                  onChange={(event) => {
                    setOptions(null);
                    setFirstStatus(null);
                    setListId(event.target.value);
                  }}
                  className={`${FIELD} h-10`}
                >
                  {lists.length === 0 && <option value="">Nenhum link monitorado</option>}
                  {lists.map((item) => (
                    <option key={item.listId} value={item.listId}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              {options && (
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  Projeto
                  <select
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    className={`${FIELD} h-10`}
                  >
                    <option value="">Escolha o projeto</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                Título
                <input
                  ref={nameRef}
                  value={name}
                  maxLength={200}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex.: US 01 - Criar Record Type Venda"
                  className={`${FIELD} h-10`}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                Descrição
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder="Contexto, regras e critérios de aceite"
                  className={`${FIELD} resize-y py-2.5`}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  Início
                  <input
                    type="date"
                    value={startDate}
                    max={dueDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                    className={`${FIELD} h-10`}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  Fim
                  <input
                    type="date"
                    value={dueDate}
                    min={startDate || undefined}
                    onChange={(event) => setDueDate(event.target.value)}
                    className={`${FIELD} h-10`}
                  />
                </label>
              </div>

              {(error || loadError) && (
                <span className="text-xs text-danger">{error ?? loadError}</span>
              )}

              <button
                type="submit"
                disabled={!ready}
                className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name={sending ? "progress_activity" : "add"} size={18} />
                {sending ? "Criando…" : "Criar card"}
              </button>
              <span className="text-[11px] text-faint">
                Cria uma tarefa real na lista escolhida do ClickUp
                {firstStatus ? <>, no primeiro status &ldquo;{firstStatus}&rdquo;</> : ""}.
              </span>
            </form>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
