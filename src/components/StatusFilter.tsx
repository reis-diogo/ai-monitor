"use client";

import { FilterPicklist } from "@/components/FilterPicklist";
import { STATUS_OPTIONS } from "@/lib/status-options";

export function StatusFilter({
  value,
  counts,
  onChange,
}: {
  value: string[];
  counts: Map<string, number>;
  onChange: (statuses: string[]) => void;
}) {
  return (
    <FilterPicklist
      label="status"
      options={STATUS_OPTIONS.flatMap((option) => {
        const count = counts.get(option.value) ?? 0;
        if (count === 0 && !value.includes(option.value)) return [];
        return [
          {
            value: option.value,
            label: option.label.toLowerCase(),
            color: option.color,
            count,
            title: `${count} em "${option.label.toLowerCase()}"`,
          },
        ];
      })}
      value={value}
      onChange={onChange}
    />
  );
}
