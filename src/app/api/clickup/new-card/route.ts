import { NextRequest, NextResponse } from "next/server";
import { ClickUpInputError, createListTask, fetchProjectOptions } from "@/lib/clickup";
import { readJsonBody } from "@/lib/read-json-body";
import { isAllowedUser, getCurrentUserEmail } from "@/lib/require-allowed-user";
import { createLocalJob } from "@/lib/local-jobs-store";
import { buildLocalPoPrompt } from "@/lib/ai/local-prompt";
import { getPromptContent } from "@/lib/prompts-store";
import { ARCHITECT_STRUCTURE_PROMPT_KEY } from "@/lib/ai/schema";

const MAX_NAME = 200;
const MAX_DESCRIPTION = 8000;

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) return NextResponse.json({ projects: [], error: "CLICKUP_LIST_ID não configurado." });

  try {
    return NextResponse.json({ projects: await fetchProjectOptions(listId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ler os projetos do ClickUp.";
    return NextResponse.json({ projects: [], error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) return NextResponse.json({ error: "CLICKUP_LIST_ID não configurado." }, { status: 500 });

  const body = (await readJsonBody(request)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";

  if (!name || name.length > MAX_NAME) {
    return NextResponse.json({ error: `Informe um título de até ${MAX_NAME} caracteres.` }, { status: 400 });
  }
  if (description.length > MAX_DESCRIPTION) {
    return NextResponse.json({ error: "Descrição grande demais." }, { status: 400 });
  }
  if (!projectId) {
    return NextResponse.json({ error: "Escolha o projeto." }, { status: 400 });
  }

  try {
    const task = await createListTask(listId, { name, description, projectId });
    const projectName = (await fetchProjectOptions(listId)).find((option) => option.id === projectId)?.name ?? "";

    let prompt = "";
    let promptError: string | null = null;
    try {
      const { token } = await createLocalJob({
        provider: "anthropic",
        project: projectName,
        activityIds: [task.id],
        createdBy: await getCurrentUserEmail(),
        kind: "po",
        mentionEmails: [],
      });
      const origin = (process.env.APP_PUBLIC_URL || request.nextUrl.origin).replace(/\/+$/, "");
      prompt = buildLocalPoPrompt({
        project: projectName,
        card: { id: task.id, customId: task.customId, title: name, content: description },
        token,
        ingestUrl: `${origin}/api/architect/ingest`,
        progressUrl: `${origin}/api/architect/progress`,
        systemPrompt: await getPromptContent(ARCHITECT_STRUCTURE_PROMPT_KEY),
      });
    } catch (error) {
      promptError = error instanceof Error ? error.message : "Erro ao gerar o prompt do arquiteto.";
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
