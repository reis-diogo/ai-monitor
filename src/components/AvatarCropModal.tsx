"use client";

import { useState } from "react";
import { motion, AnimatePresence, useMotionValue } from "motion/react";

const VIEWPORT_SIZE = 240;
const OUTPUT_SIZE = 256;

export function AvatarCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const baseSize = naturalSize
    ? (() => {
        const ratio = Math.max(VIEWPORT_SIZE / naturalSize.w, VIEWPORT_SIZE / naturalSize.h);
        return { w: naturalSize.w * ratio, h: naturalSize.h * ratio };
      })()
    : { w: VIEWPORT_SIZE, h: VIEWPORT_SIZE };

  const displayW = baseSize.w * scale;
  const displayH = baseSize.h * scale;
  const maxX = Math.max(0, (displayW - VIEWPORT_SIZE) / 2);
  const maxY = Math.max(0, (displayH - VIEWPORT_SIZE) / 2);

  function handleConfirm() {
    if (!naturalSize) return;

    const img = new Image();
    img.onload = () => {
      const displayScale = displayW / naturalSize.w;
      const imgLeft = (VIEWPORT_SIZE - displayW) / 2 + x.get();
      const imgTop = (VIEWPORT_SIZE - displayH) / 2 + y.get();
      const srcX = -imgLeft / displayScale;
      const srcY = -imgTop / displayScale;
      const srcSize = VIEWPORT_SIZE / displayScale;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      canvas.toBlob(
        (blob) => {
          if (blob) onConfirm(blob);
        },
        "image/jpeg",
        0.92
      );
    };
    img.src = imageSrc;
  }

  return (
    <AnimatePresence>
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
          className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-6"
        >
          <p className="text-sm text-black/70 dark:text-white/70">Ajuste a foto</p>

          <div
            className="relative overflow-hidden rounded-full bg-black"
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
          >
            <motion.img
              src={imageSrc}
              alt="Ajustar foto"
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
              }}
              drag
              dragElastic={0}
              dragMomentum={false}
              dragConstraints={{ left: -maxX, right: maxX, top: -maxY, bottom: maxY }}
              style={{
                x,
                y,
                width: displayW,
                height: displayH,
                position: "absolute",
                left: "50%",
                top: "50%",
                marginLeft: -displayW / 2,
                marginTop: -displayH / 2,
              }}
              className="cursor-grab active:cursor-grabbing"
            />
          </div>

          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="w-full accent-white"
          />

          <div className="flex w-full items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-md border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs text-black/60 dark:text-white/60 hover:border-black/30 dark:hover:border-white/30"
            >
              cancelar
            </button>
            <motion.button
              onClick={handleConfirm}
              disabled={!naturalSize}
              whileHover={naturalSize ? { scale: 1.04 } : undefined}
              whileTap={naturalSize ? { scale: 0.96 } : undefined}
              className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"
            >
              usar foto
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
