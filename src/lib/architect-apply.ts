import { getCachedAnalysis, setCachedAnalysis } from "@/lib/analysis-cache";
import { createTaskChecklist, createTaskComment, updateTaskStatus } from "@/lib/clickup";
import type { AiProvider, AnalyzedActivityRecord, ArchitectPayload } from "@/lib/types";

export const APPROVED_STATUS = "dev liberado";
export const REFINE_STATUS = "refinar po";
export const APPROVAL_THRESHOLD = 7;
const CHECKLIST_NAME = "Pendências de arquitetura";
const ARCHITECT_QUEUE_STATUS = "refinar arquiteto";

export type ArchitectResultInput = {
  architecture: number;
  reasoning: string;
  nativeSolution: string;
  usesCustom: boolean;
  customJustification: string;
  ambiguities: string[];
  metadataFindings: string[];
  docReferences: { title: string; url: string }[];
  devPrompt: string;
  research?: string;
};

function buildRefineComment(score: number, ambiguityCount: number): string {
  if (!ambiguityCount) {
    return `Revisão de arquitetura: ${score}/10. A atividade não tem definição suficiente para ser arquitetada. Detalhe o escopo antes de devolver para "${ARCHITECT_QUEUE_STATUS}".`;
  }

  return `Revisão de arquitetura: ${score}/10. Abri o checklist "${CHECKLIST_NAME}" neste card com ${ambiguityCount} ${
    ambiguityCount === 1 ? "ponto" : "pontos"
  } que precisam ser esclarecidos. Resolva e marque todos os itens antes de devolver o card para "${ARCHITECT_QUEUE_STATUS}".`;
}

export async function applyArchitectResult(params: {
  provider: AiProvider;
  activityId: string;
  result: ArchitectResultInput;
  authorClickupId: number | null;
  existing: AnalyzedActivityRecord;
}): Promise<{ record: AnalyzedActivityRecord; appliedStatus: string | null; statusError: string | null }> {
  const { result } = params;
  const approved = result.architecture >= APPROVAL_THRESHOLD;
  const targetStatus = approved ? APPROVED_STATUS : REFINE_STATUS;

  let appliedStatus: string | null = null;
  let statusError: string | null = null;

  try {
    if (!approved) {
      // O checklist carrega o detalhe e vem primeiro, para o PO já encontrar os
      // itens quando ler o comentário. Numerado porque o ClickUp embaralha a
      // ordem e devolve orderindex null.
      await createTaskChecklist(
        params.activityId,
        CHECKLIST_NAME,
        result.ambiguities.map(
          (item, index) => `${String(index + 1).padStart(2, "0")}. ${item}`
        )
      );
      await createTaskComment(
        params.activityId,
        buildRefineComment(result.architecture, result.ambiguities.length),
        params.authorClickupId
      );
    }
    await updateTaskStatus(params.activityId, targetStatus);
    appliedStatus = targetStatus;
  } catch (error) {
    statusError = error instanceof Error ? error.message : "Erro ao aplicar status no ClickUp.";
  }

  const payload: ArchitectPayload = {
    nativeSolution: result.nativeSolution,
    usesCustom: result.usesCustom,
    customJustification: result.customJustification,
    ambiguities: result.ambiguities,
    metadataFindings: result.metadataFindings,
    docReferences: result.docReferences,
    devPrompt: result.devPrompt,
    research: result.research ?? "",
    appliedStatus,
  };

  const record: AnalyzedActivityRecord = {
    ...params.existing,
    architecture: result.architecture,
    architectureReasoning: result.reasoning,
    architecturePayload: payload,
  };

  await setCachedAnalysis(params.provider, params.activityId, record);

  return { record, appliedStatus, statusError };
}

export async function loadExistingAnalysis(
  provider: AiProvider,
  activityId: string
): Promise<AnalyzedActivityRecord | null> {
  return getCachedAnalysis(provider, activityId);
}
