"use client";

import { motion } from "motion/react";
import type { CursorState } from "@/lib/monitor/use-cursors";

export function LiveCursors({ cursors, zoom }: { cursors: CursorState[]; zoom: number }) {
  return (
    <div className="pointer-events-none absolute left-0 top-0 z-20">
      {cursors.map((cursor) => (
        <motion.div
          key={cursor.id}
          className="absolute left-0 top-0"
          initial={{ x: cursor.x, y: cursor.y, opacity: 0 }}
          animate={{ x: cursor.x, y: cursor.y, opacity: 1 }}
          transition={{
            x: cursor.smooth
              ? { duration: 1.6, ease: [0.45, 0.05, 0.35, 1] }
              : { duration: 0.12, ease: "linear" },
            y: cursor.smooth
              ? { duration: 1.6, ease: [0.45, 0.05, 0.35, 1] }
              : { duration: 0.12, ease: "linear" },
            opacity: { duration: 0.4 },
          }}
        >
          <div style={{ transform: `scale(${1 / zoom})`, transformOrigin: "0 0" }}>
            <svg width="22" height="26" viewBox="0 0 22 26" fill="none" className="drop-shadow-md">
              <path
                d="M2 2 L2 20 L7 15.5 L10.5 23 L13.5 21.6 L10 14.5 L17 14.5 Z"
                fill={cursor.color}
                stroke="#fff"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="ml-4 -mt-1 inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-semibold text-white shadow-md"
              style={{ background: cursor.color }}
            >
              {cursor.name}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
