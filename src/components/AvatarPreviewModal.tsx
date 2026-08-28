"use client";

import { motion, AnimatePresence } from "motion/react";

export function AvatarPreviewModal({
  name,
  avatarUrl,
  onClose,
  onChangePhoto,
}: {
  name: string | null;
  avatarUrl: string | null;
  onClose: () => void;
  onChangePhoto: () => void;
}) {
  return (
    <AnimatePresence>
      {name && avatarUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={name}
              className="h-72 w-72 rounded-full border border-black/10 dark:border-white/10 object-cover"
            />
            <p className="text-sm text-black/70 dark:text-white/70">{name}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={onChangePhoto}
                className="rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-1.5 text-xs text-black/60 dark:text-white/60 hover:border-black/30 dark:hover:border-white/30"
              >
                trocar foto
              </button>
              <button
                onClick={onClose}
                className="rounded-md border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
