import { NextResponse } from "next/server";
import { listProjectAnalyses } from "@/lib/project-analysis-cache";

export async function GET() {
  const analyses = await listProjectAnalyses();
  return NextResponse.json({ analyses });
}
