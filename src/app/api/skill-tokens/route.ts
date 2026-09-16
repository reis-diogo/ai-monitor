import { NextRequest, NextResponse } from "next/server";
import {
  createSkillToken,
  listSkillTokens,
  revokeSkillToken,
} from "@/lib/skill-tokens-store";
import { getCurrentUserEmail, isAllowedUser } from "@/lib/require-allowed-user";
import { buildSkillInstallPrompt, skillName, type ApiSkillKind } from "@/lib/ai/skill-prompt";
import { ARCHITECT_QUEUE_STATUS } from "@/lib/architect-apply";
import { REVIEW_QUEUE_STATUS } from "@/lib/review-apply";

export async function GET() {
  const email = await getCurrentUserEmail();
  if (!email || !(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    return NextResponse.json({ tokens: await listSkillTokens(email) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar os tokens.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const email = await getCurrentUserEmail();
  if (!email || !(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const skill: ApiSkillKind = body?.skill === "review" ? "review" : "architect";
  const label =
    typeof body?.label === "string" && body.label.trim()
      ? body.label.trim()
      : `skill ${skillName(skill)}`;

  try {
    const { token, record } = await createSkillToken({ ownerEmail: email, label });

    // A skill roda fora do navegador: o prompt precisa apontar para a instalacao
    // publica, nao para o localhost de quem clicou no botao.
    const apiBase = (process.env.APP_PUBLIC_URL || request.nextUrl.origin).replace(/\/+$/, "");

    return NextResponse.json({
      token,
      record,
      skill,
      installPrompt: buildSkillInstallPrompt({
        apiBase,
        token,
        skill,
        queueStatus: skill === "review" ? REVIEW_QUEUE_STATUS : ARCHITECT_QUEUE_STATUS,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar o token.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const email = await getCurrentUserEmail();
  if (!email || !(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Informe o id do token." }, { status: 400 });
  }

  try {
    const revoked = await revokeSkillToken(id, email);
    if (!revoked) {
      return NextResponse.json({ error: "Token não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao revogar o token.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
