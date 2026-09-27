"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import type { ActivityItem } from "@/lib/types";

export function ActivityItemDetailModal({
  item,
  onClose,
  onBack,
}: {
  item: ActivityItem | null;
  onClose: () => void;
  onBack?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!item) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  async function handleCopy() {
    if (!item) return;
    await navigator.clipboard.writeText(item.content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {item && (
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
            className="flex w-full max-w-lg max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border bg-popover p-6"
          >
            <div className="flex shrink-0 items-start justify-between gap-4">
              <div className="min-w-0">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="mb-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    ← voltar
                  </button>
                )}
                <p className="text-sm text-foreground">{item.title}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {item.source === "commit" ? "ver no GitHub" : "ver no ClickUp"}
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  fechar
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 overflow-y-auto pr-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                  <span>{item.authorName}</span>
                  <span>·</span>
                  <span>{item.location}</span>
                </div>
                {item.content && (
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {copied ? "copiado!" : "copiar"}
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {item.content || "(sem descrição)"}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
