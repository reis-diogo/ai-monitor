"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type Props = {
  onAdd: (url: string) => Promise<void>;
};

export function AddRepoForm({ onAdd }: Props) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || status === "submitting") return;

    setStatus("submitting");
    setError(null);

    try {
      await onAdd(value.trim());
      setValue("");
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erro ao cadastrar repositório.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <motion.input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="owner/repo ou https://github.com/owner/repo"
          className="flex-1 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-black/30 dark:text-white/30 focus:border-black/30 dark:focus:border-white/30"
          whileFocus={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          disabled={status === "submitting"}
        />
        <motion.button
          type="submit"
          disabled={status === "submitting" || !value.trim()}
          className="rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background disabled:opacity-40"
          whileHover={status !== "submitting" ? { scale: 1.03 } : undefined}
          whileTap={status !== "submitting" ? { scale: 0.97 } : undefined}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={status === "submitting" ? "loading" : "add"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="inline-block"
            >
              {status === "submitting" ? "Cadastrando..." : "Cadastrar"}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

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
    </form>
  );
}
