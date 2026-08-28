import { NextResponse } from "next/server";
import { fetchListStatuses } from "@/lib/clickup";

export async function GET() {
  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) {
    return NextResponse.json({ statuses: [], error: "CLICKUP_LIST_ID não configurado." });
  }

  try {
    const statuses = await fetchListStatuses(listId);
    return NextResponse.json({ statuses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar status do ClickUp.";
    return NextResponse.json({ statuses: [], error: message }, { status: 502 });
  }
}
