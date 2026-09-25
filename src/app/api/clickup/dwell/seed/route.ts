import { NextResponse } from "next/server";
import { fetchTaskStatusSince } from "@/lib/clickup";
import { fetchStatusDwell, setStatusDwellSince } from "@/lib/status-dwell-store";
import { isAllowedUser } from "@/lib/require-allowed-user";
import { DWELL_STATUSES } from "@/lib/dwell";

// O ClickUp corta em torno de 100 requisicoes por minuto e esta rota faz uma por card.
// O intervalo deixa a semeadura abaixo do teto mesmo com a fila cheia; o teto de cards
// impede que uma lista grande transforme um clique numa espera de varios minutos.
const REQUEST_INTERVAL_MS = 700;
const MAX_PER_RUN = 60;

export async function POST() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    // So o que o grafico mostra: a cota por rodada e curta e nao pode ser gasta com
    // card fora do fluxo.
    const monitored = new Set<string>(DWELL_STATUSES);
    const pending = (await fetchStatusDwell()).filter(
      (row) => !row.since && monitored.has(row.status.toLowerCase())
    );
    const batch = pending.slice(0, MAX_PER_RUN);

    const seeded: { taskId: string; status: string; since: string }[] = [];
    const failed: string[] = [];

    for (const [index, row] of batch.entries()) {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));

      try {
        const since = await fetchTaskStatusSince(row.taskId);
        if (since) seeded.push({ taskId: row.taskId, status: row.status, since });
      } catch {
        failed.push(row.taskId);
      }
    }

    await setStatusDwellSince(seeded);

    return NextResponse.json({
      seeded: seeded.length,
      failed: failed.length,
      remaining: Math.max(pending.length - batch.length, 0),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao semear o tempo em status.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
