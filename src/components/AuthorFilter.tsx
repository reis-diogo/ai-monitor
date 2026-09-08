"use client";

import { motion } from "motion/react";
import { projectColor } from "@/lib/project-color";

export type AuthorFilterOption = {
  name: string;
  avatarUrl: string | null;
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0].toLowerCase();
}

export function AuthorFilter({
  authors,
  value,
  counts,
  projectsByAuthor,
  allProjects,
  onChange,
}: {
  authors: AuthorFilterOption[];
  value: string[];
  counts: Map<string, number>;
  projectsByAuthor: Map<string, string[]>;
  allProjects: string[];
  onChange: (authors: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {authors.map((author) => {
        const active = value.includes(author.name);
        const count = counts.get(author.name) ?? 0;
        const projects = projectsByAuthor.get(author.name) ?? [];

        return (
          <motion.button
            key={author.name}
            onClick={() =>
              onChange(
                active ? value.filter((a) => a !== author.name) : [...value, author.name]
              )
            }
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            title={`${author.name} — ${count} atividade${count === 1 ? "" : "s"}${
              projects.length ? ` em ${projects.join(", ")}` : ""
            }`}
            className={`flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 font-mono text-[11px] transition-colors ${
              active
                ? "border-foreground/30 bg-accent text-foreground"
                : "border-white/10 bg-card text-foreground/50 hover:text-foreground/80"
            }`}
          >
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatarUrl}
                alt=""
                className={`h-5 w-5 rounded-full object-cover transition-[filter] ${
                  active ? "" : "saturate-50"
                }`}
              />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[9px]">
                {author.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            {firstName(author.name)}
            <span className="tabular-nums opacity-55">{count}</span>
            {projects.length > 0 && (
              // Um ponto por projeto, na cor que o projeto tem na barra de cima e
              // no grafico — mostra onde a pessoa atua sem alongar a pilula.
              <span className="ml-0.5 flex shrink-0 items-center gap-0.5">
                {projects.map((project) => (
                  <span
                    key={project}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: projectColor(project, allProjects),
                      opacity: active ? 1 : 0.6,
                    }}
                  />
                ))}
              </span>
            )}
          </motion.button>
        );
      })}

    </div>
  );
}
