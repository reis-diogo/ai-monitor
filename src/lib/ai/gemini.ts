import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurado em .env.local");
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

const schemaCache = new WeakMap<z.ZodTypeAny, Record<string, unknown>>();

function toResponseJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const cached = schemaCache.get(schema);
  if (cached) return cached;

  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  schemaCache.set(schema, jsonSchema);
  return jsonSchema;
}

function parseGeminiError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro ao analisar atividade com o Gemini.";
  }

  try {
    const parsed = JSON.parse(error.message);
    const inner = parsed?.error;

    if (inner?.code === 429 || inner?.status === "RESOURCE_EXHAUSTED") {
      const retryMatch = /retry in ([\d.]+)s/i.exec(inner.message ?? "");
      const retry = retryMatch ? ` Tente novamente em ~${Math.ceil(Number(retryMatch[1]))}s.` : "";
      return `Limite de requisições do Gemini atingido (free tier).${retry} Troque de provider ou aguarde.`;
    }

    if (inner?.message) {
      return `Erro do Gemini: ${inner.message}`;
    }
  } catch {
    return error.message;
  }

  return error.message;
}

export async function analyzeWithGemini<T extends z.ZodTypeAny>(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: T;
}): Promise<z.infer<T>> {
  let response;
  try {
    response = await getClient().models.generateContent({
      model: MODEL,
      contents: params.userPrompt,
      config: {
        systemInstruction: params.systemPrompt,
        responseMimeType: "application/json",
        responseJsonSchema: toResponseJsonSchema(params.schema),
      },
    });
  } catch (error) {
    throw new Error(parseGeminiError(error));
  }

  const text = response.text;
  if (!text) {
    throw new Error("Não foi possível interpretar a resposta da IA (Gemini).");
  }

  return params.schema.parse(JSON.parse(text));
}
