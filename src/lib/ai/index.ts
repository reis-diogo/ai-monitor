import type { ActivitySource, AiProvider, CommitAnalysis, ProjectScopeAnalysis } from "@/lib/types";
import { analyzeWithAnthropic } from "@/lib/ai/anthropic";
import { analyzeWithOpenAI } from "@/lib/ai/openai";
import { analyzeWithGemini } from "@/lib/ai/gemini";
import {
  ActivityAnalysisSchema,
  COMMIT_SYSTEM_PROMPT,
  PO_TASK_SYSTEM_PROMPT,
  ProjectScopeAnalysisSchema,
  PROJECT_SCOPE_SYSTEM_PROMPT,
  buildCommitUserPrompt,
  buildPoTaskUserPrompt,
  buildProjectScopeUserPrompt,
} from "@/lib/ai/schema";

export async function analyzeActivity(
  provider: AiProvider,
  source: ActivitySource,
  params: { title: string; content: string }
): Promise<CommitAnalysis> {
  const systemPrompt = source === "clickup" ? PO_TASK_SYSTEM_PROMPT : COMMIT_SYSTEM_PROMPT;
  const userPrompt =
    source === "clickup"
      ? buildPoTaskUserPrompt({ title: params.title, description: params.content })
      : buildCommitUserPrompt({ message: params.title, diff: params.content });

  const result =
    provider === "openai"
      ? await analyzeWithOpenAI({
          systemPrompt,
          userPrompt,
          schema: ActivityAnalysisSchema,
          schemaName: "activity_analysis",
        })
      : provider === "gemini"
        ? await analyzeWithGemini({ systemPrompt, userPrompt, schema: ActivityAnalysisSchema })
        : await analyzeWithAnthropic({ systemPrompt, userPrompt, schema: ActivityAnalysisSchema });

  return { ...result, provider };
}

export async function analyzeProjectScope(
  provider: AiProvider,
  params: { scope: string; commits: { message: string; date: string }[] }
): Promise<ProjectScopeAnalysis> {
  const systemPrompt = PROJECT_SCOPE_SYSTEM_PROMPT;
  const userPrompt = buildProjectScopeUserPrompt(params);

  const result =
    provider === "openai"
      ? await analyzeWithOpenAI({
          systemPrompt,
          userPrompt,
          schema: ProjectScopeAnalysisSchema,
          schemaName: "project_scope_analysis",
        })
      : provider === "gemini"
        ? await analyzeWithGemini({ systemPrompt, userPrompt, schema: ProjectScopeAnalysisSchema })
        : await analyzeWithAnthropic({ systemPrompt, userPrompt, schema: ProjectScopeAnalysisSchema });

  return { ...result, provider };
}
