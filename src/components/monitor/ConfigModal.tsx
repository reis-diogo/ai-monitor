"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMonitor } from "@/components/Dashboard";
import { ConfigView } from "@/components/monitor/ConfigView";

export function ConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { promptEditorOpen } = useMonitor();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !promptEditorOpen) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, promptEditorOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="config-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Configurações"
            className="max-h-full w-full max-w-[980px] overflow-y-auto rounded-2xl border border-line-input bg-card px-5 py-6 shadow-[0_24px_64px_var(--shadow-pop)] md:px-8 md:py-7"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.45, 0.05, 0.35, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <ConfigView onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
