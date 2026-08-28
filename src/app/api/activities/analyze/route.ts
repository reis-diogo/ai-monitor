import { NextRequest, NextResponse } from "next/server";
import { analyzeActivity } from "@/lib/ai";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/analysis-cache";
import type { ActivitySource, AiProvider, AnalyzedActivityRecord } from "@/lib/types";

function parseProvider(value: unknown): AiProvider {
  if (value === "openai" || value === "gemini") return value;
  return "anthropic";
}

function parseSource(value: unknown): ActivitySource {
  return value === "clickup" ? "clickup" : "commit";
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = body?.id;
  const title = body?.title;
  const content = body?.content;
  const provider = parseProvider(body?.provider);
  const source = parseSource(body?.source);
  const force = body?.force === true;

  if (typeof id !== "string" || typeof title !== "string") {
    return NextResponse.json({ error: "Dados da atividade inválidos." }, { status: 400 });
  }

  if (!force) {
    const cached = await getCachedAnalysis(provider, id);
    if (cached) {
      return NextResponse.json({ analysis: cached, cached: true });
    }
  }

  try {
    const analysis = await analyzeActivity(provider, source, {
      title,
      content: typeof content === "string" ? content : "",
    });

    const record: AnalyzedActivityRecord = {
      ...analysis,
      id,
      source,
      authorName: str(body?.authorName, "desconhecido"),
      authorAvatarUrl: typeof body?.authorAvatarUrl === "string" ? body.authorAvatarUrl : null,
      title,
      url: str(body?.url),
      date: str(body?.date),
      location: str(body?.location),
      additions: numOrNull(body?.additions),
      deletions: numOrNull(body?.deletions),
      analyzedAt: new Date().toISOString(),
    };

    await setCachedAnalysis(provider, id, record);
    return NextResponse.json({ analysis: record, cached: false });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Erro ao analisar atividade.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
