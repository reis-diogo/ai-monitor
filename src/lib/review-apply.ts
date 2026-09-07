import { setCachedAnalysis } from "@/lib/analysis-cache";
import {
  createTaskChecklist,
  createTaskComment,
  deleteChecklistsNamed,
  updateTaskStatus,
} from "@/lib/clickup";
import type { AiProvider, AnalyzedActivityRecord, ReviewPayload } from "@/lib/types";

export const REVIEW_QUEUE_STATUS = "dev finalizado";
export const REVIEW_APPROVED_STATUS = "em qa";
export const REVIEW_REJECTED_STATUS = "revisar dev";
export const REVIEW_THRESHOLD = 7;

const CHECKLIST_NAME = "Pendências de revisão";

export type ReviewResultInput = {
  review: number;
  reasoning: string;
  delivered: string[];
  missing: string[];
  deviations: string[];
  fixPrompt: string;
};

function buildRejectComment(score: number, pendingCount: number): string {
  if (!pendingCount) {
    return `Revisão de entrega: ${score}/10. A entrega não corresponde à especificação. Confira o parecer no monitor antes de devolver para "${REVIEW_QUEUE_STATUS}".`;
  }

  return `Revisão de entrega: ${score}/10. Abri o checklist "${CHECKLIST_NAME}" neste card com ${pendingCount} ${
    pendingCount === 1 ? "pendência" : "pendências"
  } entre o que falta e o que divergiu da especificação. Resolva e marque todos os itens antes de devolver o card para "${REVIEW_QUEUE_STATUS}".`;
}

export async function applyReviewResult(params: {
  provider: AiProvider;
  activityId: string;
  result: ReviewResultInput;
  mentionUserIds: number[];
  existing: AnalyzedActivityRecord;
}): Promise<{
  record: AnalyzedActivityRecord;
  appliedStatus: string | null;
  statusError: string | null;
}> {
  const { result } = params;
  const approved = result.review >= REVIEW_THRESHOLD;
  const targetStatus = approved ? REVIEW_APPROVED_STATUS : REVIEW_REJECTED_STATUS;

  const pending = [
    ...result.missing.map((item) => `falta: ${item}`),
    ...result.deviations.map((item) => `desvio: ${item}`),
  ];

  let appliedStatus: string | null = null;
  let statusError: string | null = null;

  // O status vem primeiro e num try proprio: se o checklist falhar, o card ainda
  // precisa sair de "dev finalizado" — caso contrario a revisao fica gravada com
  // a nota enquanto o card aparenta nunca ter sido revisado.
  try {
    await updateTaskStatus(params.activityId, targetStatus);
    appliedStatus = targetStatus;
  } catch (error) {
    statusError = error instanceof Error ? error.message : "Erro ao aplicar status no ClickUp.";
  }

  try {
    // Sempre limpa o checklist do ciclo anterior, inclusive quando aprova ou
    // quando a reprovacao nao listou pendencias — senao ele viaja para "em qa"
    // contradizendo o parecer atual.
    await deleteChecklistsNamed(params.activityId, CHECKLIST_NAME);

    if (!approved) {
      await createTaskChecklist(
        params.activityId,
        CHECKLIST_NAME,
        pending.map((item, index) => `${String(index + 1).padStart(2, "0")}. ${item}`)
      );
      await createTaskComment(
        params.activityId,
        buildRejectComment(result.review, pending.length),
        params.mentionUserIds
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao anotar as pendências.";
    statusError = statusError ? `${statusError} | ${message}` : message;
  }

  const payload: ReviewPayload = {
    delivered: result.delivered,
    missing: result.missing,
    deviations: result.deviations,
    fixPrompt: result.fixPrompt,
    appliedStatus,
    statusError,
  };

  const record: AnalyzedActivityRecord = {
    ...params.existing,
    review: result.review,
    reviewReasoning: result.reasoning,
    reviewPayload: payload,
  };

  await setCachedAnalysis(params.provider, params.activityId, record);

  return { record, appliedStatus, statusError };
}
