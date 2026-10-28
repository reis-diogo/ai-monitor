import { NextRequest, NextResponse } from "next/server";
import { parseEvent } from "@/lib/ai-activity/event";
import { recordEvent } from "@/lib/ai-activity/store";
import { readJsonBody } from "@/lib/read-json-body";
import { resolveSkillToken } from "@/lib/skill-tokens-store";

export async function POST(request: NextRequest) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const owner = await resolveSkillToken(token);
  if (!owner) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const events = (Array.isArray(body) ? body : [body]).flatMap((raw) => {
    const event = parseEvent(raw);
    return event ? [event] : [];
  });

  if (!events.length) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  try {
    for (const event of events) await recordEvent(owner.ownerEmail, event);
    return new NextResponse(null, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar o evento.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
