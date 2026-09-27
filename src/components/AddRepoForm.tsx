"use client";

import { useState } from "react";
import { motion } from "motion/react";

type Props = {
  onAdd: (url: string) => void;
};

export function AddRepoForm({ onAdd }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <motion.input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="owner/repo ou https://github.com/owner/repo"
        className="flex-1 rounded-lg border border-border bg-muted px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-ring"
        whileFocus={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
      <motion.button
        type="submit"
        disabled={!value.trim()}
        className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        cadastrar
      </motion.button>
    </form>
  );
}
