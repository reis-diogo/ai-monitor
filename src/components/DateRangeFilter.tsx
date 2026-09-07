"use client";

import { motion } from "motion/react";
import type { DatePreset } from "@/lib/date-range";

const OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "tudo" },
  { value: "today", label: "hoje" },
  { value: "yesterday", label: "ontem" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "último mês" },
];

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {OPTIONS.map((option) => {
        const active = value === option.value;

        return (
          <motion.button
            key={option.value}
            onClick={() => onChange(option.value)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${
              active
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-primary/15 text-primary/60 hover:text-primary"
            }`}
          >
            {option.label}
          </motion.button>
        );
      })}
    </div>
  );
}
