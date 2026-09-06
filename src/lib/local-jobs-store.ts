import { createHash, randomBytes } from "crypto";
import { getSupabase } from "@/lib/supabase";
import type { AiProvider } from "@/lib/types";

const JOB_TTL_MS = 12 * 60 * 60 * 1000;

export type LocalJob = {
  id: string;
  provider: AiProvider;
  project: string;
  activityIds: string[];
  expiresAt: string;
};

type LocalJobRow = {
  id: string;
  provider: AiProvider;
  project: string;
  activity_ids: string[];
  expires_at: string;
  received_count: number;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createLocalJob(params: {
  provider: AiProvider;
  project: string;
  activityIds: string[];
  createdBy: string | null;
}): Promise<{ job: LocalJob; token: string }> {
  if (!params.activityIds.length) {
    throw new Error("Nenhum card pendente para delegar.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + JOB_TTL_MS).toISOString();

  const { data, error } = await getSupabase()
    .from("local_jobs")
    .insert({
      token_hash: hashToken(token),
      provider: params.provider,
      project: params.project,
      activity_ids: params.activityIds,
      created_by: params.createdBy,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Erro ao criar tarefa local: ${error.message}`);

  const row = data as LocalJobRow;
  return {
    token,
    job: {
      id: row.id,
      provider: row.provider,
      project: row.project,
      activityIds: row.activity_ids,
      expiresAt: row.expires_at,
    },
  };
}

export async function resolveLocalJob(token: string): Promise<LocalJob | null> {
  if (!token) return null;

  const { data, error } = await getSupabase()
    .from("local_jobs")
    .select("*")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error || !data) return null;

  const row = data as LocalJobRow;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  return {
    id: row.id,
    provider: row.provider,
    project: row.project,
    activityIds: row.activity_ids,
    expiresAt: row.expires_at,
  };
}

export async function markLocalJobReceived(id: string): Promise<void> {
  const { data } = await getSupabase()
    .from("local_jobs")
    .select("received_count")
    .eq("id", id)
    .maybeSingle();

  const current = (data as { received_count: number } | null)?.received_count ?? 0;
  await getSupabase()
    .from("local_jobs")
    .update({ received_count: current + 1 })
    .eq("id", id);
}
