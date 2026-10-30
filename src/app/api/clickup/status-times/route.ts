import { NextRequest, NextResponse } from "next/server";
import { fetchStatusMinutes } from "@/lib/clickup";
import { isAllowedUser } from "@/lib/require-allowed-user";

const MAX_IDS = 300;

export async function GET(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);
  try {
    return NextResponse.json({ times: await fetchStatusMinutes(ids) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ler os tempos.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
