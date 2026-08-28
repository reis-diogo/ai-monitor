import { NextResponse } from "next/server";
import { fetchListTasks } from "@/lib/clickup";
import { ensurePoFromClickupEmail } from "@/lib/professionals-store";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) {
    return NextResponse.json({ tasks: [], error: "CLICKUP_LIST_ID não configurado." });
  }

  try {
    const tasks = await fetchListTasks(listId);

    const uniqueAuthors = new Map(tasks.map((task) => [task.authorEmail, task.authorName]));
    for (const [email, name] of uniqueAuthors) {
      await ensurePoFromClickupEmail(email, name);
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar tarefas do ClickUp.";
    return NextResponse.json({ tasks: [], error: message }, { status: 502 });
  }
}
