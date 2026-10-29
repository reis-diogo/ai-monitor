import { NextResponse } from "next/server";
import { fetchProjectProgress } from "@/lib/clickup";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) {
    return NextResponse.json({ progress: [], error: "CLICKUP_LIST_ID não configurado." });
  }

  try {
    return NextResponse.json({ progress: await fetchProjectProgress(listId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ler o progresso dos projetos.";
    return NextResponse.json({ progress: [], error: message }, { status: 502 });
  }
}
