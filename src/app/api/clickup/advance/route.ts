import { NextRequest, NextResponse } from "next/server";
import { updateTaskStatus } from "@/lib/clickup";
import { readJsonBody } from "@/lib/read-json-body";
import { isAllowedUser } from "@/lib/require-allowed-user";

const QA_STATUS = "em qa";

export async function POST(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = (await readJsonBody(request)) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Informe o card." }, { status: 400 });
  }

  try {
    await updateTaskStatus(id, QA_STATUS);
    return NextResponse.json({ ok: true, status: QA_STATUS });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar o card no ClickUp.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
