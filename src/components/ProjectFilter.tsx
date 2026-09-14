"use client";

import { FilterPicklist } from "@/components/FilterPicklist";
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
    <FilterPicklist
      label="projeto"
      options={projects.map((project) => {
        const count = counts.get(project) ?? 0;
        return {
          value: project,
          label: project,
          color: projectColor(project, projects),
          count,
          title: `${count} atividade${count === 1 ? "" : "s"} em ${project}`,
        };
      })}
      value={value}
      onChange={onChange}
    />
  );
}
