import { revalidateTag, unstable_cache } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import type { ParsedEvent } from "@/lib/ai-activity/event";
import type {
  ActivityPrompt,
  ActivitySnapshot,
  ActivityStatus,
  KnowledgeNote,
  KnowledgeSnippet,
} from "@/lib/ai-activity/types";

const WINDOW_MS = 12 * 60 * 60 * 1000;
const SNAPSHOT_REVALIDATE_S = 300;
const PROMPT_LIMIT = 500;
const KNOWLEDGE_LIMIT = 300;

type PromptRow = {
  prompt_id: string;
  user_name: string;
  status: string;
  summary: string;
  subject: string;
  area: string | null;
  project: string;
  repo: string | null;
  activity: string | null;
  tokens_in: number;
  tokens_out: number;
  started_at: string;
  ended_at: string | null;
  updated_at: string;
  kb_id: string | null;
};

type KnowledgeRow = {
  id: string;
  prompt_id: string | null;
  title: string;
  technologies: string[] | null;
  summary: string | null;
  steps: string[] | null;
  connection: string | null;
  gotchas: string[] | null;
  snippets: KnowledgeSnippet[] | null;
  user_name: string | null;
  project: string | null;
  subject: string | null;
  created_at: string;
};

function tagFor(ownerEmail: string): string {
  return `ai-activity:${ownerEmail}`;
}

function toPrompt(row: PromptRow): ActivityPrompt {
  return {
    id: row.prompt_id,
    user: row.user_name,
    status: row.status as ActivityStatus,
    summary: row.summary,
    subject: row.subject,
    area: row.area,
    project: row.project,
    repo: row.repo,
    activity: row.activity,
    tokensIn: Number(row.tokens_in) || 0,
    tokensOut: Number(row.tokens_out) || 0,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    updatedAt: row.updated_at,
    kbId: row.kb_id,
  };
}

function toNote(row: KnowledgeRow): KnowledgeNote {
  return {
    id: row.id,
    promptId: row.prompt_id,
    title: row.title,
    technologies: row.technologies ?? [],
    summary: row.summary ?? "",
    steps: row.steps ?? [],
    connection: row.connection ?? "",
    gotchas: row.gotchas ?? [],
    snippets: row.snippets ?? [],
    user: row.user_name ?? "",
    project: row.project ?? "",
    subject: row.subject ?? "",
    createdAt: row.created_at,
  };
}

export async function recordEvent(ownerEmail: string, event: ParsedEvent): Promise<void> {
  const now = new Date();
  const row: Record<string, unknown> = {
    owner_email: ownerEmail,
    prompt_id: event.promptId,
    updated_at: now.toISOString(),
  };

  if (event.user) row.user_name = event.user;
  if (event.summary) row.summary = event.summary;
  if (event.subject) row.subject = event.subject;
  if (event.area) row.area = event.area;
  if (event.project) row.project = event.project;
  if (event.repo) row.repo = event.repo;
  if (event.activity !== undefined) row.activity = event.activity;
  if (event.tokens) {
    row.tokens_in = event.tokens.input;
    row.tokens_out = event.tokens.output;
  }
  if (event.status) row.status = event.status;
  if (event.startedAt) row.started_at = event.startedAt;

  if (event.status === "done" || event.status === "error") {
    const endedAt = event.endedAt ?? now.toISOString();
    row.ended_at = endedAt;
    if (event.durationMs !== undefined && !event.startedAt) {
      row.started_at = new Date(Date.parse(endedAt) - event.durationMs).toISOString();
    }
  } else if (event.status) {
    row.ended_at = null;
  }

  const supabase = getSupabase();

  if (event.knowledge) {
    const kbId = event.knowledge.id ?? `${event.promptId}-kb`;
    row.kb_id = kbId;

    const note: Record<string, unknown> = {
      owner_email: ownerEmail,
      id: kbId,
      prompt_id: event.promptId,
      title: event.knowledge.title,
      technologies: event.knowledge.technologies,
      summary: event.knowledge.summary,
      steps: event.knowledge.steps,
      connection: event.knowledge.connection,
      gotchas: event.knowledge.gotchas,
      snippets: event.knowledge.snippets,
    };
    if (event.user) note.user_name = event.user;
    if (event.project) note.project = event.project;
    if (event.subject) note.subject = event.subject;

    const { error } = await supabase
      .from("ai_activity_knowledge")
      .upsert(note, { onConflict: "owner_email,id" });
    if (error) throw new Error(`Erro ao salvar o conhecimento: ${error.message}`);
  }

  const { error } = await supabase
    .from("ai_activity_prompts")
    .upsert(row, { onConflict: "owner_email,prompt_id" });
  if (error) throw new Error(`Erro ao salvar o pedido: ${error.message}`);

  revalidateTag(tagFor(ownerEmail), { expire: 0 });
}

