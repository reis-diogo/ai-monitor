"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import type { PullRequestInfo } from "@/lib/types";

export function PendingPullRequestsModal({
  pullRequests,
  onClose,
}: {
  pullRequests: PullRequestInfo[] | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!pullRequests) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pullRequests, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {pullRequests && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
                {pullRequests.length} pull request{pullRequests.length > 1 ? "s" : ""} aberto
                {pullRequests.length > 1 ? "s" : ""}
              </p>
              <button
                onClick={onClose}
                className="shrink-0 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                fechar
              </button>
            </div>

            <ul className="mt-4 flex flex-col gap-2 overflow-y-auto pr-1">
              {pullRequests.map((pr) => (
                <li key={pr.url}>
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-black/5 dark:border-white/5 p-2.5 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                  >
                    <span className="min-w-0 flex-1 truncate text-black/70 dark:text-white/70">
                      #{pr.number} {pr.title}
                    </span>
                    {pr.authorName && (
                      <span className="shrink-0 text-black/30 dark:text-white/30">{pr.authorName}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
