import { NextResponse } from "next/server";
import { listAnalyzedActivities } from "@/lib/analysis-cache";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const activities = await listAnalyzedActivities();
  return NextResponse.json({ activities });
}