async function loadSnapshot(ownerEmail: string): Promise<ActivitySnapshot> {
  const supabase = getSupabase();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const [prompts, knowledge] = await Promise.all([
    supabase
      .from("ai_activity_prompts")
      .select("*")
      .eq("owner_email", ownerEmail)
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(PROMPT_LIMIT),
    supabase
      .from("ai_activity_knowledge")
      .select("id", { count: "exact", head: true })
      .eq("owner_email", ownerEmail),
  ]);

  if (prompts.error) throw new Error(`Erro ao listar os pedidos: ${prompts.error.message}`);
  if (knowledge.error) throw new Error(`Erro ao contar o conhecimento: ${knowledge.error.message}`);

  const list = ((prompts.data ?? []) as PromptRow[]).map(toPrompt);
  const newest = list.reduce((max, p) => (p.updatedAt > max ? p.updatedAt : max), "");
  const knowledgeCount = knowledge.count ?? 0;

  return { rev: `${newest}|${list.length}|${knowledgeCount}`, prompts: list, knowledgeCount };
}

async function loadKnowledge(ownerEmail: string): Promise<KnowledgeNote[]> {
  const { data, error } = await getSupabase()
    .from("ai_activity_knowledge")
    .select("*")
    .eq("owner_email", ownerEmail)
    .order("created_at", { ascending: false })
    .limit(KNOWLEDGE_LIMIT);

  if (error) throw new Error(`Erro ao listar o conhecimento: ${error.message}`);
  return ((data ?? []) as KnowledgeRow[]).map(toNote);
}

export function getSnapshot(ownerEmail: string): Promise<ActivitySnapshot> {
  return unstable_cache(() => loadSnapshot(ownerEmail), ["ai-activity-snapshot", ownerEmail], {
    tags: [tagFor(ownerEmail)],
    revalidate: SNAPSHOT_REVALIDATE_S,
  })();
}

export function getKnowledge(ownerEmail: string): Promise<KnowledgeNote[]> {
  return unstable_cache(() => loadKnowledge(ownerEmail), ["ai-activity-knowledge", ownerEmail], {
    tags: [tagFor(ownerEmail)],
    revalidate: SNAPSHOT_REVALIDATE_S,
  })();
}

export async function deletePrompts(
  ownerEmail: string,
  filter: { promptId?: string; user?: string }
): Promise<number> {
  let query = getSupabase().from("ai_activity_prompts").delete().eq("owner_email", ownerEmail);
  if (filter.promptId) query = query.eq("prompt_id", filter.promptId);
  if (filter.user) query = query.eq("user_name", filter.user);

  const { data, error } = await query.select("prompt_id");
  if (error) throw new Error(`Erro ao apagar os pedidos: ${error.message}`);

  revalidateTag(tagFor(ownerEmail), { expire: 0 });
  return data?.length ?? 0;
}

export async function deleteKnowledge(ownerEmail: string, filter: { id?: string }): Promise<number> {
  let query = getSupabase().from("ai_activity_knowledge").delete().eq("owner_email", ownerEmail);
  if (filter.id) query = query.eq("id", filter.id);

  const { data, error } = await query.select("id");
  if (error) throw new Error(`Erro ao apagar o conhecimento: ${error.message}`);

  if (data?.length) {
    const ids = data.map((row) => row.id as string);
    const { error: unlink } = await getSupabase()
      .from("ai_activity_prompts")
      .update({ kb_id: null })
      .eq("owner_email", ownerEmail)
      .in("kb_id", ids);
    if (unlink) throw new Error(`Erro ao desvincular o conhecimento: ${unlink.message}`);
  }

  revalidateTag(tagFor(ownerEmail), { expire: 0 });
  return data?.length ?? 0;
}
