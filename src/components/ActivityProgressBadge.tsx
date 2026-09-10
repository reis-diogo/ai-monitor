"use client";

import { motion } from "motion/react";
import type { ActivityProgress } from "@/lib/types";

// Mesma cor do badge que cada etapa produz, para o indicador ao vivo e o resultado
// dela lerem como a mesma coisa em dois momentos.
const KIND_COLOR: Record<ActivityProgress["kind"], string> = {
  architect: "#38BDF8",
  dev: "#FBBF24",
  review: "#2DD4BF",
};

const FAILED_COLOR = "#F87171";

const KIND_LABEL: Record<ActivityProgress["kind"], string> = {
  architect: "arquiteto",
  dev: "dev",
  review: "revisor",
};

export function ActivityProgressBadge({ progress }: { progress: ActivityProgress }) {
  const failed = progress.state === "failed";
  const color = failed ? FAILED_COLOR : KIND_COLOR[progress.kind];

  return (
    <span
      title={`${KIND_LABEL[progress.kind]}${failed ? " (parou)" : ""}${
        progress.detail ? ` — ${progress.detail}` : ""
      }`}
      className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] whitespace-nowrap"
      style={{
        borderColor: `${color}40`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, var(--card))`,
        color,
      }}
    >
      <motion.span
        aria-hidden
        animate={failed ? { opacity: 1 } : { opacity: [1, 0.2, 1] }}
        transition={failed ? { duration: 0 } : { repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {progress.stage}
    </span>
  );
}
