"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CURSOR_COLORS } from "@/lib/monitor/use-cursors";

export function CursorColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        title="Escolher a cor do seu mouse"
        className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-[9px] border border-line-input bg-card px-3 text-[11px] text-muted-foreground transition-colors hover:border-primary"
      >
        <span className="size-3.5 rounded-full" style={{ background: color }} />
        minha cor
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 top-[calc(100%+6px)] z-40 flex w-[176px] flex-col gap-3 rounded-[10px] border border-line-input bg-popover p-3 shadow-[0_12px_32px_var(--shadow-pop)]"
          >
            <div className="grid grid-cols-5 gap-2">
              {CURSOR_COLORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-label={`Usar a cor ${item}`}
                  onClick={() => onChange(item)}
                  className="size-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: item,
                    borderColor: item.toLowerCase() === color.toLowerCase() ? "var(--foreground)" : "transparent",
                  }}
                />
              ))}
            </div>
            <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              outra cor
              <input
                type="color"
                value={color}
                onChange={(event) => onChange(event.target.value)}
                className="h-6 w-10 cursor-pointer rounded border border-line-input bg-transparent p-0"
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
