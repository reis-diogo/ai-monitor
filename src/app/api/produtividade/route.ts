import { NextRequest, NextResponse } from "next/server";
import { fetchProductivity, listSources } from "@/lib/productivity-store";
import { isPromptEditor } from "@/lib/require-allowed-user";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!(await isPromptEditor())) {
    return NextResponse.json({ error: "Só o admin vê a produtividade." }, { status: 403 });
  }

  const days = Math.min(365, Math.max(1, Number(request.nextUrl.searchParams.get("days")) || 30));
  const project = request.nextUrl.searchParams.get("project") || null;
  const listId = request.nextUrl.searchParams.get("list") || null;

  try {
    const [people, sources] = await Promise.all([
      fetchProductivity({
        sinceIso: new Date(Date.now() - days * DAY_MS).toISOString(),
        project,
        listId,
      }),
      listSources(),
    ]);
    return NextResponse.json({
      people,
      sources: sources.map((source) => ({
        listId: source.listId,
        label: source.nickname ?? source.label ?? source.listId,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ler a produtividade.";
    return NextResponse.json({ people: [], error: message }, { status: 502 });
  }
}
