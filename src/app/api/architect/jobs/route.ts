import { NextRequest, NextResponse } from "next/server";
import { createLocalJob } from "@/lib/local-jobs-store";
import { buildLocalArchitectPrompt, type LocalPromptCard } from "@/lib/ai/local-prompt";
import { getPromptContent } from "@/lib/prompts-store";
import { ARCHITECT_RESEARCH_PROMPT_KEY } from "@/lib/ai/schema";
import { getCurrentUserEmail, isAllowedUser } from "@/lib/require-allowed-user";
import type { AiProvider } from "@/lib/types";

function parseProvider(value: unknown): AiProvider {
  if (value === "openai" || value === "gemini") return value;
  return "anthropic";
}

function parseCards(value: unknown): LocalPromptCard[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const card = raw as Record<string, unknown>;
    if (typeof card.id !== "string" || typeof card.title !== "string") return [];
    return [
      {
        id: card.id,
        customId: typeof card.customId === "string" ? card.customId : null,
        title: card.title,
        content: typeof card.content === "string" ? card.content : "",
      },
    ];
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const project = typeof body?.project === "string" ? body.project : "";
  const provider = parseProvider(body?.provider);
  const cards = parseCards(body?.cards);

  if (!project || !cards.length) {
    return NextResponse.json({ error: "Informe o projeto e os cards." }, { status: 400 });
  }

  try {
    const { token, job } = await createLocalJob({
      provider,
      project,
      activityIds: cards.map((card) => card.id),
      createdBy: await getCurrentUserEmail(),
    });

    // A IA local roda fora do navegador do usuario, entao o POST precisa ir para a
    // instalacao publica do app — nao para o localhost de quem gerou o prompt.
    const origin = (process.env.APP_PUBLIC_URL || request.nextUrl.origin).replace(/\/+$/, "");

    const prompt = buildLocalArchitectPrompt({
      project,
      cards,
      token,
      ingestUrl: `${origin}/api/architect/ingest`,
      systemPrompt: await getPromptContent(ARCHITECT_RESEARCH_PROMPT_KEY),
    });

    return NextResponse.json({ prompt, expiresAt: job.expiresAt, cardCount: cards.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar tarefa local.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
