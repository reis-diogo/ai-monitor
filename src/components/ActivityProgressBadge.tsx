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

export function ActivityProgressBadge({
  progress,
  label,
  onClick,
}: {
  progress: ActivityProgress;
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const failed = progress.state === "failed";
  const color = failed ? FAILED_COLOR : KIND_COLOR[progress.kind];

  const title = `${KIND_LABEL[progress.kind]}${failed ? " (parou)" : ""}${
    progress.detail ? ` — ${progress.detail}` : ""
  }`;

  const Tag = onClick ? motion.button : motion.span;

  return (
    <Tag
      onClick={onClick}
      title={title}
      // O brilho respira junto com o ponto: a pilula inteira precisa chamar atencao
      // numa tabela longa, nao so o marcador de 6px.
      animate={
        failed
          ? {}
          : {
              boxShadow: [
                `0 0 0 0 ${color}00`,
                `0 0 12px 1px ${color}59`,
                `0 0 0 0 ${color}00`,
              ],
            }
      }
      transition={failed ? undefined : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
      className="relative flex items-center gap-1.5 overflow-hidden rounded-full border px-2 py-0.5 font-mono text-[10px] whitespace-nowrap"
      style={{
        borderColor: `${color}59`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, var(--card))`,
        color,
      }}
    >
      <motion.span
        aria-hidden
        animate={failed ? { opacity: 1 } : { opacity: [1, 0.15, 1], scale: [1, 0.75, 1] }}
        transition={
          failed ? undefined : { repeat: Infinity, duration: 1.3, ease: "easeInOut" }
        }
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />

      {label && <span className="shrink-0 font-medium opacity-80">{label}</span>}

      {progress.stage}

      {!failed && (
        <motion.span
          aria-hidden
          initial={{ x: "-160%" }}
          animate={{ x: "460%" }}
          transition={{ repeat: Infinity, duration: 1.9, ease: "linear" }}
          className="pointer-events-none absolute inset-y-0 w-1/4"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}2e, transparent)`,
          }}
        />
      )}
    </Tag>
  );
}
