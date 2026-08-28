import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI();
  return client;
}

export async function analyzeWithOpenAI<T extends z.ZodTypeAny>(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: T;
  schemaName: string;
}): Promise<z.infer<T>> {
  const completion = await getClient().chat.completions.parse({
    model: MODEL,
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userPrompt },
    ],
    response_format: zodResponseFormat(params.schema, params.schemaName),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("Não foi possível interpretar a resposta da IA (OpenAI).");
  }

  return parsed as z.infer<T>;
}
