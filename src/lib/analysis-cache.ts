import { getSupabase } from "@/lib/supabase";
import type { AiProvider, AnalyzedActivityRecord } from "@/lib/types";

type AnalysisCacheRow = {
  provider: AiProvider;
  activity_id: string;
  source: AnalyzedActivityRecord["source"];
  intent: string;
  score: number;
  critique: string;
  author_name: string;
  author_avatar_url: string | null;
  title: string;
  url: string;
  date: string;
  location: string;
  additions: number | null;
  deletions: number | null;
  analyzed_at: string;
};

function rowToRecord(row: AnalysisCacheRow): AnalyzedActivityRecord {
  return {
    id: row.activity_id,
    source: row.source,
    intent: row.intent,
    score: row.score,
    critique: row.critique,
    provider: row.provider,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    title: row.title,
    url: row.url,
    date: row.date,
    location: row.location,
    additions: row.additions,
    deletions: row.deletions,
    analyzedAt: row.analyzed_at,
  };
}

export async function getCachedAnalysis(
  provider: AiProvider,
  id: string
): Promise<AnalyzedActivityRecord | null> {
  const { data, error } = await getSupabase()
    .from("analysis_cache")
    .select("*")
    .eq("provider", provider)
    .eq("activity_id", id)
    .maybeSingle();

  if (error) throw new Error(`Erro ao ler cache de análise: ${error.message}`);
  return data ? rowToRecord(data as AnalysisCacheRow) : null;
}

export async function setCachedAnalysis(
  provider: AiProvider,
  id: string,
  record: AnalyzedActivityRecord
): Promise<void> {
  const row: AnalysisCacheRow = {
    provider,
    activity_id: id,
    source: record.source,
    intent: record.intent,
    score: record.score,
    critique: record.critique,
    author_name: record.authorName,
    author_avatar_url: record.authorAvatarUrl,
    title: record.title,
    url: record.url,
    date: record.date,
    location: record.location,
    additions: record.additions,
    deletions: record.deletions,
    analyzed_at: record.analyzedAt,
  };

  const { error } = await getSupabase()
    .from("analysis_cache")
    .upsert(row, { onConflict: "provider,activity_id" });

  if (error) throw new Error(`Erro ao salvar cache de análise: ${error.message}`);
}

export async function listAnalyzedActivities(): Promise<AnalyzedActivityRecord[]> {
  const { data, error } = await getSupabase()
    .from("analysis_cache")
    .select("*")
    .order("analyzed_at", { ascending: false });

  if (error) throw new Error(`Erro ao listar análises: ${error.message}`);
  return (data ?? []).map((row) => rowToRecord(row as AnalysisCacheRow));
}
