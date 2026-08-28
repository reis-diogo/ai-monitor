"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Project } from "@/lib/types";
import { ChevronIcon, CloseIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function ProjectsManager({ onChange }: { onChange: () => void }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scopeDrafts, setScopeDrafts] = useState<Record<string, string>>({});
  const [savingScope, setSavingScope] = useState<string | null>(null);
  const [removingProject, setRemovingProject] = useState<Project | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao cadastrar projeto.");
      setProjects((prev) => [...(prev ?? []), data.project]);
      setName("");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar projeto.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => (prev ?? []).filter((p) => p.id !== id));
    setRemovingProject(null);
    onChange();
  }

  function toggleExpand(project: Project) {
    if (expandedId === project.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(project.id);
    setScopeDrafts((prev) => ({ ...prev, [project.id]: prev[project.id] ?? project.scope ?? "" }));
  }

  async function handleSaveScope(id: string) {
    setSavingScope(id);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: scopeDrafts[id] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar escopo.");
      setProjects((prev) => (prev ?? []).map((p) => (p.id === id ? data.project : p)));
      onChange();
    } finally {
      setSavingScope(null);
    }
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
                  disabled={submitting}
                  className="min-w-0 flex-1 rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2.5 py-1.5 text-sm outline-none placeholder:text-black/30 dark:text-white/30 focus:border-black/30 dark:focus:border-white/30"
                />
                <motion.button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  whileHover={!submitting ? { scale: 1.04 } : undefined}
                  whileTap={!submitting ? { scale: 0.96 } : undefined}
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-40"
                >
                  {submitting ? "adicionando..." : "adicionar"}
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
                        <div className="flex items-center gap-2 px-3 py-2">
                          <button
                            onClick={() => toggleExpand(project)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs"
                          >
                            <span className="min-w-0 truncate text-black/80 dark:text-white/80">{project.name}</span>
                            {project.scope && (
                              <span className="shrink-0 text-black/30 dark:text-white/30">escopo definido</span>
                            )}
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
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
                                  disabled={savingScope === project.id}
                                  whileHover={savingScope !== project.id ? { scale: 1.02 } : undefined}
                                  whileTap={savingScope !== project.id ? { scale: 0.98 } : undefined}
                                  className="self-end rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"
                                >
                                  {savingScope === project.id ? "salvando..." : "salvar escopo"}
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
