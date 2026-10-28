import { NextRequest, NextResponse } from "next/server";
import { buildHookInstallPrompt } from "@/lib/ai-activity/install-prompt";
import { getAiActivityEmail } from "@/lib/require-allowed-user";
import { createSkillToken } from "@/lib/skill-tokens-store";

export async function POST(request: NextRequest) {
  const email = await getAiActivityEmail();
  if (!email) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userName =
    typeof body?.userName === "string" && body.userName.trim() ? body.userName.trim() : email;

  try {
    const { token } = await createSkillToken({ ownerEmail: email, label: "atividade de ia" });
    const apiBase = (process.env.APP_PUBLIC_URL || request.nextUrl.origin).replace(/\/+$/, "");

    return NextResponse.json({
      installPrompt: buildHookInstallPrompt({ apiBase, token, userName }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar o token.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
