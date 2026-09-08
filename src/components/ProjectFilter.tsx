"use client";

import { motion } from "motion/react";
import { projectColor } from "@/lib/project-color";

export function ProjectFilter({
  projects,
  value,
  counts,
  onChange,
}: {
  projects: string[];
  value: string[];
  counts: Map<string, number>;
  onChange: (projects: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {projects.map((project) => {
        const active = value.includes(project);
        const color = projectColor(project, projects);
        const count = counts.get(project) ?? 0;

        return (
          <motion.button
            key={project}
            onClick={() =>
              onChange(active ? value.filter((p) => p !== project) : [...value, project])
            }
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            title={`${count} atividade${count === 1 ? "" : "s"} em ${project}`}
            className="flex items-baseline gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors"
            style={{
              borderColor: active ? `${color}80` : `${color}24`,
              backgroundColor: active
                ? `color-mix(in srgb, ${color} 14%, var(--card))`
                : "var(--card)",
              color: active ? color : `${color}a6`,
            }}
          >
            {project}
            <span className="tabular-nums" style={{ opacity: 0.6 }}>
              {count}
            </span>
          </motion.button>
        );
      })}

    </div>
  );
}
