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
              className="h-72 w-72 rounded-full border border-border object-cover"
            />
            <p className="text-sm text-foreground">{name}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={onChangePhoto}
                className="rounded-md border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:border-ring"
              >
                trocar foto
              </button>
              <button
                onClick={onClose}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
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
