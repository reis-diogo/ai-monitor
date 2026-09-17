import { NextRequest, NextResponse } from "next/server";
import { removeProject, setProjectName, setProjectScope } from "@/lib/projects-store";
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

  try {
    if (typeof body?.name === "string") {
      return NextResponse.json({ project: await setProjectName(id, body.name) });
    }

    if (typeof body?.scope === "string") {
      return NextResponse.json({ project: await setProjectScope(id, body.scope) });
    }

    return NextResponse.json({ error: "Informe o nome ou o escopo." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar o projeto.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
