import { getCachedAnalysis, setCachedAnalysis } from "@/lib/analysis-cache";
import { createTaskChecklist, createTaskComment, updateTaskStatus } from "@/lib/clickup";
import type { AiProvider, AnalyzedActivityRecord, ArchitectPayload } from "@/lib/types";
import {
  APPROVAL_THRESHOLD,
  APPROVED_STATUS,
  REFINE_STATUS,
  VALIDATE_STATUS,
  architectureApproves,
} from "@/lib/architect-gate";

export { APPROVAL_THRESHOLD, REFINE_STATUS, VALIDATE_STATUS };
const CHECKLIST_NAME = "Pendências de arquitetura";
export const ARCHITECT_QUEUE_STATUS = "refinar arquiteto";

export type ArchitectResultInput = {
  architecture: number;
  reasoning: string;
  nativeSolution: string;
  usesCustom: boolean;
  customJustification: string;
  ambiguities: string[];
  assumptions: string[];
  metadataFindings: string[];
  docReferences: { title: string; url: string }[];
  devPrompt: string;
  research?: string;
  summary?: string;
  flow?: string[];
};

// So chega aqui card reprovado: com nota alta o arquiteto resolve os pontos sozinho.
function buildRefineComment(score: number, ambiguityCount: number): string {
  if (!ambiguityCount) {
    return `Revisão de arquitetura: ${score}/10. A atividade não tem definição suficiente para ser arquitetada. Detalhe o escopo antes de devolver para "${ARCHITECT_QUEUE_STATUS}".`;
  }

  const points = `${ambiguityCount} ${ambiguityCount === 1 ? "ponto" : "pontos"}`;

  return `Revisão de arquitetura: ${score}/10. Há ${points} que precisam ser esclarecidos antes de arquitetar. Abri o checklist "${CHECKLIST_NAME}" neste card com esses itens. Resolva e marque todos antes de devolver o card para "${ARCHITECT_QUEUE_STATUS}".`;
}

export async function applyArchitectResult(params: {
  provider: AiProvider;
  activityId: string;
  result: ArchitectResultInput;
  authorClickupId: number | null;
  existing: AnalyzedActivityRecord;
}): Promise<{ record: AnalyzedActivityRecord; appliedStatus: string | null; statusError: string | null }> {
  const { result } = params;
  const approved = architectureApproves(result.architecture);
  const targetStatus = approved ? VALIDATE_STATUS : REFINE_STATUS;

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
    assumptions: result.assumptions,
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

export type PoResultInput = Omit<ArchitectResultInput, "architecture" | "ambiguities">;

export async function applyPoResult(params: {
  provider: AiProvider;
  activityId: string;
  result: PoResultInput;
  existing: AnalyzedActivityRecord;
}): Promise<{ record: AnalyzedActivityRecord; appliedStatus: string | null; statusError: string | null }> {
  const { result } = params;

  let appliedStatus: string | null = null;
  let statusError: string | null = null;

  try {
    await updateTaskStatus(params.activityId, VALIDATE_STATUS);
    appliedStatus = VALIDATE_STATUS;
  } catch (error) {
    statusError = error instanceof Error ? error.message : "Erro ao aplicar status no ClickUp.";
  }

  const payload: ArchitectPayload = {
    nativeSolution: result.nativeSolution,
    usesCustom: result.usesCustom,
    customJustification: result.customJustification,
    ambiguities: [],
    assumptions: result.assumptions,
    metadataFindings: result.metadataFindings,
    docReferences: result.docReferences,
    devPrompt: result.devPrompt,
    research: result.research ?? "",
    ...(result.summary ? { summary: result.summary } : {}),
    ...(result.flow?.length ? { flow: result.flow } : {}),
    appliedStatus,
  };

  const record: AnalyzedActivityRecord = {
    ...params.existing,
    architecture: 10,
    architectureReasoning: result.reasoning,
    architecturePayload: payload,
  };

  await setCachedAnalysis(params.provider, params.activityId, record);

  return { record, appliedStatus, statusError };
}

export async function applyRevisionResult(params: {
  provider: AiProvider;
  activityId: string;
  existing: AnalyzedActivityRecord;
  reasoning: string;
  devPrompt: string;
  summary?: string;
  flow?: string[];
  authorClickupId?: number | null;
}): Promise<{ record: AnalyzedActivityRecord; appliedStatus: string | null; statusError: string | null }> {
  let appliedStatus: string | null = null;
  let statusError: string | null = null;

  try {
    await createTaskComment(
      params.activityId,
      `Solução revisada e aprovada pelo arquiteto. ${params.reasoning}`,
      params.authorClickupId ?? null
    );
    await updateTaskStatus(params.activityId, APPROVED_STATUS);
    appliedStatus = APPROVED_STATUS;
  } catch (error) {
    statusError = error instanceof Error ? error.message : "Erro ao aplicar status no ClickUp.";
  }

  const previous = params.existing.architecturePayload;
  const payload: ArchitectPayload = {
    nativeSolution: previous?.nativeSolution ?? "",
    usesCustom: previous?.usesCustom ?? false,
    customJustification: previous?.customJustification ?? "",
    ambiguities: [],
    assumptions: previous?.assumptions ?? [],
    metadataFindings: previous?.metadataFindings ?? [],
    docReferences: previous?.docReferences ?? [],
    research: previous?.research ?? "",
    devPrompt: params.devPrompt,
    summary: params.summary || previous?.summary,
    flow: params.flow?.length ? params.flow : previous?.flow,
    appliedStatus: appliedStatus ?? previous?.appliedStatus ?? null,
  };

  const record: AnalyzedActivityRecord = {
    ...params.existing,
    architectureReasoning: params.reasoning,
    architecturePayload: payload,
  };

  await setCachedAnalysis(params.provider, params.activityId, record);

  return { record, appliedStatus, statusError };
}
