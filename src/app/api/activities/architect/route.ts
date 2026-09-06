import { NextRequest, NextResponse } from "next/server";
import { researchArchitecture, structureArchitecture } from "@/lib/ai";
import { applyArchitectResult, loadExistingAnalysis } from "@/lib/architect-apply";
import { fetchOrgMetadataSummary } from "@/lib/github";
import { getRepos } from "@/lib/repos-store";
import { isAllowedUser } from "@/lib/require-allowed-user";
import type { AiProvider } from "@/lib/types";

// 60s e o teto do plano Hobby na Vercel; valores maiores sao recusados no deploy.
export const maxDuration = 60;

function parseProvider(value: unknown): AiProvider {
  if (value === "openai" || value === "gemini") return value;
  return "anthropic";
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function loadMetadata(location: string): Promise<string> {
  const target = slug(location);
  if (!target) return "";

  const repos = await getRepos();
  const match =
    repos.find((repo) => slug(repo.name) === target) ??
    repos.find((repo) => slug(repo.name).includes(target) || target.includes(slug(repo.name)));

  if (!match) return "";

  try {
    return (await fetchOrgMetadataSummary(match.owner, match.name)) ?? "";
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  const title = body?.title;
  const content = typeof body?.content === "string" ? body.content : "";
  const location = typeof body?.location === "string" ? body.location : "";
  const authorClickupId = typeof body?.authorClickupId === "number" ? body.authorClickupId : null;
  const provider = parseProvider(body?.provider);

  if (typeof id !== "string" || typeof title !== "string") {
    return NextResponse.json({ error: "Dados da atividade inválidos." }, { status: 400 });
  }

  const existing = await loadExistingAnalysis(provider, id);
  if (!existing) {
    return NextResponse.json(
      { error: "Card ainda não possui análise de qualidade registrada." },
      { status: 400 }
    );
  }

  if (existing.architecture !== null && existing.architecture !== undefined) {
    return NextResponse.json({ analysis: existing, cached: true });
  }

  try {
    const metadata = await loadMetadata(location);
    const research = await researchArchitecture(provider, { title, content, metadata });
    const result = await structureArchitecture(provider, { title, content, metadata, research });

    const applied = await applyArchitectResult({
      provider,
      activityId: id,
      result,
      authorClickupId,
      existing,
    });

    return NextResponse.json({
      analysis: applied.record,
      cached: false,
      appliedStatus: applied.appliedStatus,
      statusError: applied.statusError,
      hadMetadata: !!metadata,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao analisar arquitetura.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
