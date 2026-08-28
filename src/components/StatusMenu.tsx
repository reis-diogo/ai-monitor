"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import type { ClickUpStatusOption } from "@/lib/types";

export function StatusMenu({
  taskId,
  status,
  statusColor,
  statuses,
  onChanged,
}: {
  taskId: string;
  status: string;
  statusColor: string;
  statuses: ClickUpStatusOption[];
  onChanged: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPosition({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  }

  async function handleSelect(next: string) {
    if (next === status) {
      setOpen(false);
      return;
    }
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/clickup/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao atualizar status.");
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar status.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <motion.button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={updating || statuses.length === 0}
        whileHover={!updating ? { scale: 1.04 } : undefined}
        whileTap={!updating ? { scale: 0.96 } : undefined}
        className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium disabled:opacity-50"
        style={{
          borderColor: `${statusColor}55`,
          backgroundColor: `${statusColor}1a`,
          color: statusColor,
        }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusColor }} />
        {status}
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
              className="z-50 flex min-w-[170px] flex-col gap-0.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-1 shadow-xl"
            >
              {statuses.map((s) => (
                <button
                  key={s.status}
                  onClick={() => handleSelect(s.status)}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate">{s.status}</span>
                  {s.status === status && <span className="ml-auto text-black/30 dark:text-white/30">✓</span>}
                </button>
              ))}
              {error && (
                <p className="mt-1 rounded-md border border-red-500/20 bg-red-500/5 px-2 py-1 text-[10px] text-red-700 dark:text-red-300">
                  {error}
                </p>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
