"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "excluir",
  cancelLabel = "cancelar",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5"
          >
            <p className="text-sm text-black/80 dark:text-white/80">{title}</p>
            {description && <p className="mt-1.5 text-xs text-black/40 dark:text-white/40">{description}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="rounded-md border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs text-black/60 dark:text-white/60 hover:border-black/30 dark:hover:border-white/30 hover:text-black dark:hover:text-white"
              >
                {cancelLabel}
              </button>
              <motion.button
                onClick={onConfirm}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-md bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
