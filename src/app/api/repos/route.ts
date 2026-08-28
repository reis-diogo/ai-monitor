import { NextRequest, NextResponse } from "next/server";
import { addRepo, getRepos } from "@/lib/repos-store";

export async function GET() {
  const repos = await getRepos();
  return NextResponse.json({ repos });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const url = body?.url;

  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "Informe o link do repositório." }, { status: 400 });
  }

  try {
    const repo = await addRepo(url);
    return NextResponse.json({ repo }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao cadastrar repositório.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
