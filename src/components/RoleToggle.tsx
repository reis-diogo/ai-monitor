"use client";

import { LayoutGroup, motion } from "motion/react";
import type { ProfessionalRole } from "@/lib/types";

const OPTIONS: { value: ProfessionalRole; label: string }[] = [
  { value: "dev", label: "Dev" },
  { value: "po", label: "PO" },
];

export function RoleToggle({
  groupId,
  value,
  onChange,
}: {
  groupId: string;
  value: ProfessionalRole | null;
  onChange: (role: ProfessionalRole) => void;
}) {
  return (
    <LayoutGroup id={groupId}>
      <div className="inline-flex rounded-full border border-border bg-muted p-0.5 text-xs">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`relative rounded-full px-3 py-1 font-medium transition-colors ${
              value === option.value ? "text-primary-foreground" : "text-foreground/50"
            }`}
          >
            {value === option.value && (
              <motion.span
                layoutId="role-pill"
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
