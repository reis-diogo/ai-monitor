import { NextRequest, NextResponse } from "next/server";
import { ClickUpInputError, createListTask, fetchNewCardSetup } from "@/lib/clickup";
import { listSources } from "@/lib/productivity-store";
import { readJsonBody } from "@/lib/read-json-body";
import { createLocalJob } from "@/lib/local-jobs-store";
import { buildProgressSection } from "@/lib/ai/local-prompt";
import { isAllowedUser, getCurrentUserEmail } from "@/lib/require-allowed-user";
import { getPromptContent } from "@/lib/prompts-store";
import { ARCHITECT_RESEARCH_PROMPT_KEY } from "@/lib/ai/schema";
import { REFINE_STATUS } from "@/lib/architect-gate";

const MAX_NAME = 200;
const MAX_DESCRIPTION = 8000;

function parseDate(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = new Date(`${value}T12:00:00`).getTime();
  return Number.isFinite(time) ? time : null;
}

export async function GET(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    const sources = await listSources();
    const lists = sources.map((source) => ({
      listId: source.listId,
      label: source.nickname ?? source.label ?? source.listId,
    }));
    const defaultList = process.env.CLICKUP_LIST_ID;
    const requested = request.nextUrl.searchParams.get("list");
    const listId =
      requested ??
      lists.find((item) => item.listId === defaultList)?.listId ??
      lists[0]?.listId ??
      null;
    if (!listId || !lists.some((item) => item.listId === listId)) {
      return NextResponse.json({ lists, listId: null, projects: null, initialStatus: null });
    }
    const setup = await fetchNewCardSetup(listId);
    return NextResponse.json({ lists, listId, ...setup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ler a lista do ClickUp.";
    return NextResponse.json({ lists: [], projects: null, error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = (await readJsonBody(request)) as Record<string, unknown> | null;
  const listId = typeof body?.listId === "string" ? body.listId : "";
  const monitored = (await listSources().catch(() => [])).find((source) => source.listId === listId);
  if (!monitored) {
    return NextResponse.json({ error: "Escolha um dos links monitorados." }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";

  if (!name || name.length > MAX_NAME) {
    return NextResponse.json({ error: `Informe um título de até ${MAX_NAME} caracteres.` }, { status: 400 });
  }
  if (description.length > MAX_DESCRIPTION) {
    return NextResponse.json({ error: "Descrição grande demais." }, { status: 400 });
  }
  const startDate = parseDate(body?.startDate);
  const dueDate = parseDate(body?.dueDate);
  if (startDate && dueDate && dueDate < startDate) {
    return NextResponse.json({ error: "A data final não pode ser antes da inicial." }, { status: 400 });
  }

  try {
    const setup = await fetchNewCardSetup(listId);
    if (setup.projects && !projectId) {
      return NextResponse.json({ error: "Escolha o projeto." }, { status: 400 });
    }
    const task = await createListTask(listId, {
      name,
      description,
      projectId: setup.projects ? projectId : null,
      startDate,
      dueDate,
    });
    const projectName = setup.projects?.find((option) => option.id === projectId)?.name ?? "";

    let prompt = "";
    let promptError: string | null = null;
    const refinesWithArchitect =
      listId === process.env.CLICKUP_LIST_ID && task.status?.toLowerCase() === REFINE_STATUS;
    if (refinesWithArchitect) {
      try {
        // Juncao literal: o prompt que esta na tela, mais o card. Sem molde proprio e
        // sem nada gerado aqui — o que o usuario editar na aba do arquiteto e
        // exatamente o que ele cola no editor.
        const architectPrompt = await getPromptContent(ARCHITECT_RESEARCH_PROMPT_KEY);
        const label = task.customId ?? task.id;

        // O lote existe so pelo token do progresso: aqui nao ha POST de resultado, e a
        // IA local nao tem outro jeito de dizer que esta trabalhando neste card.
        const { token } = await createLocalJob({
          provider: "anthropic",
          project: projectName,
          activityIds: [task.id],
          createdBy: await getCurrentUserEmail(),
          kind: "po",
          mentionEmails: [],
        });
        const origin = (process.env.APP_PUBLIC_URL || request.nextUrl.origin).replace(/\/+$/, "");

        // Card e progresso vem ANTES do prompt do arquiteto. Ele tem 30 mil caracteres:
        // instrucao operacional colocada depois disso vira rodape e nao e executada —
        // foi o que aconteceu, os primeiros cards nao mandaram progresso nenhum.
        prompt = [
          `## Card\n\n${label}\nactivityId: ${task.id}\nProjeto: ${projectName}\nTítulo: ${name}\n\n${
            description || "(sem descrição)"
          }`,
          buildProgressSection({
            progressUrl: `${origin}/api/architect/progress`,
            token,
            examples: `"escolhendo a org", "lendo os metadados", "conversando com o P.O.", "escrevendo o prompt do dev"`,
            closingNote: `Aqui não existe POST de resultado: mande \`"state":"done"\` no último POST, quando terminar, senão o indicador fica aceso até expirar sozinho.`,
          }),
          architectPrompt.trim(),
        ].join("\n\n---\n\n");
      } catch (error) {
        promptError = error instanceof Error ? error.message : "Erro ao ler o prompt do arquiteto.";
      }
    }

    return NextResponse.json({ task, prompt, promptError });
  } catch (error) {
    if (error instanceof ClickUpInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao criar o card no ClickUp.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
