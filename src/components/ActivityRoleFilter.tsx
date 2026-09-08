"use client";

import { motion } from "motion/react";
import type { ActivitySource } from "@/lib/types";

const OPTIONS: { value: ActivitySource; label: string; color: string }[] = [
  { value: "commit", label: "devs", color: "#22c55e" },
  { value: "clickup", label: "po's", color: "#a855f7" },
];

export function ActivityRoleFilter({
  value,
  counts,
  onChange,
}: {
  value: ActivitySource[];
  counts: Map<ActivitySource, number>;
  onChange: (sources: ActivitySource[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {OPTIONS.map((option) => {
        const active = value.includes(option.value);
        const count = counts.get(option.value) ?? 0;

        return (
          <motion.button
            key={option.value}
            onClick={() =>
              onChange(active ? value.filter((v) => v !== option.value) : [...value, option.value])
            }
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            title={`${count} ${option.label}`}
            className="flex items-baseline gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors"
            style={{
              borderColor: active ? `${option.color}80` : `${option.color}24`,
              backgroundColor: active
                ? `color-mix(in srgb, ${option.color} 14%, var(--card))`
                : "var(--card)",
              color: active ? option.color : `${option.color}a6`,
            }}
          >
            {option.label}
            <span className="tabular-nums" style={{ opacity: 0.6 }}>
              {count}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
