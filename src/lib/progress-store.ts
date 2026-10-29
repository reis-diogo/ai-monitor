import { getSupabase } from "@/lib/supabase";
import type { ActivityProgress, ProgressKind } from "@/lib/types";

// Uma etapa que ficou sem noticia por tanto tempo nao esta rodando: a IA local
// caiu, o usuario fechou o terminal ou o prompt foi abandonado. Sem esse corte a
// linha piscaria "arquitetando" para sempre.
const PROGRESS_TTL_MS = 30 * 60 * 1000;

const MAX_STAGE_LENGTH = 80;
const MAX_DETAIL_LENGTH = 240;

type ProgressRow = {
  activity_id: string;
  kind: ProgressKind;
  stage: string;
  detail: string | null;
  percent?: number | null;
  started_at?: string | null;
  state: string;
  updated_at: string;
};

function toProgress(row: ProgressRow): ActivityProgress {
  return {
    activityId: row.activity_id,
    kind: row.kind,
    stage: row.stage,
    detail: row.detail,
    percent: typeof row.percent === "number" ? row.percent : null,
    startedAt: row.started_at ?? null,
    state: row.state === "failed" ? "failed" : "running",
    updatedAt: row.updated_at,
  };
}

export async function recordProgress(params: {
  activityId: string;
  kind: ProgressKind;
  stage: string;
  detail: string | null;
  percent?: number | null;
  state: "running" | "failed";
}): Promise<void> {
  const row = {
    activity_id: params.activityId,
    kind: params.kind,
    stage: params.stage.slice(0, MAX_STAGE_LENGTH),
    detail: params.detail ? params.detail.slice(0, MAX_DETAIL_LENGTH) : null,
    state: params.state,
    updated_at: new Date().toISOString(),
  };

  const { data: previous } = await getSupabase()
    .from("activity_progress")
    .select("kind, started_at, updated_at")
    .eq("activity_id", params.activityId)
    .maybeSingle();

  const continuing =
    previous &&
    previous.kind === params.kind &&
    previous.started_at &&
    Date.now() - new Date(previous.updated_at).getTime() < PROGRESS_TTL_MS;
  const startedAt = continuing ? previous.started_at : row.updated_at;

  let { error } = await getSupabase()
    .from("activity_progress")
    .upsert(
      { ...row, percent: params.percent ?? null, started_at: startedAt },
      { onConflict: "activity_id" }
    );

  if (error) {
    ({ error } = await getSupabase()
      .from("activity_progress")
      .upsert(row, { onConflict: "activity_id" }));
  }

  if (error) throw new Error(`Erro ao registrar o progresso: ${error.message}`);
}

// Concluir apaga a linha em vez de marcar "done": o resultado ja aparece como
// badge de nota, entao um indicador de etapa concluida so competiria com ele.
export async function clearProgress(activityId: string): Promise<void> {
  await getSupabase().from("activity_progress").delete().eq("activity_id", activityId);
}

// Sem ids devolve tudo o que esta correndo agora. Sao poucas linhas — so os cards
// com uma IA local trabalhando neles — e evita mandar a lista inteira de atividades
// na query string so para descobrir que nenhuma delas tem etapa em andamento.
export async function fetchProgress(activityIds?: string[]): Promise<ActivityProgress[]> {
  const since = new Date(Date.now() - PROGRESS_TTL_MS).toISOString();

  let query = getSupabase().from("activity_progress").select("*").gte("updated_at", since);
  if (activityIds?.length) query = query.in("activity_id", activityIds);

  const { data, error } = await query;

  if (error) throw new Error(`Erro ao ler o progresso: ${error.message}`);

  return ((data ?? []) as ProgressRow[]).map(toProgress);
}
