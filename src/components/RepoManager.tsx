"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { RegisteredRepo } from "@/lib/types";
import { AddRepoForm } from "@/components/AddRepoForm";
import { RepoChip } from "@/components/RepoChip";
import { ChevronIcon } from "@/components/icons";

export function RepoManager({ onRepoChange }: { onRepoChange: () => void }) {
  const [repos, setRepos] = useState<RegisteredRepo[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/repos")
      .then((res) => res.json())
      .then((data) => setRepos(data.repos));
  }, []);

  async function handleAdd(url: string) {
    const res = await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Erro ao cadastrar repositório.");
    setRepos((prev) => [...(prev ?? []), data.repo]);
    onRepoChange();
  }

  function handleRemove(id: string) {
    setRepos((prev) => (prev ?? []).filter((r) => r.id !== id));
    onRepoChange();
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm text-black/60 dark:text-white/60"
      >
        <span>Repositórios monitorados {repos ? `(${repos.length})` : ""}</span>
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
              <AddRepoForm onAdd={handleAdd} />
              <ul className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {(repos ?? []).map((repo) => (
                    <RepoChip key={repo.id} repo={repo} onRemove={handleRemove} />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
