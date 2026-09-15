import type { ArchitectPayload } from "@/lib/types";

export const APPROVED_STATUS = "dev liberado";
export const REFINE_STATUS = "refinar po";
export const APPROVAL_THRESHOLD = 7;

export function architectureApproves(score: number, ambiguities: string[]): boolean {
  return score >= APPROVAL_THRESHOLD && ambiguities.length === 0;
}

// Para a tela, o que o app aplicou no ClickUp e a verdade: pareceres antigos que
// foram liberados com pontos em aberto continuam liberados.
export function architectureReleased(
  score: number | null | undefined,
  payload: ArchitectPayload | null | undefined
): boolean {
  if (score === null || score === undefined) return false;
  if (payload?.appliedStatus) return payload.appliedStatus === APPROVED_STATUS;
  return architectureApproves(score, payload?.ambiguities ?? []);
}
