import { NextRequest, NextResponse } from "next/server";
import { APPROVED_STATUS, REFINE_STATUS } from "@/lib/architect-gate";
import { canDecideArchitecture } from "@/lib/architect-access";
import { createTaskComment, updateTaskStatus } from "@/lib/clickup";
import { readJsonBody } from "@/lib/read-json-body";
import { getCurrentUserEmail, isAllowedUser } from "@/lib/require-allowed-user";

const MAX_REASON = 4000;

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  return NextResponse.json({ canDecide: await canDecideArchitecture() });
}

export async function POST(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  if (!(await canDecideArchitecture())) {
    return NextResponse.json(
      { error: "Só arquitetos podem aprovar ou reprovar." },
      { status: 403 },
    );
  }

  const body = (await readJsonBody(request)) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const approved = body?.decision === "approve";
  const rejected = body?.decision === "reject";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (!id || (!approved && !rejected)) {
    return NextResponse.json(
      { error: "Dados da decisão inválidos." },
      { status: 400 },
    );
  }
  if (rejected && !reason) {
    return NextResponse.json(
      { error: "O motivo da reprovação é obrigatório." },
      { status: 400 },
    );
  }
  if (reason.length > MAX_REASON) {
    return NextResponse.json(
      { error: "Justificativa longa demais." },
      { status: 400 },
    );
  }

  const status = approved ? APPROVED_STATUS : REFINE_STATUS;
  const author = (await getCurrentUserEmail()) ?? "arquiteto";

  try {
    if (reason) {
      await createTaskComment(
        id,
        `${approved ? "Solução aprovada" : "Solução reprovada"} por ${author}: ${reason}`,
        null,
      );
    }
    await updateTaskStatus(id, status);
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar o card no ClickUp.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
