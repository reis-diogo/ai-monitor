import type { ClickUpStatusOption } from "@/lib/types";

export type StatusOption = { value: string; label: string; color: string };

export type PresentStatus = { value: string; color: string | null };

export const PR_PENDING_STATUS = "pr_pendente";

// Cores da tela para os status que ja tinham identidade aqui. O que o ClickUp
// trouxer alem destes entra com a cor que ele mesmo devolve.
const STATUS_COLORS: Record<string, string> = {
  "para desenvolver": "#a78bfa",
  "refinar po": "#fb7185",
  "refinar arquiteto": "#38bdf8",
  "dev liberado": "#34d399",
  "dev finalizado": "#2dd4bf",
  "revisar dev": "#fb923c",
  "em qa": "#fbbf24",
  bug: "#f87171",
  [PR_PENDING_STATUS]: "#818cf8",
};

const FALLBACK_COLOR = "#a1a1aa";

// Vocabulario de status da tela: a lista do ClickUp, na ordem dela, mais o que
// aparecer nos cards sem constar na lista (status renomeado), mais o pseudo-status
// de PR pendente por ultimo. Status novo na lista entra sem mexer no codigo.
export function buildStatusOptions(
  clickupStatuses: ClickUpStatusOption[],
  present: PresentStatus[] = []
): StatusOption[] {
  const options = new Map<string, StatusOption>();

  for (const status of clickupStatuses) {
    const value = status.status.toLowerCase();
    options.set(value, {
      value,
      label: value,
      color: STATUS_COLORS[value] ?? status.color ?? FALLBACK_COLOR,
    });
  }

  for (const status of present) {
    const value = status.value.toLowerCase();
    if (options.has(value)) continue;
    options.set(value, {
      value,
      label: value,
      color: STATUS_COLORS[value] ?? status.color ?? FALLBACK_COLOR,
    });
  }

  options.set(PR_PENDING_STATUS, {
    value: PR_PENDING_STATUS,
    label: "PR pendente",
    color: STATUS_COLORS[PR_PENDING_STATUS],
  });

  return Array.from(options.values());
}
