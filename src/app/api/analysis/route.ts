import { NextResponse } from "next/server";
import { listAnalyzedActivities } from "@/lib/analysis-cache";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    return NextResponse.json({ activities: await listAnalyzedActivities() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar análises.";
    return NextResponse.json({ activities: [], error: message }, { status: 502 });
  }
}
