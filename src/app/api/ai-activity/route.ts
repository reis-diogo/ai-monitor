import { NextRequest, NextResponse } from "next/server";
import { deleteKnowledge, deletePrompts, getKnowledge, getSnapshot } from "@/lib/ai-activity/store";
import { getAiActivityEmail } from "@/lib/require-allowed-user";

export async function GET(request: NextRequest) {
  const email = await getAiActivityEmail();
  if (!email) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    const snapshot = await getSnapshot(email);
    const params = request.nextUrl.searchParams;

    if (params.get("since") === snapshot.rev && params.get("kb") !== "1") {
      return NextResponse.json({ rev: snapshot.rev, unchanged: true });
    }

    const knowledge = params.get("kb") === "1" ? await getKnowledge(email) : undefined;
    return NextResponse.json({ ...snapshot, knowledge });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar a atividade.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const email = await getAiActivityEmail();
  if (!email) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const prompt = params.get("prompt");
  const user = params.get("user");
  const kb = params.get("kb");
  const all = params.get("all");

  try {
    let deleted: number;
    if (prompt) deleted = await deletePrompts(email, { promptId: prompt });
    else if (user) deleted = await deletePrompts(email, { user });
    else if (all === "prompts") deleted = await deletePrompts(email, {});
    else if (kb) deleted = await deleteKnowledge(email, { id: kb });
    else if (all === "kb") deleted = await deleteKnowledge(email, {});
    else return NextResponse.json({ error: "Informe o que apagar." }, { status: 400 });

    return NextResponse.json({ deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao apagar.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
