import { getSupabase } from "@/lib/supabase";
import type { AiProvider, AnalyzedProjectRecord } from "@/lib/types";

type ProjectAnalysisCacheRow = {
  provider: AiProvider;
  project_id: string;
  project_name: string;
  score: number;
  critique: string;
  missing_topics: string[];
  out_of_scope_work: string[];
  over_delivery: string[];
  commit_count: number;
  analyzed_at: string;
};

function rowToRecord(row: ProjectAnalysisCacheRow): AnalyzedProjectRecord {
  return {
    provider: row.provider,
    projectId: row.project_id,
    projectName: row.project_name,
    score: row.score,
    critique: row.critique,
    missingTopics: row.missing_topics,
    outOfScopeWork: row.out_of_scope_work,
    overDelivery: row.over_delivery,
    commitCount: row.commit_count,
    analyzedAt: row.analyzed_at,
  };
}

export async function getCachedProjectAnalysis(
  provider: AiProvider,
  projectId: string
): Promise<AnalyzedProjectRecord | null> {
  const { data, error } = await getSupabase()
    .from("project_analysis_cache")
    .select("*")
    .eq("provider", provider)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao ler cache de análise de projeto: ${error.message}`);
  return data ? rowToRecord(data as ProjectAnalysisCacheRow) : null;
}

export async function setCachedProjectAnalysis(
  provider: AiProvider,
  projectId: string,
  record: AnalyzedProjectRecord
): Promise<void> {
  const row: ProjectAnalysisCacheRow = {
    provider,
    project_id: projectId,
    project_name: record.projectName,
    score: record.score,
    critique: record.critique,
    missing_topics: record.missingTopics,
    out_of_scope_work: record.outOfScopeWork,
    over_delivery: record.overDelivery,
    commit_count: record.commitCount,
    analyzed_at: record.analyzedAt,
  };

  const { error } = await getSupabase()
    .from("project_analysis_cache")
    .upsert(row, { onConflict: "provider,project_id" });

  if (error) throw new Error(`Erro ao salvar cache de análise de projeto: ${error.message}`);
}

export async function listProjectAnalyses(): Promise<AnalyzedProjectRecord[]> {
  const { data, error } = await getSupabase()
    .from("project_analysis_cache")
    .select("*")
    .order("analyzed_at", { ascending: false });

  if (error) throw new Error(`Erro ao listar análises de projeto: ${error.message}`);
  return (data ?? []).map((row) => rowToRecord(row as ProjectAnalysisCacheRow));
}

export async function removeProjectAnalyses(projectId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("project_analysis_cache")
    .delete()
    .eq("project_id", projectId);

  if (error) throw new Error(`Erro ao remover análises do projeto: ${error.message}`);
}
