/**
 * Vocabulário de status da tela. Único lugar onde a lista existe — as tags de
 * filtro e os chips de projeto leem daqui, então um status novo aparece nos dois
 * sem risco de divergirem.
 *
 * "pr_pendente" não é status do ClickUp: vem de haver PR aberto no projeto do
 * item. Por isso tem cor própria (índigo) em vez do azul do arquiteto.
 */
export const STATUS_OPTIONS = [
  { value: "bug", label: "Bug", color: "#f87171" },
  { value: "dev finalizado", label: "Dev finalizado", color: "#2dd4bf" },
  { value: "dev liberado", label: "Dev liberado", color: "#34d399" },
  { value: "em qa", label: "Em QA", color: "#fbbf24" },
  { value: "pr_pendente", label: "PR pendente", color: "#818cf8" },
  { value: "refinar arquiteto", label: "Refinar arquiteto", color: "#38bdf8" },
  { value: "refinar po", label: "Refinar PO", color: "#fb7185" },
  { value: "revisar dev", label: "Revisar dev", color: "#fb923c" },
];
