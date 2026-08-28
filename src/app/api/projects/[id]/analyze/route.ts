import { NextRequest, NextResponse } from "next/server";
import { analyzeProjectScope } from "@/lib/ai";
import { getCachedProjectAnalysis, setCachedProjectAnalysis } from "@/lib/project-analysis-cache";
import { getProjects } from "@/lib/projects-store";
import { isAllowedUser } from "@/lib/require-allowed-user";
import type { AiProvider, AnalyzedProjectRecord } from "@/lib/types";

function parseProvider(value: unknown): AiProvider {
  if (value === "openai" || value === "gemini") return value;
  return "anthropic";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const provider = parseProvider(body?.provider);
  const force = body?.force === true;
  const commits = Array.isArray(body?.commits) ? body.commits : [];

  const validCommits = commits.filter(
    (c: unknown): c is { message: string; date: string } =>
      typeof c === "object" &&
      c !== null &&
      typeof (c as Record<string, unknown>).message === "string" &&
      typeof (c as Record<string, unknown>).date === "string"
  );

  const projects = await getProjects();
  const project = projects.find((p) => p.id === id);
  if (!project) {
    return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  }

  if (!force) {
    const cached = await getCachedProjectAnalysis(provider, id);
    if (cached) {
      return NextResponse.json({ analysis: cached, cached: true });
    }
  }

  try {
    const analysis = await analyzeProjectScope(provider, {
      scope: project.scope ?? "",
      commits: validCommits,
    });

    const record: AnalyzedProjectRecord = {
      ...analysis,
      projectId: project.id,
      projectName: project.name,
      commitCount: validCommits.length,
      analyzedAt: new Date().toISOString(),
    };

    await setCachedProjectAnalysis(provider, id, record);
    return NextResponse.json({ analysis: record, cached: false });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Erro ao analisar o escopo do projeto.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
