"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Project } from "@/lib/types";
import { CheckIcon, ChevronIcon, CloseIcon, PencilIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function ProjectsManager({
  onChange,
  knownLocations = [],
}: {
  onChange: () => void;
  knownLocations?: string[];
}) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scopeDrafts, setScopeDrafts] = useState<Record<string, string>>({});
  const [removingProject, setRemovingProject] = useState<Project | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects));
  }, []);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    const trimmedName = name.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticProject: Project = { id: tempId, name: trimmedName };

    setProjects((prev) => [...(prev ?? []), optimisticProject]);
    setName("");

    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro ao cadastrar projeto.");
        setProjects((prev) => (prev ?? []).map((p) => (p.id === tempId ? data.project : p)));
        onChange();
      })
      .catch((err) => {
        setProjects((prev) => (prev ?? []).filter((p) => p.id !== tempId));
        setError(err instanceof Error ? err.message : "Erro ao cadastrar projeto.");
      });
  }

  // Mesma regra do normalizeLocation: o nome casa por substring dentro do valor cru
  // que veio do ClickUp ou do caminho do repo. Se nao casar com nada, o projeto
  // renomeado deixa de aparecer na tabela.
  function matchesSomeCard(candidate: string): boolean {
    const trimmed = candidate.trim().toLowerCase();
    if (!trimmed) return true;
    return knownLocations.some((location) => location.toLowerCase().includes(trimmed));
  }

  function startEditing(project: Project) {
    setEditingId(project.id);
    setNameDraft(project.name);
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setNameDraft("");
  }

  function handleSaveName(project: Project) {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === project.name) {
      cancelEditing();
      return;
    }

    const previous = projects;
    setProjects((prev) => (prev ?? []).map((p) => (p.id === project.id ? { ...p, name: trimmed } : p)));
    cancelEditing();
    setError(null);

    fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro ao renomear projeto.");
        setProjects((prev) => (prev ?? []).map((p) => (p.id === project.id ? data.project : p)));
        onChange();
      })
      .catch((err) => {
        setProjects(previous);
        setError(err instanceof Error ? err.message : "Erro ao renomear projeto.");
      });
  }

  function handleRemove(id: string) {
    const previous = projects;
    setProjects((prev) => (prev ?? []).filter((p) => p.id !== id));
    setRemovingProject(null);

    fetch(`/api/projects/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao remover projeto.");
        onChange();
      })
      .catch(() => {
        setProjects(previous);
        setError("Erro ao remover projeto.");
      });
  }

  function toggleExpand(project: Project) {
    if (expandedId === project.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(project.id);
    setScopeDrafts((prev) => ({ ...prev, [project.id]: prev[project.id] ?? project.scope ?? "" }));
  }

  function handleSaveScope(id: string) {
    const previous = projects;
    const draft = scopeDrafts[id] ?? "";
    setProjects((prev) => (prev ?? []).map((p) => (p.id === id ? { ...p, scope: draft } : p)));

    fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: draft }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro ao salvar escopo.");
        setProjects((prev) => (prev ?? []).map((p) => (p.id === id ? data.project : p)));
        onChange();
      })
      .catch((err) => {
        setProjects(previous);
        setError(err instanceof Error ? err.message : "Erro ao salvar escopo.");
      });
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm text-black/60 dark:text-white/60"
      >
        <span>Projetos {projects ? `(${projects.length})` : ""}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-4 w-4 shrink-0 items-center justify-center text-black/30 dark:text-white/30"
        >
          <ChevronIcon />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 border-t border-black/10 dark:border-white/10 px-5 py-4">
              <p className="text-[11px] text-black/40 dark:text-white/40">
                Cadastre os nomes dos projetos em que atuamos — se o nome do repositório ou o
                projeto do ClickUp contiver um desses nomes, a coluna &quot;local&quot; é
                normalizada para ele. Defina também o escopo vendido para habilitar a análise de
                aderência escopo x commits.
              </p>

              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do projeto (ex: Novafrota)"
                  className="min-w-0 flex-1 rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2.5 py-1.5 text-sm outline-none placeholder:text-black/30 dark:text-white/30 focus:border-black/30 dark:focus:border-white/30"
                />
                <motion.button
                  type="submit"
                  disabled={!name.trim()}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-40"
                >
                  adicionar
                </motion.button>
              </form>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden text-sm text-red-400"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <ul className="flex flex-col gap-2">
                <AnimatePresence>
                  {(projects ?? []).map((project) => {
                    const isExpanded = expandedId === project.id;
                    return (
                      <motion.li
                        key={project.id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]"
                      >
                        <div className="flex items-start gap-2 px-3 py-2">
                          {editingId === project.id ? (
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <input
                                autoFocus
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveName(project);
                                  if (e.key === "Escape") cancelEditing();
                                }}
                                className="w-full rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2 py-1 text-xs outline-none focus:border-black/30 dark:focus:border-white/30"
                              />
                              {!matchesSomeCard(nameDraft) && (
                                <span className="text-[11px] leading-4 text-amber-500 dark:text-amber-400">
                                  Nenhum card carregado tem &quot;{nameDraft.trim()}&quot; no campo projeto. Com
                                  esse nome o projeto sai da tabela de atividades — renomeie também no ClickUp.
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => toggleExpand(project)}
                              className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs"
                            >
                              <span className="min-w-0 truncate text-black/80 dark:text-white/80">{project.name}</span>
                              {project.scope && (
                                <span className="shrink-0 text-black/30 dark:text-white/30">escopo definido</span>
                              )}
                            </button>
                          )}
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() =>
                                editingId === project.id ? handleSaveName(project) : startEditing(project)
                              }
                              title={editingId === project.id ? "Salvar o nome" : "Renomear o projeto"}
                              className="flex h-4 w-4 items-center justify-center text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
                            >
                              {editingId === project.id ? <CheckIcon /> : <PencilIcon />}
                            </button>
                            <button
                              onClick={() => toggleExpand(project)}
                              className="flex h-4 w-4 items-center justify-center text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
                            >
                              <motion.span
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center justify-center"
                              >
                                <ChevronIcon />
                              </motion.span>
                            </button>
                            <button
                              onClick={() => setRemovingProject(project)}
                              className="flex h-4 w-4 items-center justify-center text-black/30 dark:text-white/30 hover:text-red-400"
                            >
                              <CloseIcon />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-2 border-t border-black/10 dark:border-white/10 px-3 py-3">
                                <textarea
                                  value={scopeDrafts[project.id] ?? ""}
                                  onChange={(e) =>
                                    setScopeDrafts((prev) => ({ ...prev, [project.id]: e.target.value }))
                                  }
                                  placeholder="Descreva aqui o escopo vendido ao cliente: funcionalidades, entregas, limites do que foi contratado..."
                                  rows={6}
                                  className="w-full resize-y rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2.5 py-2 text-xs outline-none placeholder:text-black/30 dark:text-white/30 focus:border-black/30 dark:focus:border-white/30"
                                />
                                <motion.button
                                  onClick={() => handleSaveScope(project.id)}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="self-end rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"
                                >
                                  salvar escopo
                                </motion.button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={removingProject !== null}
        title={`Excluir o projeto "${removingProject?.name}"?`}
        description="O escopo e as análises associadas a este projeto também serão perdidos."
        onConfirm={() => removingProject && handleRemove(removingProject.id)}
        onCancel={() => setRemovingProject(null)}
      />
    </div>
  );
}
