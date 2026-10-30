import { NextResponse } from "next/server";
import { fetchTeamMemberAvatar } from "@/lib/clickup";
import { getCurrentUserEmail, isAllowedUser } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }
  const email = await getCurrentUserEmail();
  if (!email) return NextResponse.json({ avatar: null });

  try {
    return NextResponse.json({ avatar: await fetchTeamMemberAvatar(email) });
  } catch {
    return NextResponse.json({ avatar: null });
  }
}
