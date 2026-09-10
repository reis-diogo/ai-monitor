import { NextRequest, NextResponse } from "next/server";
import { applyArchitectResult, loadExistingAnalysis } from "@/lib/architect-apply";
import { applyReviewResult, type ReviewResultInput } from "@/lib/review-apply";
import { markLocalJobReceived, resolveLocalJob } from "@/lib/local-jobs-store";
import { clearProgress } from "@/lib/progress-store";
import { fetchListTasks, fetchTeamMemberIdsByEmail } from "@/lib/clickup";
import type { ArchitectResultInput } from "@/lib/architect-apply";

function clampScore(value: unknown): number | null {
  // Recusa em vez de arredondar: 6.6 virando 7 cruzaria o limiar de aprovacao e
  // liberaria uma entrega que a IA local nao aprovou.
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > 10) return null;
  return value;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && !!item.trim());
}

function docRefs(value: unknown): { title: string; url: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const ref = raw as Record<string, unknown>;
    if (typeof ref.url !== "string" || !ref.url.startsWith("http")) return [];
    return [{ title: typeof ref.title === "string" && ref.title ? ref.title : ref.url, url: ref.url }];
  });
}

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

  // Um card por token, uma vez. Sem isso o mesmo POST reaplicaria o gate durante
  // as 12h de validade — e um reenvio depois da aprovacao tiraria o card de "em qa".
  if (job.receivedIds.includes(activityId)) {
    return NextResponse.json(
      { error: "Este card já foi enviado neste lote. Gere um novo prompt para reavaliar." },
      { status: 409 }
    );
  }

  const kind = body?.kind === "review" ? "review" : "architect";
  if (kind !== job.kind) {
    // O lote do dev cai aqui: ele nao devolve parecer nenhum, so progresso.
    const detail =
      job.kind === "dev"
        ? 'O lote do dev nao envia parecer: use /api/architect/progress.'
        : `Este token é da etapa "${job.kind}", não "${kind}".`;
    return NextResponse.json({ error: detail }, { status: 403 });
  }

  const existing = await loadExistingAnalysis(job.provider, activityId);
  if (!existing) {
    return NextResponse.json(
      { error: "Card ainda não possui análise de qualidade registrada." },
      { status: 400 }
    );
  }

  let authorClickupId: number | null = null;
  try {
    const listId = process.env.CLICKUP_LIST_ID;
    if (listId) {
      const tasks = await fetchListTasks(listId);
      authorClickupId = tasks.find((task) => task.id === activityId)?.authorClickupId ?? null;
    }
  } catch {
    authorClickupId = null;
  }

  if (kind === "review") {
    const review = clampScore(body?.review);
    if (review === null) {
      return NextResponse.json(
        { error: "Campo 'review' deve ser um inteiro de 0 a 10." },
        { status: 400 }
      );
    }

    const reviewReasoning = typeof body?.reasoning === "string" ? body.reasoning.trim() : "";
    if (!reviewReasoning) {
      return NextResponse.json({ error: "Campo 'reasoning' é obrigatório." }, { status: 400 });
    }

    const reviewResult: ReviewResultInput = {
      review,
      reasoning: reviewReasoning,
      delivered: strings(body?.delivered),
      missing: strings(body?.missing),
      deviations: strings(body?.deviations),
      fixPrompt: typeof body?.fixPrompt === "string" ? body.fixPrompt : "",
    };

    try {
      // Menciona quem atua no projeto; o autor do card entra como reserva para o
      // comentario nunca sair sem destinatario.
      let mentionUserIds: number[] = [];
      try {
        if (job.mentionEmails.length) {
          const idsByEmail = await fetchTeamMemberIdsByEmail();
          mentionUserIds = job.mentionEmails
            .map((email) => idsByEmail.get(email.trim().toLowerCase()))
            .filter((id): id is number => typeof id === "number");
        }
      } catch {
        mentionUserIds = [];
      }
      if (!mentionUserIds.length && authorClickupId) mentionUserIds = [authorClickupId];

      const applied = await applyReviewResult({
        provider: job.provider,
        activityId,
        result: reviewResult,
        mentionUserIds,
        existing,
      });
      await markLocalJobReceived(job.id, activityId);
      await clearProgress(activityId);
      return NextResponse.json({
        ok: true,
        appliedStatus: applied.appliedStatus,
        statusError: applied.statusError,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao registrar a revisão.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const architecture = clampScore(body?.architecture);
  if (architecture === null) {
    return NextResponse.json(
      { error: "Campo 'architecture' deve ser um inteiro de 0 a 10." },
      { status: 400 }
    );
  }

  const reasoning = typeof body?.reasoning === "string" ? body.reasoning.trim() : "";
  if (!reasoning) {
    return NextResponse.json({ error: "Campo 'reasoning' é obrigatório." }, { status: 400 });
  }

  const result: ArchitectResultInput = {
    architecture,
    reasoning,
    nativeSolution: typeof body?.nativeSolution === "string" ? body.nativeSolution : "",
    usesCustom: body?.usesCustom === true,
    customJustification:
      typeof body?.customJustification === "string" ? body.customJustification : "",
    ambiguities: strings(body?.ambiguities),
    metadataFindings: strings(body?.metadataFindings),
    docReferences: docRefs(body?.docReferences),
    devPrompt: typeof body?.devPrompt === "string" ? body.devPrompt : "",
  };

  try {
    const applied = await applyArchitectResult({
      provider: job.provider,
      activityId,
      result,
      authorClickupId,
      existing,
    });

    await markLocalJobReceived(job.id, activityId);
    await clearProgress(activityId);

    return NextResponse.json({
      ok: true,
      appliedStatus: applied.appliedStatus,
      statusError: applied.statusError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar o parecer.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
