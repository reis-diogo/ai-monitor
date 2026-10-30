"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/monitor/Icon";
import { OnlineAvatar } from "@/components/monitor/OnlineAvatar";
import type { OnlinePerson } from "@/lib/monitor/use-cursors";

export function OnlineModal({
  open,
  people,
  hidden,
  onToggle,
  onAll,
  onClose,
}: {
  open: boolean;
  people: OnlinePerson[];
  hidden: Set<string>;
  onToggle: (name: string) => void;
  onAll: (visible: boolean) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onClose();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const allVisible = people.every((person) => !hidden.has(person.name));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="online-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label="Mouses online"
            className="flex max-h-[80vh] w-[min(420px,100%)] flex-col gap-4 overflow-y-auto rounded-2xl border border-line-input bg-card p-6 shadow-[0_24px_64px_var(--shadow-pop)]"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.45, 0.05, 0.35, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="m-0 text-lg font-semibold">Mouses online</h2>
                <span className="text-xs text-muted-foreground">
                  Escolha de quem você quer ver o mouse no mapa.
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line-input text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            {people.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Só você por aqui.
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onAll(!allVisible)}
                  className="self-start text-xs font-semibold text-link hover:underline"
                >
                  {allVisible ? "Ocultar todos" : "Mostrar todos"}
                </button>
                <div className="flex flex-col gap-2">
                  {people.map((person) => {
                    const visible = !hidden.has(person.name);
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => onToggle(person.name)}
                        aria-pressed={visible}
                        className="flex items-center gap-3 rounded-xl border border-line-card bg-surface-raised px-3 py-2 text-left transition-colors hover:border-primary"
                      >
                        <OnlineAvatar
                          name={person.name}
                          color={person.color}
                          src={person.avatar}
                          size={32}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {person.name}
                        </span>
                        <span
                          className={`flex size-5 items-center justify-center rounded-md border-2 transition-colors ${
                            visible
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-line-input"
                          }`}
                        >
                          {visible && <Icon name="check" size={13} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
