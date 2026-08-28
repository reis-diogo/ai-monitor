import { NextResponse } from "next/server";
import { removeRepo } from "@/lib/repos-store";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await removeRepo(id);
  return NextResponse.json({ ok: true });
}
