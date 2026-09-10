import { createHash, randomBytes } from "crypto";
import { getSupabase } from "@/lib/supabase";
import type { AiProvider } from "@/lib/types";

const JOB_TTL_MS = 12 * 60 * 60 * 1000;

export type LocalJobKind = "architect" | "review" | "dev";

export type LocalJob = {
  id: string;
  provider: AiProvider;
  project: string;
  activityIds: string[];
  kind: LocalJobKind;
  receivedIds: string[];
  mentionEmails: string[];
  expiresAt: string;
};

type LocalJobRow = {
  id: string;
  provider: AiProvider;
  project: string;
  activity_ids: string[];
  expires_at: string;
  received_count: number;
  kind: LocalJobKind;
  received_ids: string[];
  mention_emails: string[] | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createLocalJob(params: {
  provider: AiProvider;
  project: string;
  activityIds: string[];
  createdBy: string | null;
  kind: LocalJobKind;
  mentionEmails: string[];
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
      kind: params.kind,
      mention_emails: params.mentionEmails,
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
      kind: row.kind,
      receivedIds: row.received_ids ?? [],
      mentionEmails: row.mention_emails ?? [],
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
    kind: row.kind,
    receivedIds: row.received_ids ?? [],
    mentionEmails: row.mention_emails ?? [],
    expiresAt: row.expires_at,
  };
}

export async function markLocalJobReceived(id: string, activityId: string): Promise<void> {
  const { data } = await getSupabase()
    .from("local_jobs")
    .select("received_count, received_ids")
    .eq("id", id)
    .maybeSingle();

  const row = data as { received_count: number; received_ids: string[] | null } | null;
  const receivedIds = row?.received_ids ?? [];

  await getSupabase()
    .from("local_jobs")
    .update({
      received_count: (row?.received_count ?? 0) + 1,
      received_ids: receivedIds.includes(activityId) ? receivedIds : [...receivedIds, activityId],
    })
    .eq("id", id);
}
