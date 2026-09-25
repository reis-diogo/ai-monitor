import { NextResponse } from "next/server";
import { fetchStatusDwell } from "@/lib/status-dwell-store";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    return NextResponse.json({ dwell: await fetchStatusDwell() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ler o tempo em status.";
    return NextResponse.json({ dwell: [], error: message }, { status: 502 });
  }
}
