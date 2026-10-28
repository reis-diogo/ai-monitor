"use client";

import { useEffect, useRef } from "react";
import { animate, AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";

const SPRING = { type: "spring" as const, stiffness: 380, damping: 34 };

export function PulseDot({
  color,
  size = 6,
  live = true,
  style,
}: {
  color: string;
  size?: number;
  live?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <motion.span
      animate={live ? { opacity: [1, 0.25] } : { opacity: 1 }}
      transition={live ? { duration: 0.8, repeat: Infinity, repeatType: "reverse" } : undefined}
      style={{ width: size, height: size, borderRadius: "50%", background: color, ...style }}
    />
  );
}

export function AnimatedCount({
  value,
  format,
  fromZero,
  style,
}: {
  value: number;
  format: (n: number) => string;
  fromZero: boolean;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const source = useMotionValue(fromZero ? 0 : value);
  const spring = useSpring(source, { stiffness: 70, damping: 18 });
  const previous = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = format(spring.get());
    return spring.on("change", (v) => {
      el.textContent = format(v);
    });
  }, [spring, format]);

  useEffect(() => {
    source.set(value);
    const el = ref.current;
    if (el && value > previous.current) {
      const base = getComputedStyle(el).color;
      const run = getComputedStyle(el).getPropertyValue("--run").trim() || base;
      animate(el, { color: [run, base] }, { duration: 0.9, ease: "easeOut" });
    }
    previous.current = value;
  }, [source, value]);

  return <span ref={ref} style={style} />;
}

export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="c"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ height: SPRING, opacity: { duration: 0.18 } }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="m"
          initial={{ opacity: 1 }}
          exit={{ opacity: 1, transition: { duration: 0.2 } }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ position: "absolute", inset: 0, background: "var(--overlay)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={SPRING}
            style={{ position: "relative", maxWidth: "100%", maxHeight: "100%", display: "flex" }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Dropdown({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="d"
          initial={{ opacity: 1 }}
          exit={{ opacity: 1, transition: { duration: 0.15 } }}
        >
          <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.14 }}
            style={{ position: "relative", zIndex: 21, transformOrigin: "top right" }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const icon = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  style: { flex: "none" as const },
};

export function Svg({ size = 16, strokeWidth = 2, children }: { size?: number; strokeWidth?: number; children: React.ReactNode }) {
  return (
    <svg {...icon} width={size} height={size} strokeWidth={strokeWidth}>
      {children}
    </svg>
  );
}
