"use client";

import { motion } from "motion/react";

const LINES = [
  { color: "#a974ff", width: 0.55, delay: 0 },
  { color: "#8b949e", width: 0.85, delay: 0.5 },
  { color: "#6fdc9d", width: 0.7, delay: 1.0 },
  { color: "#8b949e", width: 0.4, delay: 1.5 },
];

export function MiniLaptop({ label, failed = false }: { label: string; failed?: boolean }) {
  return (
    <motion.div
      role="img"
      aria-label={label}
      title={label}
      className="flex w-[58px] flex-col items-center"
      initial={{ opacity: 0, y: 4, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.45, 0.05, 0.35, 1] }}
    >
      <motion.div
        className="flex h-[30px] w-[46px] flex-col justify-center gap-[3px] rounded-[4px] border-2 bg-[#0b0d10] px-[5px]"
        style={{ borderColor: failed ? "#e5524b" : "#3a414b" }}
        animate={
          failed
            ? undefined
            : {
                boxShadow: [
                  "0 0 0 0 rgba(169,116,255,0)",
                  "0 0 8px 1px rgba(169,116,255,0.45)",
                  "0 0 0 0 rgba(169,116,255,0)",
                ],
              }
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {LINES.map((line, index) => (
          <div key={index} className="relative h-[2px] w-full">
            {failed ? (
              <span
                className="absolute left-0 top-0 h-full rounded-full bg-[#ff8a80]"
                style={{ width: `${line.width * 70}%` }}
              />
            ) : (
              <motion.span
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ background: line.color }}
                animate={{ width: ["0%", `${line.width * 100}%`, `${line.width * 100}%`, "0%"] }}
                transition={{
                  duration: 4,
                  times: [0, 0.35, 0.85, 1],
                  delay: line.delay,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}
          </div>
        ))}
      </motion.div>
      <div className="relative h-[4px] w-[58px] rounded-b-[4px] bg-[#3a414b]">
        <span className="absolute left-1/2 top-0 h-[1.5px] w-[10px] -translate-x-1/2 rounded-b-sm bg-[#252a31]" />
      </div>
    </motion.div>
  );
}
