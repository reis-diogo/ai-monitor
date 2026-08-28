"use client";

import { motion } from "motion/react";

export type AuthorFilterOption = {
  name: string;
  avatarUrl: string | null;
};

export function AuthorFilter({
  authors,
  value,
  onChange,
}: {
  authors: AuthorFilterOption[];
  value: string | null;
  onChange: (author: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-full border border-black/10 bg-black/5 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
      <button
        onClick={() => onChange(null)}
        className={`relative rounded-full px-3 py-1.5 font-medium transition-colors ${
          value === null ? "text-background" : "text-foreground/50"
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

      {authors.map((author) => (
        <button
          key={author.name}
          onClick={() => onChange(author.name)}
          title={author.name}
          className="relative rounded-full p-1 transition-colors"
        >
          {value === author.name && (
            <motion.span
              layoutId="author-filter-pill"
              className="absolute inset-0 rounded-full bg-foreground"
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
            />
          )}
          {author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.avatarUrl}
              alt={author.name}
              className="relative h-6 w-6 rounded-full"
              style={{
                outline: value === author.name ? "2px solid var(--background)" : "none",
                outlineOffset: -2,
              }}
            />
          ) : (
            <span
              className={`relative flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-[9px] font-medium dark:bg-white/10 ${
                value === author.name ? "text-background" : "text-foreground/70"
              }`}
            >
              {author.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
