"use client";

import { motion } from "motion/react";

export function ProjectFilter({
  projects,
  value,
  onChange,
}: {
  projects: string[];
  value: string | null;
  onChange: (project: string | null) => void;
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
            layoutId="project-filter-pill"
            className="absolute inset-0 rounded-full bg-foreground"
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
          />
        )}
        <span className="relative">Todos os projetos</span>
      </button>

      {projects.map((project) => (
        <button
          key={project}
          onClick={() => onChange(project)}
          className={`relative rounded-full px-3 py-1.5 font-medium transition-colors ${
            value === project ? "text-background" : "text-foreground/50"
          }`}
        >
          {value === project && (
            <motion.span
              layoutId="project-filter-pill"
              className="absolute inset-0 rounded-full bg-foreground"
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
            />
          )}
          <span className="relative">{project}</span>
        </button>
      ))}
    </div>
  );
}
