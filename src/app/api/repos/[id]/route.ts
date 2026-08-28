import { NextResponse } from "next/server";
import { removeRepo } from "@/lib/repos-store";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  await removeRepo(id);
  return NextResponse.json({ ok: true });
}
