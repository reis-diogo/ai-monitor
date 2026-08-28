import { NextRequest, NextResponse } from "next/server";
import { addAlias, removeAlias } from "@/lib/professionals-store";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function POST(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const authorName = body?.authorName;
  const alias = body?.alias;

  if (typeof authorName !== "string" || typeof alias !== "string" || !alias.trim()) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  try {
    const professionals = await addAlias(authorName, alias.trim());
    return NextResponse.json({ professionals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao adicionar apelido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const authorName = body?.authorName;
  const alias = body?.alias;

  if (typeof authorName !== "string" || typeof alias !== "string") {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const professionals = await removeAlias(authorName, alias);
  return NextResponse.json({ professionals });
}
