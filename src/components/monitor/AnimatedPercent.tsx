"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

export function AnimatedPercent({ value, className }: { value: number; className?: string }) {
  const count = useMotionValue(0);
  const text = useTransform(count, (latest) => `${Math.round(latest)}%`);

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.8, ease: [0.45, 0.05, 0.35, 1] });
    return () => controls.stop();
  }, [count, value]);

  return <motion.span className={className}>{text}</motion.span>;
}
