import { NextRequest, NextResponse } from "next/server";
import {
  getProfessionals,
  removeProfessional,
  upsertProfessional,
} from "@/lib/professionals-store";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const professionals = await getProfessionals();
  return NextResponse.json({ professionals });
}

export async function POST(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const authorName = body?.authorName;
  const role = body?.role;
  const clickupEmail = body?.clickupEmail;
  const avatarUrl = body?.avatarUrl;

  if (typeof authorName !== "string" || !authorName.trim() || (role !== "dev" && role !== "po")) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const professionals = await upsertProfessional({
    authorName: authorName.trim(),
    role,
    clickupEmail:
      typeof clickupEmail === "string" && clickupEmail.trim() ? clickupEmail.trim() : undefined,
    avatarUrl: typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : undefined,
  });

  return NextResponse.json({ professionals });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const authorName = body?.authorName;

  if (typeof authorName !== "string" || !authorName.trim()) {
    return NextResponse.json({ error: "Informe a pessoa." }, { status: 400 });
  }

  try {
    return NextResponse.json({ professionals: await removeProfessional(authorName.trim()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover profissional.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
