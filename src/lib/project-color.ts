const PALETTE = [
  "#FE2B77",
  "#8B5CF6",
  "#22c55e",
  "#eab308",
  "#38bdf8",
  "#f97316",
  "#a855f7",
  "#14b8a6",
  "#f43f5e",
  "#0ea5e9",
];

/**
 * Cor de um projeto, derivada da posição dele na lista ordenada de todos os
 * projetos. Precisa ser assim, e não pela ordem de aparição dos dados: senão
 * trocar o filtro de data muda a cor do projeto no gráfico.
 */
export function projectColor(name: string, orderedProjects: string[]): string {
  const index = orderedProjects.indexOf(name);
  return PALETTE[(index < 0 ? 0 : index) % PALETTE.length];
}
