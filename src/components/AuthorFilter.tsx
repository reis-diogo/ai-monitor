"use client";

import { useState } from "react";
import { motion } from "motion/react";

export type AuthorFilterOption = {
  name: string;
  avatarUrl: string | null;
};

const MAX_VISIBLE = 6;

export function AuthorFilter({
  authors,
  value,
  onChange,
  max = MAX_VISIBLE,
}: {
  authors: AuthorFilterOption[];
  value: string | null;
  onChange: (author: string | null) => void;
  max?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const overflow = Math.max(0, authors.length - max);
  const visible = expanded || overflow === 0 ? authors : authors.slice(0, max);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(null)}
        className={`relative rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          value === null
            ? "border-transparent text-background"
            : "border-white/10 text-foreground/50 hover:text-foreground/80"
        }`}
      >
        {value === null && (
          <motion.span
            layoutId="author-filter-pill"
            className="absolute inset-0 rounded-full bg-foreground"
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
          />
        )}
        <span className="relative">Todos</span>
      </button>

      <motion.div layout className="flex items-center">
        {visible.map((author, index) => {
          const selected = value === author.name;
          const dimmed = value !== null && !selected;

          return (
            <motion.button
              layout
              key={author.name}
              onClick={() => onChange(selected ? null : author.name)}
              title={author.name}
              whileHover={{ scale: 1.14, y: -2 }}
              whileTap={{ scale: 1.02 }}
              animate={{ scale: selected ? 1.14 : 1, opacity: dimmed ? 0.45 : 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className={`relative rounded-full ring-2 transition-[filter] hover:z-20 ${
                index > 0 ? "-ml-2.5" : ""
              } ${selected ? "z-10 ring-primary" : "ring-card"} ${
                dimmed ? "saturate-0" : ""
              }`}
            >
              {author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={author.avatarUrl}
                  alt={author.name}
                  className="block h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-foreground/70">
                  {author.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </motion.button>
          );
        })}

        {overflow > 0 && (
          <motion.button
            layout
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? "Recolher" : `+${overflow} autores`}
            whileHover={{ scale: 1.14, y: -2 }}
            whileTap={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="relative -ml-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-foreground/70 ring-2 ring-card transition-colors hover:z-20 hover:bg-white/20"
          >
            {expanded ? "−" : `+${overflow}`}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
