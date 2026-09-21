import type { ArchitectPayload } from "@/lib/types";

export const APPROVED_STATUS = "dev liberado";
export const REFINE_STATUS = "refinar po";
export const APPROVAL_THRESHOLD = 7;

// So a nota decide. Ponto em aberto num card de nota alta e resolvido pelo proprio
// arquiteto, com base na documentacao e na org, e registrado em assumptions — devolver
// ao PO um card que ja da para construir custa dias de espera por pouca duvida.
export function architectureApproves(score: number): boolean {
  return score >= APPROVAL_THRESHOLD;
}

// Para a tela, o que o app aplicou no ClickUp e a verdade: pareceres antigos que
// foram liberados com pontos em aberto continuam liberados.
export function architectureReleased(
  score: number | null | undefined,
  payload: ArchitectPayload | null | undefined
): boolean {
  if (score === null || score === undefined) return false;
  if (payload?.appliedStatus) return payload.appliedStatus === APPROVED_STATUS;
  return architectureApproves(score);
}
