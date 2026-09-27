import type { ClickUpStatusOption } from "@/lib/types";

export type StatusOption = { value: string; label: string; color: string };

export type PresentStatus = { value: string; color: string | null };

export const PR_PENDING_STATUS = "pr_pendente";

// Escala normalizada em oklch: mesma luminosidade (0.72) e mesmo croma (0.13) para
// todos, variando so a matiz. Antes eram nove hex escolhidos avulso, cada um com
// saturacao propria — sobre o roxo do tema antigo eles se acomodavam, sobre cinza
// neutro viraram nove pontos de atencao brigando pelo mesmo olhar.
//
// Fixar L e C e o que faz "1 bug" e "19 dev liberado" pesarem igual: a diferenca
// entre eles passa a ser o significado da matiz, nao o volume da cor.
const STATUS_COLORS: Record<string, string> = {
  "para desenvolver": "oklch(0.72 0.13 286)",
  "refinar po": "oklch(0.72 0.13 16)",
  "refinar arquiteto": "oklch(0.72 0.13 235)",
  "dev liberado": "oklch(0.72 0.13 155)",
  "dev finalizado": "oklch(0.72 0.13 185)",
  "revisar dev": "oklch(0.72 0.13 55)",
  "em qa": "oklch(0.72 0.13 85)",
  bug: "oklch(0.72 0.17 25)",
  [PR_PENDING_STATUS]: "oklch(0.72 0.13 265)",
};

const FALLBACK_COLOR = "oklch(0.72 0.02 286)";

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
