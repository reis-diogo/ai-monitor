import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export async function analyzeWithAnthropic<T extends z.ZodTypeAny>(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: T;
}): Promise<z.infer<T>> {
  const response = await getClient().messages.parse({
    model: "claude-opus-5",
    max_tokens: 2048,
    system: params.systemPrompt,
    output_config: {
      effort: "low",
      format: zodOutputFormat(params.schema),
    },
    messages: [{ role: "user", content: params.userPrompt }],
  });

  if (!response.parsed_output) {
    throw new Error("Não foi possível interpretar a resposta da IA (Claude).");
  }

  return response.parsed_output;
}
