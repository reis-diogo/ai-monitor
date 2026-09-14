"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, stagger } from "motion/react";
import { CheckIcon, ChevronIcon } from "@/components/icons";

export type PicklistOption = {
  value: string;
  label: string;
  count: number;
  color?: string;
  avatarUrl?: string | null;
  dots?: string[];
  title?: string;
};

const MENU_WIDTH = 256;

function OptionMark({ option, size }: { option: PicklistOption; size: number }) {
  if (option.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={option.avatarUrl}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  if (option.color) {
    return (
      <span
        className="shrink-0 rounded-full"
        style={{ width: size / 2.5, height: size / 2.5, backgroundColor: option.color }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-white/10 text-[8px]"
      style={{ width: size, height: size }}
    >
      {option.label.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function FilterPicklist({
  label,
  allLabel = "todos",
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel?: string;
  options: PicklistOption[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    place();
    setOpen(true);
  }

  function toggleOption(optionValue: string) {
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue]
    );
  }

  const selected = options.filter((option) => value.includes(option.value));
  const summary =
    selected.length === 0
      ? allLabel
      : selected.length <= 2
        ? selected.map((option) => option.label).join(", ")
        : `${selected[0].label} +${selected.length - 1}`;
  const active = selected.length > 0;

  return (
    <>
      <motion.button
        ref={buttonRef}
        onClick={toggle}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 500, damping: 34 }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full border py-1 pr-2 pl-2.5 font-mono text-[11px] transition-colors ${
          active || open
            ? "border-primary/40 bg-primary/10 text-foreground"
            : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
        }`}
      >
        <span className="text-muted-foreground/70">{label}</span>
        <span className="min-w-0 max-w-[160px] truncate">{summary}</span>
        {active && (
          <span className="flex items-center gap-0.5">
            {selected.slice(0, 6).map((option) => (
              <OptionMark key={option.value} option={option} size={14} />
            ))}
          </span>
        )}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          className="flex items-center text-muted-foreground"
        >
          <ChevronIcon />
        </motion.span>
      </motion.button>

      {position &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div key="backdrop" className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            )}
            {open && (
              <motion.div
                key="menu"
                role="listbox"
                aria-multiselectable
                initial="closed"
                animate="open"
                exit="closed"
                variants={{
                  closed: { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } },
                  open: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 500,
                      damping: 34,
                      delayChildren: stagger(0.02),
                    },
                  },
                }}
                style={{
                  position: "fixed",
                  top: position.top,
                  left: position.left,
                  width: MENU_WIDTH,
                  transformOrigin: "top left",
                }}
                className="z-50 flex flex-col rounded-lg border border-border bg-popover font-mono shadow-xl shadow-black/40"
              >
                <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto p-1">
                  {options.map((option) => {
                    const checked = value.includes(option.value);
                    return (
                      <motion.button
                        key={option.value}
                        role="option"
                        aria-selected={checked}
                        variants={{ closed: { opacity: 0, x: -6 }, open: { opacity: 1, x: 0 } }}
                        onClick={() => toggleOption(option.value)}
                        title={option.title}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-accent ${
                          checked ? "text-foreground" : "text-foreground/60"
                        }`}
                      >
                        <span className="flex w-4 shrink-0 items-center justify-center">
                          <OptionMark option={option} size={16} />
                        </span>
                        <span className="truncate">{option.label}</span>
                        {option.dots && option.dots.length > 0 && (
                          <span className="flex shrink-0 items-center gap-0.5">
                            {option.dots.map((dot, index) => (
                              <span
                                key={`${dot}-${index}`}
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: dot, opacity: checked ? 1 : 0.6 }}
                              />
                            ))}
                          </span>
                        )}
                        <span className="ml-auto tabular-nums text-muted-foreground/70">
                          {option.count}
                        </span>
                        <span className="flex w-3 shrink-0 justify-center">
                          <AnimatePresence>
                            {checked && (
                              <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                                className="flex"
                                style={{ color: option.color ?? "var(--primary)" }}
                              >
                                <CheckIcon size={10} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <AnimatePresence initial={false}>
                  {value.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border"
                    >
                      <button
                        onClick={() => onChange([])}
                        className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        limpar
                        <span className="tabular-nums opacity-60">{value.length}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
