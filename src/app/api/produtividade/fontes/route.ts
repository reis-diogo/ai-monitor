import { NextRequest, NextResponse } from "next/server";
import { createListWebhook, deleteWebhook, fetchListName } from "@/lib/clickup";
import { addSource, listSources, removeSource, setSourceNickname } from "@/lib/productivity-store";
import { isPromptEditor } from "@/lib/require-allowed-user";

function parseListId(value: string): string | null {
  const text = value.trim();
  const fromUrl =
    text.match(/\/v\/l\/\d+-(\d+)-\d+/) ??
    text.match(/\/v\/li\/(\d+)/) ??
    text.match(/\/li\/(\d+)/);
  if (fromUrl) return fromUrl[1];
  return /^\d{5,}$/.test(text) ? text : null;
}

function webhookEndpoint(): string | null {
  const base = process.env.CLICKUP_WEBHOOK_URL ?? process.env.APP_PUBLIC_URL;
  if (!base || !base.startsWith("https://")) return null;
  return `${base.replace(/\/$/, "")}/api/clickup/webhook`;
}

export async function GET() {
  if (!(await isPromptEditor())) {
    return NextResponse.json({ error: "Só o admin vê isto." }, { status: 403 });
  }
  try {
    return NextResponse.json({ sources: await listSources() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar as listas.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isPromptEditor())) {
    return NextResponse.json({ error: "Só o admin cadastra listas." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const listId = parseListId(typeof body?.list === "string" ? body.list : "");
  if (!listId) {
    return NextResponse.json(
      { error: "Cole o link da lista do ClickUp ou o id numérico dela." },
      { status: 400 },
    );
  }

  const label = await fetchListName(listId);
  if (!label) {
    return NextResponse.json(
      {
        error:
          "O ClickUp não reconhece esse id como uma lista. Abra a lista no ClickUp e copie o link dela.",
      },
      { status: 400 },
    );
  }

  const endpoint = webhookEndpoint();
  let webhook: { id: string; secret: string } | null = null;
  let webhookError: string | null = null;
  if (!endpoint) {
    webhookError =
      "Sem endereço público https: a lista foi salva, mas o webhook só é criado na produção.";
  } else {
    try {
      webhook = await createListWebhook(listId, endpoint);
    } catch (error) {
      webhookError = error instanceof Error ? error.message : "Erro ao criar o webhook.";
    }
  }

  try {
    const source = await addSource({ projectName: null, listId, label, webhook });
    return NextResponse.json({ source, webhookError }, { status: 201 });
  } catch (error) {
    if (webhook) await deleteWebhook(webhook.id).catch(() => {});
    const message = error instanceof Error ? error.message : "Erro ao cadastrar a lista.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isPromptEditor())) {
    return NextResponse.json({ error: "Só o admin remove listas." }, { status: 403 });
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Informe a lista." }, { status: 400 });

  try {
    const webhookId = await removeSource(id);
    if (webhookId) await deleteWebhook(webhookId).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover a lista.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isPromptEditor())) {
    return NextResponse.json({ error: "Só o admin edita listas." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Informe a lista." }, { status: 400 });
  const nickname = typeof body?.nickname === "string" ? body.nickname.trim().slice(0, 60) : "";

  try {
    await setSourceNickname(id, nickname || null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar o apelido.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
