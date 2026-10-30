import { NextResponse } from "next/server";
import { isAllowedUser } from "@/lib/require-allowed-user";
import { fetchStarted } from "@/lib/started-store";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  try {
    return NextResponse.json({ started: await fetchStarted() });
  } catch {
    return NextResponse.json({ started: {} });
  }
}
