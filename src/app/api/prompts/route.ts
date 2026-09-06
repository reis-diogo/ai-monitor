import { NextRequest, NextResponse } from "next/server";
import { getPrompts, resetPrompt, savePrompt } from "@/lib/prompts-store";
import { isPromptEditor } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isPromptEditor())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    return NextResponse.json({ prompts: await getPrompts() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar prompts.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isPromptEditor())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const key = body?.key;
  const content = body?.content;
  const reset = body?.reset === true;

  if (typeof key !== "string") {
    return NextResponse.json({ error: "Informe o prompt." }, { status: 400 });
  }

  try {
    const prompt = reset ? await resetPrompt(key) : await savePrompt(key, String(content ?? ""));
    return NextResponse.json({ prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar prompt.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
