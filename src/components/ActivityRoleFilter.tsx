"use client";

import { FilterPicklist } from "@/components/FilterPicklist";
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
    <FilterPicklist
      label="papel"
      options={OPTIONS.map((option) => {
        const count = counts.get(option.value) ?? 0;
        return {
          value: option.value,
          label: option.label,
          color: option.color,
          count,
          title: `${count} ${option.label}`,
        };
      })}
      value={value}
      onChange={(next) => onChange(next as ActivitySource[])}
    />
  );
}
