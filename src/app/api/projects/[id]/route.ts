import { NextRequest, NextResponse } from "next/server";
import { removeProject, setProjectScope } from "@/lib/projects-store";
import { removeProjectAnalyses } from "@/lib/project-analysis-cache";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  await removeProject(id);
  await removeProjectAnalyses(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const scope = body?.scope;

  if (typeof scope !== "string") {
    return NextResponse.json({ error: "Informe o escopo." }, { status: 400 });
  }

  try {
    const project = await setProjectScope(id, scope);
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar escopo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
