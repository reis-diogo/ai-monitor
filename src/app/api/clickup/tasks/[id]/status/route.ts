import { NextRequest, NextResponse } from "next/server";
import { updateTaskStatus } from "@/lib/clickup";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (typeof status !== "string" || !status.trim()) {
    return NextResponse.json({ error: "Informe o status." }, { status: 400 });
  }

  try {
    await updateTaskStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar status da tarefa.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
