import { NextResponse } from "next/server";
import { listAnalyzedActivities } from "@/lib/analysis-cache";

export async function GET() {
  const activities = await listAnalyzedActivities();
  return NextResponse.json({ activities });
}
