export type ActivityStatus = "running" | "waiting" | "done" | "error";

export type ActivityPrompt = {
  id: string;
  user: string;
  status: ActivityStatus;
  summary: string;
  subject: string;
  area: string | null;
  project: string;
  repo: string | null;
  activity: string | null;
  tokensIn: number;
  tokensOut: number;
  startedAt: string;
  endedAt: string | null;
  updatedAt: string;
  kbId: string | null;
};

export type KnowledgeSnippet = { lang: string; code: string };

export type KnowledgeNote = {
  id: string;
  promptId: string | null;
  title: string;
  technologies: string[];
  summary: string;
  steps: string[];
  connection: string;
  gotchas: string[];
  snippets: KnowledgeSnippet[];
  user: string;
  project: string;
  subject: string;
  createdAt: string;
};

export type ActivitySnapshot = {
  rev: string;
  prompts: ActivityPrompt[];
  knowledgeCount: number;
};
