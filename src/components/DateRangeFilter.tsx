"use client";

import { motion } from "motion/react";
import type { DatePreset } from "@/lib/date-range";
import { DateRangePicker } from "@/components/DateRangePicker";

const OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "Último mês" },
  { value: "custom", label: "Personalizado" },
];

export function DateRangeFilter({
  value,
  customStart,
  customEnd,
  onChange,
  onCustomChange,
}: {
  value: DatePreset;
  customStart: string;
  customEnd: string;
  onChange: (preset: DatePreset) => void;
  onCustomChange: (start: string, end: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex flex-wrap rounded-full border border-black/10 bg-black/5 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`relative rounded-full px-3 py-1.5 font-medium transition-colors ${
              value === option.value ? "text-primary-foreground" : "text-foreground/50"
            }`}
          >
            {value === option.value && (
              <motion.span
                layoutId="date-filter-pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        ))}
      </div>

      {value === "custom" && (
        <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
          <DateRangePicker start={customStart} end={customEnd} onChange={onCustomChange} />
        </motion.div>
      )}
    </div>
  );
}
