import { getSupabase } from "@/lib/supabase";
import type { RegisteredRepo } from "@/lib/types";

type RepoRow = {
  id: string;
  owner: string;
  name: string;
  url: string;
  added_at: string;
};

function rowToRepo(row: RepoRow): RegisteredRepo {
  return { id: row.id, owner: row.owner, name: row.name, url: row.url, addedAt: row.added_at };
}

export async function getRepos(): Promise<RegisteredRepo[]> {
  const { data, error } = await getSupabase()
    .from("repos")
    .select("*")
    .order("added_at", { ascending: true });

  if (error) throw new Error(`Erro ao listar repositórios: ${error.message}`);
  return (data ?? []).map((row) => rowToRepo(row as RepoRow));
}

export function parseRepoUrl(input: string): { owner: string; name: string } | null {
  const trimmed = input.trim();

  const shorthandMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shorthandMatch) {
    return { owner: shorthandMatch[1], name: shorthandMatch[2].replace(/\.git$/, "") };
  }

  try {
    const url = new URL(trimmed);
    if (!url.hostname.includes("github.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], name: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

export async function addRepo(input: string): Promise<RegisteredRepo> {
  const parsed = parseRepoUrl(input);
  if (!parsed) {
    throw new Error("Link de repositório inválido. Use uma URL do GitHub ou o formato owner/repo.");
  }

  const repos = await getRepos();
  const alreadyExists = repos.some(
    (r) =>
      r.owner.toLowerCase() === parsed.owner.toLowerCase() &&
      r.name.toLowerCase() === parsed.name.toLowerCase()
  );
  if (alreadyExists) {
    throw new Error("Esse repositório já está cadastrado.");
  }

  const { data, error } = await getSupabase()
    .from("repos")
    .insert({
      owner: parsed.owner,
      name: parsed.name,
      url: `https://github.com/${parsed.owner}/${parsed.name}`,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Erro ao cadastrar repositório: ${error.message}`);
  return rowToRepo(data as RepoRow);
}

export async function removeRepo(id: string): Promise<void> {
  const { error } = await getSupabase().from("repos").delete().eq("id", id);
  if (error) throw new Error(`Erro ao remover repositório: ${error.message}`);
}
