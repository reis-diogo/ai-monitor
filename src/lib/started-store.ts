import { getSupabase } from "@/lib/supabase";

export async function markStarted(activityId: string): Promise<void> {
  await getSupabase()
    .from("activity_started")
    .upsert({ activity_id: activityId }, { onConflict: "activity_id", ignoreDuplicates: true });
}

export async function fetchStarted(): Promise<Record<string, string>> {
  const { data, error } = await getSupabase().from("activity_started").select("activity_id, started_at");
  if (error) throw new Error(`Erro ao ler o início dos cards: ${error.message}`);
  return Object.fromEntries(
    ((data ?? []) as { activity_id: string; started_at: string }[]).map((row) => [
      row.activity_id,
      row.started_at,
    ])
  );
}
