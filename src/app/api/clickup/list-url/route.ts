import { NextResponse } from "next/server";
import { fetchListWebUrl } from "@/lib/clickup";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) {
    return NextResponse.json({ error: "CLICKUP_LIST_ID não configurado." }, { status: 404 });
  }

  try {
    return NextResponse.json({ url: await fetchListWebUrl(listId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao montar o link do ClickUp.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
