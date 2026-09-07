import { getSupabase } from "@/lib/supabase";
import type { AiPrompt } from "@/lib/types";
import {
  ARCHITECT_RESEARCH_PROMPT_KEY,
  ARCHITECT_RESEARCH_SYSTEM_PROMPT,
  ARCHITECT_STRUCTURE_PROMPT_KEY,
  ARCHITECT_STRUCTURE_SYSTEM_PROMPT,
  REVIEW_PROMPT_KEY,
  REVIEW_SYSTEM_PROMPT,
} from "@/lib/ai/schema";

type PromptRow = {
  key: string;
  label: string;
  content: string;
  updated_at: string;
};

export const PROMPT_DEFAULTS: { key: string; label: string; content: string }[] = [
  {
    key: ARCHITECT_RESEARCH_PROMPT_KEY,
    label: "Arquiteto — pesquisa na documentação",
    content: ARCHITECT_RESEARCH_SYSTEM_PROMPT,
  },
  {
    key: ARCHITECT_STRUCTURE_PROMPT_KEY,
    label: "Arquiteto — parecer e nota",
    content: ARCHITECT_STRUCTURE_SYSTEM_PROMPT,
  },
  {
    key: REVIEW_PROMPT_KEY,
    label: "Revisor — entrega vs especificação",
    content: REVIEW_SYSTEM_PROMPT,
  },
];

function rowToPrompt(row: PromptRow): AiPrompt {
  return { key: row.key, label: row.label, content: row.content, updatedAt: row.updated_at };
}

export async function getPrompts(): Promise<AiPrompt[]> {
  const { data, error } = await getSupabase().from("ai_prompts").select("*");
  if (error) throw new Error(`Erro ao listar prompts: ${error.message}`);

  const stored = new Map((data ?? []).map((row) => [(row as PromptRow).key, row as PromptRow]));

  return PROMPT_DEFAULTS.map((fallback) => {
    const row = stored.get(fallback.key);
    return row
      ? rowToPrompt(row)
      : { key: fallback.key, label: fallback.label, content: fallback.content, updatedAt: "" };
  });
}

export async function getPromptContent(key: string): Promise<string> {
  const fallback = PROMPT_DEFAULTS.find((p) => p.key === key);

  const { data, error } = await getSupabase()
    .from("ai_prompts")
    .select("content")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return fallback?.content ?? "";
  const content = (data as { content: string }).content;
  return content.trim() ? content : fallback?.content ?? "";
}

export async function savePrompt(key: string, content: string): Promise<AiPrompt> {
  const fallback = PROMPT_DEFAULTS.find((p) => p.key === key);
  if (!fallback) throw new Error("Prompt desconhecido.");

  if (!content.trim()) throw new Error("O prompt não pode ficar vazio.");

  const { data, error } = await getSupabase()
    .from("ai_prompts")
    .upsert(
      { key, label: fallback.label, content, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    )
    .select("*")
    .single();

  if (error) throw new Error(`Erro ao salvar prompt: ${error.message}`);
  return rowToPrompt(data as PromptRow);
}

export async function resetPrompt(key: string): Promise<AiPrompt> {
  const fallback = PROMPT_DEFAULTS.find((p) => p.key === key);
  if (!fallback) throw new Error("Prompt desconhecido.");
  return savePrompt(key, fallback.content);
}
