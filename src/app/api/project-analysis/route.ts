import { NextResponse } from "next/server";
import { listProjectAnalyses } from "@/lib/project-analysis-cache";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const analyses = await listProjectAnalyses();
  return NextResponse.json({ analyses });
}
