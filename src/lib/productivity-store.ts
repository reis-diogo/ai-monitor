import { getSupabase } from "@/lib/supabase";

export type ProjectSource = {
  id: string;
  projectName: string | null;
  listId: string;
  label: string | null;
  webhookId: string | null;
};

export type ActivityKind = "created" | "status" | "comment" | "assignee";

export type ActivityEvent = {
  eventKey: string;
  occurredAt: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string | null;
  listId: string;
  projectName: string;
  taskId: string;
  taskCustomId: string | null;
  taskTitle: string | null;
  kind: ActivityKind;
  fromStatus: string | null;
  toStatus: string | null;
  detail: string | null;
};

type SourceRow = {
  id: string;
  project_name: string | null;
  clickup_list_id: string;
  label: string | null;
  webhook_id: string | null;
  webhook_secret?: string | null;
};

function toSource(row: SourceRow): ProjectSource {
  return {
    id: row.id,
    projectName: row.project_name,
    listId: row.clickup_list_id,
    label: row.label,
    webhookId: row.webhook_id,
  };
}

export async function listSources(): Promise<ProjectSource[]> {
  const { data, error } = await getSupabase()
    .from("project_sources")
    .select("id, project_name, clickup_list_id, label, webhook_id")
    .order("project_name");
  if (error) throw new Error(`Erro ao listar as listas: ${error.message}`);
  return (data ?? []).map((row) => toSource(row as SourceRow));
}

export async function findSourceByWebhook(
  webhookId: string
): Promise<(ProjectSource & { secret: string }) | null> {
  const { data, error } = await getSupabase()
    .from("project_sources")
    .select("id, project_name, clickup_list_id, label, webhook_id, webhook_secret")
    .eq("webhook_id", webhookId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as SourceRow;
  return { ...toSource(row), secret: row.webhook_secret ?? "" };
}

export async function addSource(input: {
  projectName: string | null;
  listId: string;
  label: string | null;
  webhook: { id: string; secret: string } | null;
}): Promise<ProjectSource> {
  const { data, error } = await getSupabase()
    .from("project_sources")
    .insert({
      project_name: input.projectName,
      clickup_list_id: input.listId,
      label: input.label,
      webhook_id: input.webhook?.id ?? null,
      webhook_secret: input.webhook?.secret ?? null,
    })
    .select("id, project_name, clickup_list_id, label, webhook_id")
    .single();
  if (error) throw new Error(`Erro ao cadastrar a lista: ${error.message}`);
  return toSource(data as SourceRow);
}

export async function setSourceWebhook(
  id: string,
  webhook: { id: string; secret: string }
): Promise<void> {
  const { error } = await getSupabase()
    .from("project_sources")
    .update({ webhook_id: webhook.id, webhook_secret: webhook.secret })
    .eq("id", id);
  if (error) throw new Error(`Erro ao salvar o webhook: ${error.message}`);
}

export async function removeSource(id: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("project_sources")
    .delete()
    .eq("id", id)
    .select("webhook_id")
    .maybeSingle();
  if (error) throw new Error(`Erro ao remover a lista: ${error.message}`);
  return (data as { webhook_id: string | null } | null)?.webhook_id ?? null;
}

export async function recordEvents(events: ActivityEvent[]): Promise<void> {
  if (!events.length) return;
  const { error } = await getSupabase()
    .from("activity_events")
    .upsert(
      events.map((event) => ({
        event_key: event.eventKey,
        occurred_at: event.occurredAt,
        actor_id: event.actorId,
        actor_name: event.actorName,
        actor_email: event.actorEmail,
        list_id: event.listId,
        project_name: event.projectName,
        task_id: event.taskId,
        task_custom_id: event.taskCustomId,
        task_title: event.taskTitle,
        kind: event.kind,
        from_status: event.fromStatus,
        to_status: event.toStatus,
        detail: event.detail,
      })),
      { onConflict: "event_key", ignoreDuplicates: true }
    );
  if (error) throw new Error(`Erro ao gravar a atividade: ${error.message}`);
}

export type PersonSummary = {
  name: string;
  created: number;
  moved: number;
  commented: number;
  total: number;
  byProject: Record<string, number>;
  timeline: {
    at: string;
    kind: ActivityKind;
    project: string;
    card: string;
    title: string | null;
    from: string | null;
    to: string | null;
    detail: string | null;
  }[];
};

type EventRow = {
  occurred_at: string;
  actor_name: string;
  project_name: string;
  task_id: string;
  task_custom_id: string | null;
  task_title: string | null;
  kind: ActivityKind;
  from_status: string | null;
  to_status: string | null;
  detail: string | null;
};

const TIMELINE_LIMIT = 60;

export async function fetchProductivity(params: {
  sinceIso: string;
  project: string | null;
}): Promise<PersonSummary[]> {
  let query = getSupabase()
    .from("activity_events")
    .select(
      "occurred_at, actor_name, project_name, task_id, task_custom_id, task_title, kind, from_status, to_status, detail"
    )
    .gte("occurred_at", params.sinceIso)
    .order("occurred_at", { ascending: false })
    .limit(5000);
  if (params.project) query = query.eq("project_name", params.project);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao ler a produtividade: ${error.message}`);

  const people = new Map<string, PersonSummary>();
  for (const row of (data ?? []) as EventRow[]) {
    const person =
      people.get(row.actor_name) ??
      ({
        name: row.actor_name,
        created: 0,
        moved: 0,
        commented: 0,
        total: 0,
        byProject: {},
        timeline: [],
      } satisfies PersonSummary);
    people.set(row.actor_name, person);

    if (row.kind === "created") person.created += 1;
    else if (row.kind === "status") person.moved += 1;
    else if (row.kind === "comment") person.commented += 1;
    person.total += 1;
    person.byProject[row.project_name] = (person.byProject[row.project_name] ?? 0) + 1;
    if (person.timeline.length < TIMELINE_LIMIT) {
      person.timeline.push({
        at: row.occurred_at,
        kind: row.kind,
        project: row.project_name,
        card: row.task_custom_id ?? row.task_id,
        title: row.task_title,
        from: row.from_status,
        to: row.to_status,
        detail: row.detail,
      });
    }
  }

  return [...people.values()].sort((a, b) => b.total - a.total);
}
