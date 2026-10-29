import { NextRequest, NextResponse } from "next/server";
import { deleteTask } from "@/lib/clickup";
import { clearProgress } from "@/lib/progress-store";
import { isPromptEditor } from "@/lib/require-allowed-user";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isPromptEditor())) {
    return NextResponse.json(
      { error: "Só o admin apaga cards." },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    await deleteTask(id);
    await clearProgress(id).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao apagar o card no ClickUp.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
