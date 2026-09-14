"use client";

import { FilterPicklist } from "@/components/FilterPicklist";
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
    <FilterPicklist
      label="pessoa"
      allLabel="todas"
      options={authors.map((author) => {
        const count = counts.get(author.name) ?? 0;
        const projects = projectsByAuthor.get(author.name) ?? [];
        return {
          value: author.name,
          label: firstName(author.name),
          avatarUrl: author.avatarUrl,
          dots: projects.map((project) => projectColor(project, allProjects)),
          count,
          title: `${author.name} — ${count} atividade${count === 1 ? "" : "s"}${
            projects.length ? ` em ${projects.join(", ")}` : ""
          }`,
        };
      })}
      value={value}
      onChange={onChange}
    />
  );
}
