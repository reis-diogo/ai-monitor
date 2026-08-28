"use client";

import { motion } from "motion/react";
import type { ActivitySource } from "@/lib/types";

const OPTIONS: { value: ActivitySource; label: string }[] = [
  { value: "commit", label: "Devs" },
  { value: "clickup", label: "PO's" },
];

export function ActivityRoleFilter({
  value,
  onChange,
}: {
  value: ActivitySource | null;
  onChange: (source: ActivitySource | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-full border border-black/10 bg-black/5 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
      <button
        onClick={() => onChange(null)}
        className={`relative rounded-full px-3 py-1.5 font-medium transition-colors ${
          value === null ? "text-background" : "text-foreground/50"
        }`}
      >
        {value === null && (
          <motion.span
            layoutId="role-filter-pill"
            className="absolute inset-0 rounded-full bg-foreground"
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
          />
        )}
        <span className="relative">Todos</span>
      </button>

      {OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`relative rounded-full px-3 py-1.5 font-medium transition-colors ${
            value === option.value ? "text-background" : "text-foreground/50"
          }`}
        >
          {value === option.value && (
            <motion.span
              layoutId="role-filter-pill"
              className="absolute inset-0 rounded-full bg-foreground"
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
            />
          )}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
