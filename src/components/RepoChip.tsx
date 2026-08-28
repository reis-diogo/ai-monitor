"use client";

import { motion } from "motion/react";
import type { RegisteredRepo } from "@/lib/types";
import { CloseIcon } from "@/components/icons";

export function RepoChip({
  repo,
  onRemove,
}: {
  repo: RegisteredRepo;
  onRemove: (id: string) => void;
}) {
  async function handleRemove() {
    await fetch(`/api/repos/${repo.id}`, { method: "DELETE" });
    onRemove(repo.id);
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-1.5 text-xs"
    >
      <a href={repo.url} target="_blank" rel="noreferrer" className="hover:underline">
        {repo.owner}/{repo.name}
      </a>
      <button
        onClick={handleRemove}
        className="flex h-4 w-4 shrink-0 items-center justify-center text-black/30 dark:text-white/30 hover:text-red-400"
      >
        <CloseIcon />
      </button>
    </motion.li>
  );
}
