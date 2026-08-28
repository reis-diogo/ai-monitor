"use client";

import { interpolate } from "flubber";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { scoreColor } from "@/lib/score-color";

const SHAPES = ["M4 8H20L12 18Z", "M4 11H20V13H4Z", "M4 16H20L12 6Z"];

function tierForScore(score: number): number {
  if (score >= 7) return 2;
  if (score >= 4) return 1;
  return 0;
}

export function ScoreIcon({ score, size = 14 }: { score: number; size?: number }) {
  const tier = tierForScore(score);
  const progress = useMotionValue(tier);
  const path = useTransform(progress, [0, 1, 2], SHAPES, {
    mixer: (a, b) => interpolate(a, b, { maxSegmentLength: 0.5 }),
  });

  useEffect(() => {
    const controls = animate(progress, tier, { duration: 0.5, ease: "easeInOut" });
    return () => controls.stop();
  }, [tier, progress]);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <motion.path d={path} fill={scoreColor(score).color} />
    </svg>
  );
}
