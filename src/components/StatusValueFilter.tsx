"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronIcon } from "@/components/icons";

const STATUS_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "dev liberado", label: "Dev liberado" },
  { value: "em qa", label: "Em QA" },
  { value: "pr_pendente", label: "PR pendente" },
  { value: "refinar po", label: "Refinar PO" },
];

export function StatusValueFilter({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  }

  function toggleValue(status: string) {
    if (value.includes(status)) {
      onChange(value.filter((v) => v !== status));
    } else {
      onChange([...value, status]);
    }
  }

  return (
    <>
      <motion.button
        ref={buttonRef}
        onClick={handleToggle}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          value.length > 0
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-black/5 text-foreground/50 dark:bg-white/5"
        }`}
      >
        status{value.length > 0 ? ` (${value.length})` : ""}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-3 w-3 items-center justify-center"
        >
          <ChevronIcon />
        </motion.span>
      </motion.button>

      {open &&
        menuPosition &&
        createPortal(
          <AnimatePresence>
            <div key="backdrop" className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => e.stopPropagation()}
              style={{ position: "fixed", top: menuPosition.top, left: menuPosition.left }}
              className="z-50 flex min-w-[170px] flex-col gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-xl"
            >
              {STATUS_OPTIONS.map((option) => {
                const checked = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleValue(option.value)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] text-foreground/80 hover:bg-accent"
                  >
                    <span
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                        checked ? "border-primary bg-primary" : "border-border"
                      }`}
                    >
                      {checked && <span className="h-1.5 w-1.5 rounded-sm bg-white" />}
                    </span>
                    {option.label}
                  </button>
                );
              })}
              {value.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="mt-0.5 rounded-md px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-accent"
                >
                  limpar filtro
                </button>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
