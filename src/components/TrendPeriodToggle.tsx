"use client";

import { LayoutGroup, motion } from "motion/react";
import type { TrendPeriod } from "@/lib/trend";

const OPTIONS: { value: TrendPeriod; label: string }[] = [
  { value: "30d", label: "30 dias" },
  { value: "3m", label: "3 meses" },
  { value: "12m", label: "12 meses" },
];

export function TrendPeriodToggle({
  groupId,
  value,
  onChange,
}: {
  groupId: string;
  value: TrendPeriod;
  onChange: (period: TrendPeriod) => void;
}) {
  return (
    <LayoutGroup id={groupId}>
      <div className="inline-flex rounded-full border border-border bg-muted p-0.5 text-[10px]">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={(e) => {
              e.stopPropagation();
              onChange(option.value);
            }}
            className={`relative rounded-full px-2 py-1 font-medium transition-colors ${
              value === option.value ? "text-primary-foreground" : "text-foreground/50"
            }`}
          >
            {value === option.value && (
              <motion.span
                layoutId="trend-period-pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}
