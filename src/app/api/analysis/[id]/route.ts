import { NextRequest, NextResponse } from "next/server";
import { getAnalyzedActivity } from "@/lib/analysis-cache";
import { isAllowedUser } from "@/lib/require-allowed-user";
import type { AiProvider } from "@/lib/types";

function parseProvider(value: string | null): AiProvider {
  if (value === "openai" || value === "gemini") return value;
  return "anthropic";
}

// O parecer completo, um card por vez. A listagem devolve so as notas — carregar
// todos os pareceres a cada sincronizacao foi o que estourou a cota de egress.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const provider = parseProvider(request.nextUrl.searchParams.get("provider"));

  try {
    const analysis = await getAnalyzedActivity(provider, id);
    if (!analysis) {
      return NextResponse.json({ error: "Análise não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ler a análise.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
