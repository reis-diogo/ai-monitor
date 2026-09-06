import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import type { AiProvider } from "@/lib/types";

export const SALESFORCE_DOC_DOMAINS = [
  "help.salesforce.com",
  "developer.salesforce.com",
  "trailhead.salesforce.com",
  "architect.salesforce.com",
  "resources.docs.salesforce.com",
];

const MAX_SEARCH_ITERATIONS = 6;

async function researchWithAnthropic(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: params.userPrompt },
  ];

  for (let i = 0; i < MAX_SEARCH_ITERATIONS; i += 1) {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: params.systemPrompt,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 8,
          allowed_domains: SALESFORCE_DOC_DOMAINS,
        },
      ],
      messages,
    });

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
  }

  throw new Error("A pesquisa na documentação excedeu o limite de iterações (Claude).");
}

async function researchWithGemini(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não configurado em .env.local");
  }

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: params.userPrompt,
    config: {
      systemInstruction: params.systemPrompt,
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("A pesquisa na documentação não retornou conteúdo (Gemini).");
  }
  return text;
}

async function researchWithOpenAI(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const client = new OpenAI();
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    instructions: params.systemPrompt,
    input: params.userPrompt,
    tools: [{ type: "web_search" }],
  });

  const text = response.output_text?.trim();
  if (!text) {
    throw new Error("A pesquisa na documentação não retornou conteúdo (OpenAI).");
  }
  return text;
}

export async function researchSalesforceDocs(
  provider: AiProvider,
  params: { systemPrompt: string; userPrompt: string }
): Promise<string> {
  if (provider === "gemini") return researchWithGemini(params);
  if (provider === "openai") return researchWithOpenAI(params);
  return researchWithAnthropic(params);
}
