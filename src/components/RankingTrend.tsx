"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import type { TrendPoint } from "@/lib/trend";
import { scoreColor } from "@/lib/score-color";

const MIN_WIDTH = 8;
const MAX_WIDTH = 26;
const WAVE_RANGE = 90;

function TrendBar({
  point,
  index,
  mouseX,
  maxCount,
  onSelectPoint,
}: {
  point: TrendPoint;
  index: number;
  mouseX: MotionValue<number>;
  maxCount: number;
  onSelectPoint: (point: TrendPoint) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const hasData = point.averageScore !== null;
  const heightPercent = hasData ? (point.averageScore! / 10) * 100 : 0;
  const color = hasData ? scoreColor(point.averageScore!).color : "var(--muted)";
  const widthPx = hasData
    ? MIN_WIDTH + (point.count / maxCount) * (MAX_WIDTH - MIN_WIDTH)
    : MIN_WIDTH;

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return Infinity;
    return val - (bounds.x + bounds.width / 2);
  });

  const rawScale = useTransform(distance, [-WAVE_RANGE, 0, WAVE_RANGE], [1, 1.28, 1]);
  const scale = useSpring(rawScale, { mass: 0.3, stiffness: 200, damping: 12 });

  return (
    <motion.button
      ref={ref}
      onClick={() => hasData && onSelectPoint(point)}
      disabled={!hasData}
      style={{ scale, transformOrigin: "bottom center" }}
      className="flex shrink-0 flex-col items-center gap-1 disabled:cursor-default"
      title={hasData ? `${point.count} atividade${point.count > 1 ? "s" : ""}` : undefined}
    >
      <span className="font-mono text-[9px] text-black/40 dark:text-white/40">
        {hasData ? point.averageScore!.toFixed(1) : "—"}
      </span>
      <div
        className="flex h-10 shrink-0 items-end justify-center overflow-hidden rounded bg-black/5 dark:bg-white/5"
        style={{ width: MAX_WIDTH }}
      >
        <motion.div
          initial={{ height: 0, width: MIN_WIDTH }}
          animate={{ height: hasData ? `${heightPercent}%` : "4px", width: widthPx }}
          transition={{ delay: index * 0.03, type: "spring", stiffness: 220, damping: 24 }}
          className="rounded"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="whitespace-nowrap text-[9px] text-black/30 dark:text-white/30">{point.label}</span>
      <span className="text-[8px] text-black/20 dark:text-white/20">{hasData ? `${point.count}x` : ""}</span>
    </motion.button>
  );
}

export function RankingTrend({
  points,
  onSelectPoint,
}: {
  points: TrendPoint[];
  onSelectPoint: (point: TrendPoint) => void;
}) {
  const mouseX = useMotionValue(Infinity);
  const maxCount = Math.max(1, ...points.map((p) => p.count));

  return (
    <div
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="flex items-end gap-2 overflow-x-auto px-1 pt-7 pb-1"
    >
      {points.map((point, i) => (
        <TrendBar
          key={point.key}
          point={point}
          index={i}
          mouseX={mouseX}
          maxCount={maxCount}
          onSelectPoint={onSelectPoint}
        />
      ))}
    </div>
  );
}
