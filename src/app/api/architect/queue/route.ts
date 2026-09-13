import { NextRequest, NextResponse } from "next/server";
import { fetchListTasks } from "@/lib/clickup";
import { resolveSkillToken } from "@/lib/skill-tokens-store";
import { ARCHITECT_QUEUE_STATUS } from "@/lib/architect-apply";

function bearerToken(request: NextRequest): string {
  const header = request.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

// Chamada pela skill que roda na maquina da pessoa, sem sessao do Clerk: autentica
// pelo token de skill, que e por pessoa e revogavel.
export async function GET(request: NextRequest) {
  const skill = await resolveSkillToken(bearerToken(request));
  if (!skill) {
    return NextResponse.json({ error: "Token inválido ou revogado." }, { status: 401 });
  }

  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) {
    return NextResponse.json({ error: "CLICKUP_LIST_ID não configurado." }, { status: 500 });
  }

  try {
    const tasks = await fetchListTasks(listId);
    const pending = tasks.filter(
      (task) => task.status?.toLowerCase() === ARCHITECT_QUEUE_STATUS
    );

    const byProject = new Map<string, { id: string; customId: string | null; title: string }[]>();
    for (const task of pending) {
      const cards = byProject.get(task.location) ?? [];
      cards.push({ id: task.id, customId: task.customId, title: task.name });
      byProject.set(task.location, cards);
    }

    const projects = Array.from(byProject.entries())
      .map(([project, cards]) => ({ project, pending: cards.length, cards }))
      .sort((a, b) => b.pending - a.pending);

    return NextResponse.json({ status: ARCHITECT_QUEUE_STATUS, projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ler a fila do ClickUp.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
