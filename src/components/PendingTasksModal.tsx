"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ActivityItem } from "@/lib/types";
import { truncate } from "@/lib/truncate";
import { ActivityItemDetailModal } from "@/components/ActivityItemDetailModal";
import { ExternalLinkIcon } from "@/components/icons";

export function PendingTasksModal({
  items,
  onClose,
  label = "para desenvolver",
}: {
  items: ActivityItem[] | null;
  onClose: () => void;
  label?: string;
}) {
  const [selected, setSelected] = useState<ActivityItem | null>(null);

  function handleClose() {
    setSelected(null);
    onClose();
  }

  useEffect(() => {
    if (!items) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !selected) handleClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selected]);

  return (
    <>
      <AnimatePresence>
        {items && !selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="flex w-full max-w-lg max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-6"
            >
              <div className="flex shrink-0 items-center justify-between gap-4">
                <p className="text-sm text-black/70 dark:text-white/70">
                  {items.length} tarefa{items.length > 1 ? "s" : ""} {label}
                </p>
                <button
                  onClick={handleClose}
                  className="shrink-0 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                >
                  fechar
                </button>
              </div>

              <ul className="mt-4 flex flex-col gap-2 overflow-y-auto pr-1">
                {items.map((item) => (
                  <motion.li
                    key={item.id}
                    onClick={() => setSelected(item)}
                    whileHover={{ backgroundColor: "var(--accent)" }}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/5 dark:border-white/5 p-2.5 text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate text-black/70 dark:text-white/70">
                      {truncate(item.title, 50)}
                    </span>
                    <span className="shrink-0 text-black/30 dark:text-white/30">{item.authorName}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Abrir no ClickUp"
                      className="shrink-0 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white"
                    >
                      <ExternalLinkIcon size={12} />
                    </a>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ActivityItemDetailModal item={selected} onClose={handleClose} onBack={() => setSelected(null)} />
    </>
  );
}
