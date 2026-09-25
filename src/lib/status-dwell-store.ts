import { getSupabase } from "@/lib/supabase";
import { DWELL_STATUSES } from "@/lib/dwell";

export type StatusDwell = {
  taskId: string;
  status: string;
  since: string | null;
};

type StatusDwellRow = {
  task_id: string;
  status: string;
  since: string | null;
};

function toDwell(row: StatusDwellRow): StatusDwell {
  return { taskId: row.task_id, status: row.status, since: row.since };
}

export async function fetchStatusDwell(): Promise<StatusDwell[]> {
  const { data, error } = await getSupabase().from("status_dwell").select("task_id,status,since");
  if (error) throw new Error(`Erro ao ler o tempo em status: ${error.message}`);
  return ((data ?? []) as StatusDwellRow[]).map(toDwell);
}

const MONITORED = new Set<string>(DWELL_STATUSES);

// Chamado a cada sync. Carimba since so quando o status muda de fato: um card que nao
// se mexeu mantem o instante original, senao o contador reiniciaria a cada minuto.
// Card desconhecido entra com since nulo, para a semeadura buscar o valor real depois
// em vez de a tela mostrar "ha poucos segundos" para algo parado ha uma semana.
//
// So os status do fluxo entram. Guardar "concluido" e companhia enchia a tabela de
// linha que o grafico nunca le e, pior, consumia a cota da semeadura: uma rodada gastou
// 26 das 60 chamadas em card fechado enquanto os abertos seguiam sem tempo apurado.
export async function reconcileStatusDwell(
  tasks: { id: string; status: string }[]
): Promise<void> {
  if (!tasks.length) return;

  const known = new Map((await fetchStatusDwell()).map((row) => [row.taskId, row]));
  const now = new Date().toISOString();

  const monitored = tasks.filter((task) => MONITORED.has(task.status.toLowerCase()));

  const changed = monitored.flatMap((task) => {
    const current = known.get(task.id);
    if (current && current.status === task.status) return [];

    return [
      {
        task_id: task.id,
        status: task.status,
        since: current ? now : null,
        updated_at: now,
      },
    ];
  });

  if (changed.length) {
    const { error } = await getSupabase()
      .from("status_dwell")
      .upsert(changed, { onConflict: "task_id" });

    if (error) throw new Error(`Erro ao registrar a mudança de status: ${error.message}`);
  }

  // Card que saiu do fluxo leva a linha junto: mantê-la sem ninguem ler e so custo.
  const left = tasks
    .filter((task) => !MONITORED.has(task.status.toLowerCase()))
    .map((task) => task.id)
    .filter((id) => known.has(id));

  if (left.length) {
    await getSupabase().from("status_dwell").delete().in("task_id", left);
  }
}

export async function setStatusDwellSince(
  entries: { taskId: string; status: string; since: string }[]
): Promise<void> {
  if (!entries.length) return;

  const now = new Date().toISOString();
  const { error } = await getSupabase().from("status_dwell").upsert(
    entries.map((entry) => ({
      task_id: entry.taskId,
      status: entry.status,
      since: entry.since,
      updated_at: now,
    })),
    { onConflict: "task_id" }
  );

  if (error) throw new Error(`Erro ao semear o tempo em status: ${error.message}`);
}
