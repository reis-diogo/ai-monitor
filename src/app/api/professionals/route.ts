import { NextRequest, NextResponse } from "next/server";
import { getProfessionals, upsertProfessional } from "@/lib/professionals-store";

export async function GET() {
  const professionals = await getProfessionals();
  return NextResponse.json({ professionals });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const authorName = body?.authorName;
  const role = body?.role;
  const clickupEmail = body?.clickupEmail;
  const avatarUrl = body?.avatarUrl;

  if (typeof authorName !== "string" || !authorName.trim() || (role !== "dev" && role !== "po")) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const professionals = await upsertProfessional({
    authorName: authorName.trim(),
    role,
    clickupEmail:
      typeof clickupEmail === "string" && clickupEmail.trim() ? clickupEmail.trim() : undefined,
    avatarUrl: typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : undefined,
  });

  return NextResponse.json({ professionals });
}
