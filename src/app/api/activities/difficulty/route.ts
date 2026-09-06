import { NextRequest, NextResponse } from "next/server";
import { analyzeDifficulty } from "@/lib/ai";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/analysis-cache";
import { isAllowedUser } from "@/lib/require-allowed-user";
import type { AiProvider } from "@/lib/types";

function parseProvider(value: unknown): AiProvider {
  if (value === "openai" || value === "gemini") return value;
  return "anthropic";
}

export async function POST(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  const title = body?.title;
  const content = body?.content;
  const provider = parseProvider(body?.provider);

  if (typeof id !== "string" || typeof title !== "string") {
    return NextResponse.json({ error: "Dados da atividade inválidos." }, { status: 400 });
  }

  const existing = await getCachedAnalysis(provider, id);
  if (!existing) {
    return NextResponse.json(
      { error: "Card ainda não possui análise de qualidade registrada." },
      { status: 400 }
    );
  }

  if (existing.difficulty !== null && existing.difficulty !== undefined) {
    return NextResponse.json({ analysis: existing, cached: true });
  }

  try {
    const result = await analyzeDifficulty(provider, {
      title,
      content: typeof content === "string" ? content : "",
    });

    const updated = {
      ...existing,
      difficulty: result.difficulty,
      difficultyReasoning: result.reasoning,
    };

    await setCachedAnalysis(provider, id, updated);

    return NextResponse.json({ analysis: updated, cached: false });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Erro ao classificar dificuldade.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
