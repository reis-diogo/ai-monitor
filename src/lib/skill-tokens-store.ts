import { createHash, randomBytes } from "crypto";
import { getSupabase } from "@/lib/supabase";

export type SkillToken = {
  id: string;
  ownerEmail: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

type SkillTokenRow = {
  id: string;
  owner_email: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toSkillToken(row: SkillTokenRow): SkillToken {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    label: row.label,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

// O token so existe em claro aqui, no retorno. Depois disso fica so o hash: quem
// perder o texto gera outro, ninguem recupera o antigo.
export async function createSkillToken(params: {
  ownerEmail: string;
  label: string | null;
}): Promise<{ token: string; record: SkillToken }> {
  const token = randomBytes(32).toString("base64url");

  const { data, error } = await getSupabase()
    .from("skill_tokens")
    .insert({
      token_hash: hashToken(token),
      owner_email: params.ownerEmail,
      label: params.label,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Erro ao criar o token da skill: ${error.message}`);

  return { token, record: toSkillToken(data as SkillTokenRow) };
}

export async function resolveSkillToken(token: string): Promise<SkillToken | null> {
  if (!token) return null;

  const { data, error } = await getSupabase()
    .from("skill_tokens")
    .select("*")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error || !data) return null;

  const row = data as SkillTokenRow;
  if (row.revoked_at) return null;

  await getSupabase()
    .from("skill_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return toSkillToken(row);
}

export async function listSkillTokens(ownerEmail: string): Promise<SkillToken[]> {
  const { data, error } = await getSupabase()
    .from("skill_tokens")
    .select("*")
    .eq("owner_email", ownerEmail)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao listar os tokens da skill: ${error.message}`);

  return ((data ?? []) as SkillTokenRow[]).map(toSkillToken);
}

// Revogar marca em vez de apagar: o registro de quando existiu e quando foi cortado
// vale mais do que a linha a menos.
export async function revokeSkillToken(id: string, ownerEmail: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("skill_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_email", ownerEmail)
    .is("revoked_at", null)
    .select("id");

  if (error) throw new Error(`Erro ao revogar o token: ${error.message}`);

  return !!data?.length;
}
