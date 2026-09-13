import { NextRequest, NextResponse } from "next/server";
import { createLocalJob, type LocalJobKind } from "@/lib/local-jobs-store";
import {
  buildLocalArchitectPrompt,
  buildLocalDevPrompt,
  buildLocalReviewPrompt,
  type LocalPromptCard,
  type ReviewPromptCard,
} from "@/lib/ai/local-prompt";
import { getPromptContent } from "@/lib/prompts-store";
import { ARCHITECT_RESEARCH_PROMPT_KEY, REVIEW_PROMPT_KEY } from "@/lib/ai/schema";
import { getCachedAnalysis } from "@/lib/analysis-cache";
import { fetchListTasks, fetchTaskContent } from "@/lib/clickup";
import { resolveSkillToken } from "@/lib/skill-tokens-store";
import { ARCHITECT_QUEUE_STATUS } from "@/lib/architect-apply";
import { getCurrentUserEmail, isAllowedUser } from "@/lib/require-allowed-user";
import { getProfessionals } from "@/lib/professionals-store";
import { resolveMentionEmails } from "@/lib/mention-emails";
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


function bearerToken(request: NextRequest): string {
  return (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
}

// A skill manda so o nome do projeto: quem sabe quais cards estao na fila e o
// servidor, nao ela. Assim a lista nunca vem de uma copia velha do outro lado.
async function fetchQueueCards(project: string): Promise<LocalPromptCard[]> {
  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) return [];

  const tasks = await fetchListTasks(listId);
  return tasks
    .filter(
      (task) =>
        task.location === project && task.status?.toLowerCase() === ARCHITECT_QUEUE_STATUS
    )
    .map((task) => ({
      id: task.id,
      customId: task.customId,
      title: task.name,
      content: task.description,
    }));
}

export async function POST(request: NextRequest) {
  // Dois chamadores: a tela, com sessao do Clerk, e a skill local, com o token
  // por pessoa. Um dos dois basta.
  const skill = await resolveSkillToken(bearerToken(request));
  if (!skill && !(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const project = typeof body?.project === "string" ? body.project : "";
  const provider = parseProvider(body?.provider);
  let cards = parseCards(body?.cards);
  const kind: LocalJobKind =
    body?.kind === "review" || body?.kind === "dev" ? body.kind : "architect";
  const projectAuthors: string[] = Array.isArray(body?.projectAuthors)
    ? body.projectAuthors.filter((name: unknown): name is string => typeof name === "string")
    : [];

  if (!project) {
    return NextResponse.json({ error: "Informe o projeto." }, { status: 400 });
  }

  try {
    if (!cards.length && kind === "architect") {
      cards = await fetchQueueCards(project);
    }

    if (!cards.length) {
      return NextResponse.json(
        { error: `Nenhum card em "${ARCHITECT_QUEUE_STATUS}" no projeto "${project}".` },
        { status: 400 }
      );
    }

    const { token, job } = await createLocalJob({
      provider,
      project,
      activityIds: cards.map((card) => card.id),
      createdBy: skill?.ownerEmail ?? (await getCurrentUserEmail()),
      kind,
      mentionEmails: resolveMentionEmails(projectAuthors, await getProfessionals()),
    });

    // A IA local roda fora do navegador do usuario, entao o POST precisa ir para a
    // instalacao publica do app — nao para o localhost de quem gerou o prompt.
    const origin = (process.env.APP_PUBLIC_URL || request.nextUrl.origin).replace(/\/+$/, "");

    // O titulo e a descricao vem do ClickUp agora, nao do que a tela enviou.
    const freshCards = await Promise.all(
      cards.map(async (card) => {
        const fresh = await fetchTaskContent(card.id);
        return fresh ? { ...card, title: fresh.title, content: fresh.description } : card;
      })
    );

    const ingestUrl = `${origin}/api/architect/ingest`;
    const progressUrl = `${origin}/api/architect/progress`;

    let prompt: string;
    if (kind === "dev") {
      // O prompt do dev ja foi escrito pelo arquiteto e esta gravado: aqui ele so
      // ganha o bloco de progresso, com um token proprio deste lote.
      const card = freshCards[0];
      const analysis = await getCachedAnalysis(provider, card.id);
      const devPrompt = analysis?.architecturePayload?.devPrompt ?? "";

      if (!devPrompt.trim()) {
        return NextResponse.json(
          { error: "Este card não tem prompt de desenvolvimento gravado." },
          { status: 400 }
        );
      }

      prompt = buildLocalDevPrompt({
        card: { ...card, devPrompt },
        token,
        progressUrl,
      });
    } else if (kind === "review") {
      // O revisor precisa da especificacao, nao da descricao do card: ele confere
      // a org contra o devPrompt que o arquiteto gerou.
      const reviewCards: ReviewPromptCard[] = [];
      for (const card of freshCards) {
        const analysis = await getCachedAnalysis(provider, card.id);
        const devPrompt = analysis?.architecturePayload?.devPrompt ?? "";
        if (!devPrompt.trim()) continue;
        reviewCards.push({ ...card, devPrompt });
      }

      if (!reviewCards.length) {
        return NextResponse.json(
          { error: "Nenhum dos cards tem prompt de desenvolvimento para revisar." },
          { status: 400 }
        );
      }

      prompt = buildLocalReviewPrompt({
        project,
        cards: reviewCards,
        token,
        ingestUrl,
        progressUrl,
        systemPrompt: await getPromptContent(REVIEW_PROMPT_KEY),
      });
    } else {
      prompt = buildLocalArchitectPrompt({
        project,
        cards: freshCards,
        token,
        ingestUrl,
        progressUrl,
        systemPrompt: await getPromptContent(ARCHITECT_RESEARCH_PROMPT_KEY),
      });
    }

    return NextResponse.json({ prompt, expiresAt: job.expiresAt, cardCount: cards.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar tarefa local.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
