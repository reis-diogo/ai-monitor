import { NextRequest, NextResponse } from "next/server";
import { resolveLocalJob } from "@/lib/local-jobs-store";
import { clearProgress, fetchProgress, recordProgress } from "@/lib/progress-store";
import { isAllowedUser } from "@/lib/require-allowed-user";

const MAX_IDS_PER_READ = 200;

// A escrita vem da IA local, fora do navegador: sem sessao do Clerk, autenticada
// pelo mesmo token do lote que gerou o prompt. A leitura e da tela, e continua
// exigindo usuario autorizado — por isso a checagem e por metodo, e nao no proxy.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const activityId = typeof body?.activityId === "string" ? body.activityId : "";

  const job = await resolveLocalJob(token);
  if (!job) {
    return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 401 });
  }

  if (!activityId || !job.activityIds.includes(activityId)) {
    return NextResponse.json(
      { error: "Este activityId não faz parte da tarefa deste token." },
      { status: 403 }
    );
  }

  const stage = typeof body?.stage === "string" ? body.stage.trim() : "";
  if (!stage) {
    return NextResponse.json({ error: "Campo 'stage' é obrigatório." }, { status: 400 });
  }

  const detail = typeof body?.detail === "string" && body.detail.trim() ? body.detail.trim() : null;

  try {
    // "done" apaga em vez de gravar: a etapa acabou, e o que sobra para a tela e o
    // badge da nota. Para arquiteto e revisor o proprio ingest ja limpa; o dev nao
    // tem ingest, entao esse e o unico jeito de o indicador dele sumir antes do TTL.
    if (body?.state === "done") {
      await clearProgress(activityId);
      return NextResponse.json({ ok: true });
    }

    await recordProgress({
      activityId,
      kind: job.kind,
      stage,
      detail,
      state: body?.state === "failed" ? "failed" : "running",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar o progresso.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS_PER_READ);

  try {
    return NextResponse.json({ progress: await fetchProgress(ids.length ? ids : undefined) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ler o progresso.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
