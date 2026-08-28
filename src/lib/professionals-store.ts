import { getSupabase } from "@/lib/supabase";
import type { Professional, ProfessionalRole } from "@/lib/types";

type ProfessionalRow = {
  author_name: string;
  role: ProfessionalRole;
  clickup_email: string | null;
  avatar_url: string | null;
  aliases: string[];
};

function rowToProfessional(row: ProfessionalRow): Professional {
  return {
    authorName: row.author_name,
    role: row.role,
    ...(row.clickup_email ? { clickupEmail: row.clickup_email } : {}),
    ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
    ...(row.aliases && row.aliases.length > 0 ? { aliases: row.aliases } : {}),
  };
}

export async function getProfessionals(): Promise<Professional[]> {
  const { data, error } = await getSupabase().from("professionals").select("*");
  if (error) throw new Error(`Erro ao listar profissionais: ${error.message}`);
  return (data ?? []).map((row) => rowToProfessional(row as ProfessionalRow));
}

export async function upsertProfessional(params: {
  authorName: string;
  role: ProfessionalRole;
  clickupEmail?: string;
  avatarUrl?: string;
}): Promise<Professional[]> {
  const { data: existing } = await getSupabase()
    .from("professionals")
    .select("*")
    .eq("author_name", params.authorName)
    .maybeSingle();

  const row = {
    author_name: params.authorName,
    role: params.role,
    clickup_email: params.clickupEmail ?? (existing as ProfessionalRow | null)?.clickup_email ?? null,
    avatar_url: params.avatarUrl ?? (existing as ProfessionalRow | null)?.avatar_url ?? null,
    aliases: (existing as ProfessionalRow | null)?.aliases ?? [],
  };

  const { error } = await getSupabase()
    .from("professionals")
    .upsert(row, { onConflict: "author_name" });

  if (error) throw new Error(`Erro ao salvar profissional: ${error.message}`);
  return getProfessionals();
}

export async function ensurePoFromClickupEmail(email: string, name: string): Promise<void> {
  const list = await getProfessionals();
  const alreadyRegistered = list.some(
    (p) => p.clickupEmail?.toLowerCase() === email.toLowerCase()
  );
  if (alreadyRegistered) return;

  const { error } = await getSupabase().from("professionals").insert({
    author_name: name,
    role: "po",
    clickup_email: email,
    aliases: [name],
  });

  if (error) throw new Error(`Erro ao criar PO automaticamente: ${error.message}`);
}

export async function addAlias(authorName: string, alias: string): Promise<Professional[]> {
  const { data: existing, error: existingError } = await getSupabase()
    .from("professionals")
    .select("aliases")
    .eq("author_name", authorName)
    .maybeSingle();

  if (existingError) throw new Error(`Erro ao verificar profissional: ${existingError.message}`);
  if (!existing) {
    throw new Error("Classifique essa pessoa antes de adicionar um apelido.");
  }

  const aliases = new Set(
    ((existing as { aliases: string[] }).aliases ?? []).map((a) => a.toLowerCase())
  );
  aliases.add(alias.toLowerCase());

  const { error } = await getSupabase()
    .from("professionals")
    .update({ aliases: Array.from(aliases) })
    .eq("author_name", authorName);

  if (error) throw new Error(`Erro ao adicionar apelido: ${error.message}`);
  return getProfessionals();
}

export async function removeAlias(authorName: string, alias: string): Promise<Professional[]> {
  const { data: existing, error: existingError } = await getSupabase()
    .from("professionals")
    .select("aliases")
    .eq("author_name", authorName)
    .maybeSingle();

  if (existingError) throw new Error(`Erro ao verificar profissional: ${existingError.message}`);

  if (existing) {
    const aliases = ((existing as { aliases: string[] }).aliases ?? []).filter(
      (a) => a.toLowerCase() !== alias.toLowerCase()
    );

    const { error } = await getSupabase()
      .from("professionals")
      .update({ aliases })
      .eq("author_name", authorName);

    if (error) throw new Error(`Erro ao remover apelido: ${error.message}`);
  }

  return getProfessionals();
}
