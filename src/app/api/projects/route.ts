import { NextRequest, NextResponse } from "next/server";
import { addProject, getProjects } from "@/lib/projects-store";

export async function GET() {
  const projects = await getProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = body?.name;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Informe o nome do projeto." }, { status: 400 });
  }

  try {
    const project = await addProject(name);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao cadastrar projeto.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
