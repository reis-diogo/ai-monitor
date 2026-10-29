import { NextResponse } from "next/server";
import { readStatusFeed } from "@/lib/clickup-feed";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) {
    return NextResponse.json({ events: [], error: "CLICKUP_LIST_ID não configurado." });
  }

  try {
    return NextResponse.json({ events: await readStatusFeed(listId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ler o histórico do ClickUp.";
    return NextResponse.json({ events: [], error: message }, { status: 502 });
  }
}
