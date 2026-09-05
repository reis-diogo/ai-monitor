export type PullRequestInfo = {
  number: number;
  title: string;
  url: string;
  authorName: string | null;
  branchName: string;
};

export type RegisteredRepo = {
  id: string;
  owner: string;
  name: string;
  url: string;
  addedAt: string;
};

export type Project = {
  id: string;
  name: string;
  scope?: string;
};

export type CommitActivity = {
  sha: string;
  message: string;
  authorName: string;
  authorAvatarUrl: string | null;
  url: string;
  date: string;
  additions: number;
  deletions: number;
  diff: string;
  repoOwner: string;
  repoName: string;
};

export type AuthorActivity = {
  login: string;
  avatarUrl: string | null;
  totalAdditions: number;
  totalDeletions: number;
  commits: CommitActivity[];
};

export type ClickUpTaskActivity = {
  id: string;
  customId: string | null;
  name: string;
  description: string;
  authorName: string;
  authorEmail: string;
  authorAvatarUrl: string | null;
  authorClickupId: number | null;
  url: string;
  date: string;
  location: string;
  status: string;
  statusColor: string;
};

export type ClickUpStatusOption = {
  status: string;
  color: string;
};

export type AiProvider = "anthropic" | "openai" | "gemini";

export type ActivitySource = "commit" | "clickup";

export type ActivityItem = {
  id: string;
  source: ActivitySource;
  customId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  authorClickupId: number | null;
  title: string;
  content: string;
  url: string;
  date: string;
  location: string;
  additions: number | null;
  deletions: number | null;
  status: string | null;
  statusColor: string | null;
};

export type CommitAnalysis = {
  intent: string;
  score: number;
  critique: string;
  provider: AiProvider;
};

export type AnalyzedActivityRecord = CommitAnalysis & {
  id: string;
  source: ActivitySource;
  authorName: string;
  authorAvatarUrl: string | null;
  title: string;
  url: string;
  date: string;
  location: string;
  additions: number | null;
  deletions: number | null;
  analyzedAt: string;
  difficulty?: number | null;
  difficultyReasoning?: string | null;
};

export type ProfessionalRole = "dev" | "po";

export type Professional = {
  authorName: string;
  role: ProfessionalRole;
  clickupEmail?: string;
  avatarUrl?: string;
  aliases?: string[];
};

export type ProjectScopeAnalysis = {
  score: number;
  critique: string;
  missingTopics: string[];
  outOfScopeWork: string[];
  overDelivery: string[];
  provider: AiProvider;
};

export type AnalyzedProjectRecord = ProjectScopeAnalysis & {
  projectId: string;
  projectName: string;
  commitCount: number;
  analyzedAt: string;
};
