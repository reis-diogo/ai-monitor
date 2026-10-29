"use client";

import { motion } from "motion/react";
import { Icon } from "@/components/monitor/Icon";
import { STAGES, STAGE_DONE } from "@/lib/monitor/model";

const LABELS = [...STAGES, ""];

export function PipelineSteps({
  stage,
  compact = false,
  live,
}: {
  stage: number;
  compact?: boolean;
  live?: { stage: number; node: React.ReactNode };
}) {
  const active = Boolean(live);
  const box = compact ? 24 : 30;
  const radius = compact ? 7 : 8;
  const fill = Math.min(stage, STAGE_DONE) / STAGES.length;
  const lineTop = box / 2 - 1;

  return (
    <div className="relative w-full" style={{ height: box + 22 + (live ? 26 : 0) }}>
      <div
        className="absolute h-0.5 rounded-sm bg-track"
        style={{ left: box / 2, right: box / 2, top: lineTop }}
      />
      <motion.div
        className="absolute h-0.5 rounded-sm bg-muted-foreground/50"
        style={{ left: box / 2, top: lineTop }}
        initial={false}
        animate={{ width: `calc((100% - ${box}px) * ${fill})` }}
        transition={{ duration: 0.8, ease: [0.45, 0.05, 0.35, 1] }}
      />
      {active && stage < STAGE_DONE && (
        <motion.span
          className="absolute overflow-hidden"
          style={{ top: lineTop, height: 2 }}
          initial={false}
          animate={{
            left: `calc(${box / 2}px + (100% - ${box}px) * ${stage / STAGES.length})`,
            width: `calc((100% - ${box}px) / ${STAGES.length})`,
          }}
          transition={{ duration: 0.8, ease: [0.45, 0.05, 0.35, 1] }}
        >
          <span
            className="absolute bottom-0 top-0 w-[40%]"
            style={{
              background: "linear-gradient(90deg, transparent, var(--primary), transparent)",
              animation: "monitor-flow 1.4s linear infinite",
            }}
          />
        </motion.span>
      )}
      {LABELS.map((label, index) => {
        const last = index === STAGES.length;
        const done = index < stage || (last && stage >= STAGE_DONE);
        const current = !last && index === stage;
        const left = `calc(${box / 2}px + (100% - ${box}px) * ${index / STAGES.length})`;

        return (
          <div
            key={index}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1"
            style={{ left }}
          >
            <span
              className="relative flex items-center justify-center font-bold leading-none transition-[background-color,border-color,color] duration-500"
              style={{
                width: box,
                height: box,
                borderRadius: radius,
                fontSize: compact ? 12 : 13,
                borderWidth: 2,
                borderStyle: "solid",
                animation: current && !active ? "monitor-breathe 2.8s ease-in-out infinite" : undefined,
                backgroundColor: done
                  ? last
                    ? "color-mix(in srgb, var(--ok) 22%, var(--surface-raised))"
                    : "var(--step-done-bg)"
                  : current
                    ? "color-mix(in srgb, var(--primary) 16%, var(--surface-raised))"
                    : "var(--surface-raised)",
                borderColor: done
                  ? last
                    ? "color-mix(in srgb, var(--ok) 70%, var(--surface-raised))"
                    : "var(--step-done-border)"
                  : current
                    ? "var(--primary)"
                    : last
                      ? "color-mix(in srgb, var(--ok) 38%, var(--surface-raised))"
                      : "var(--line-input)",
                color: done
                  ? last
                    ? "var(--ok)"
                    : "var(--step-done-ink)"
                  : current
                    ? "var(--foreground)"
                    : "var(--faint)",
              }}
              aria-label={last ? "concluído" : label}
            >
              {done ? (
                <Icon name="check" size={compact ? 15 : 17} className="relative" />
              ) : current ? (
                <span
                  className="relative size-2 rounded-full bg-primary"
                  style={active ? { animation: "monitor-pulse 1.8s infinite" } : undefined}
                />
              ) : null}
            </span>
            <span
              className="text-[10px] font-semibold transition-colors duration-500"
              style={{
                color: current ? "var(--foreground)" : done ? "var(--muted-foreground)" : "var(--faint)",
                minHeight: 12,
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
      {live && (
        <div
          className="absolute"
          style={{
            left: `calc(${box / 2}px + (100% - ${box}px) * ${live.stage / STAGES.length} + 22px)`,
            top: box + 2,
          }}
        >
          {live.node}
        </div>
      )}
    </div>
  );
}
