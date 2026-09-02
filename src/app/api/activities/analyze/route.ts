import { NextRequest, NextResponse } from "next/server";
import { analyzeActivity } from "@/lib/ai";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/analysis-cache";
import { getCurrentUserEmail, isAllowedUser } from "@/lib/require-allowed-user";
import { createTaskComment, updateTaskStatus } from "@/lib/clickup";
import type { ActivitySource, AiProvider, AnalyzedActivityRecord } from "@/lib/types";

const LOW_SCORE_THRESHOLD = 7;
const REFINE_STATUS = "para refinar";

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

async function flagLowScoreClickupTask(
  record: AnalyzedActivityRecord,
  mentionUserId: number | null,
  performedByEmail: string | null
) {
  const registeredBy = performedByEmail ? `\n\nRegistrado por: ${performedByEmail}` : "";
  const comment = `Análise de IA (${record.score}/10): ${record.critique}${registeredBy}`;
  await Promise.all([
    createTaskComment(record.id, comment, mentionUserId),
    updateTaskStatus(record.id, REFINE_STATUS),
  ]);
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

    let clickupStatusUpdate: string | null = null;
    if (source === "clickup" && record.score < LOW_SCORE_THRESHOLD) {
      const mentionUserId = typeof body?.authorClickupId === "number" ? body.authorClickupId : null;
      try {
        const performedByEmail = await getCurrentUserEmail();
        await flagLowScoreClickupTask(record, mentionUserId, performedByEmail);
        clickupStatusUpdate = REFINE_STATUS;
      } catch (clickupError) {
        console.error("Erro ao sinalizar tarefa no ClickUp:", clickupError);
      }
    }

    return NextResponse.json({ analysis: record, cached: false, clickupStatusUpdate });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Erro ao analisar atividade.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
