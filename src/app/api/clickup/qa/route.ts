import { NextRequest, NextResponse } from "next/server";
import {
  createTaskComment,
  updateTaskStatus,
  uploadTaskAttachment,
} from "@/lib/clickup";
import { clearProgress } from "@/lib/progress-store";
import { readJsonBody } from "@/lib/read-json-body";
import { getCurrentUserEmail, isAllowedUser } from "@/lib/require-allowed-user";

const DONE_STATUS = "deploy uat";
const BUG_STATUS = "bug";
const MAX_NOTE = 4000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  let id = "";
  let result = "";
  let note = "";
  let image: File | null = null;

  if (
    (request.headers.get("content-type") ?? "").includes("multipart/form-data")
  ) {
    const form = await request.formData().catch(() => null);
    id = typeof form?.get("id") === "string" ? (form.get("id") as string) : "";
    result =
      typeof form?.get("result") === "string"
        ? (form.get("result") as string)
        : "";
    note =
      typeof form?.get("note") === "string"
        ? (form.get("note") as string).trim()
        : "";
    const file = form?.get("image");
    image = file instanceof File && file.size > 0 ? file : null;
  } else {
    const body = (await readJsonBody(request)) as Record<
      string,
      unknown
    > | null;
    id = typeof body?.id === "string" ? body.id : "";
    result = typeof body?.result === "string" ? body.result : "";
    note = typeof body?.note === "string" ? body.note.trim() : "";
  }

  const done = result === "done";
  const bug = result === "bug";

  if (
    image &&
    (!image.type.startsWith("image/") || image.size > MAX_IMAGE_BYTES)
  ) {
    return NextResponse.json(
      { error: "O print precisa ser uma imagem de até 4 MB." },
      { status: 400 },
    );
  }

  if (!id || (!done && !bug)) {
    return NextResponse.json(
      { error: "Dados do QA inválidos." },
      { status: 400 },
    );
  }
  if (bug && !note) {
    return NextResponse.json(
      { error: "A observação é obrigatória." },
      { status: 400 },
    );
  }
  if (note.length > MAX_NOTE) {
    return NextResponse.json(
      { error: "Observação longa demais." },
      { status: 400 },
    );
  }

  const status = done ? DONE_STATUS : BUG_STATUS;
  const author = (await getCurrentUserEmail()) ?? "QA";

  try {
    if (image) {
      await uploadTaskAttachment(id, image, image.name || "print.png");
    }
    if (note) {
      await createTaskComment(
        id,
        `QA ${done ? "aprovou" : "reportou bug"} (${author}): ${note}`,
        null,
      );
    }
    await updateTaskStatus(id, status);
    await clearProgress(id).catch(() => {});
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar o card no ClickUp.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
