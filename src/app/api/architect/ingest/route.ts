import { NextRequest, NextResponse } from "next/server";
import { applyArchitectResult, loadExistingAnalysis } from "@/lib/architect-apply";
import { markLocalJobReceived, resolveLocalJob } from "@/lib/local-jobs-store";
import { fetchListTasks } from "@/lib/clickup";
import type { ArchitectResultInput } from "@/lib/architect-apply";

function clampScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 10) return null;
  return rounded;
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

  const existing = await loadExistingAnalysis(job.provider, activityId);
  if (!existing) {
    return NextResponse.json(
      { error: "Card ainda não possui análise de qualidade registrada." },
      { status: 400 }
    );
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

  try {
    const applied = await applyArchitectResult({
      provider: job.provider,
      activityId,
      result,
      authorClickupId,
      existing,
    });

    await markLocalJobReceived(job.id);

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
