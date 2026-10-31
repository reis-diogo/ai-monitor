import { NextResponse } from "next/server";
import { backfillHistory } from "@/lib/productivity-backfill";
import { isPromptEditor } from "@/lib/require-allowed-user";

export const maxDuration = 300;

const HISTORY_DAYS = 90;

export async function POST() {
  if (!(await isPromptEditor())) {
    return NextResponse.json({ error: "Só o admin importa o histórico." }, { status: 403 });
  }
  try {
    return NextResponse.json({ results: await backfillHistory(HISTORY_DAYS) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao importar o histórico.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
