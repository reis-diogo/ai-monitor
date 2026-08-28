import { NextResponse } from "next/server";
import { getRepos } from "@/lib/repos-store";
import { fetchAllCommitsWithStats } from "@/lib/github";
import { getCachedCommits, setCachedCommits } from "@/lib/commit-cache";
import type { AuthorActivity, CommitActivity } from "@/lib/types";

async function fetchRepoCommits(owner: string, name: string): Promise<CommitActivity[]> {
  const cached = await getCachedCommits(owner, name);
  const commits = await fetchAllCommitsWithStats(owner, name, cached);
  await setCachedCommits(owner, name, commits);
  return commits;
}

export async function GET() {
  const repos = await getRepos();

  const results = await Promise.allSettled(
    repos.map((repo) => fetchRepoCommits(repo.owner, repo.name))
  );

  const commits: CommitActivity[] = [];
  const errors: string[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      commits.push(...result.value);
    } else {
      const repo = repos[i];
      const reason =
        result.reason instanceof Error ? result.reason.message : "erro desconhecido";
      errors.push(`${repo.owner}/${repo.name}: ${reason}`);
    }
  });

  const byAuthor = new Map<string, AuthorActivity>();

  for (const commit of commits) {
    const key = commit.authorName;
    if (!byAuthor.has(key)) {
      byAuthor.set(key, {
        login: commit.authorName,
        avatarUrl: commit.authorAvatarUrl,
        totalAdditions: 0,
        totalDeletions: 0,
        commits: [],
      });
    }
    const author = byAuthor.get(key)!;
    author.totalAdditions += commit.additions;
    author.totalDeletions += commit.deletions;
    author.commits.push(commit);
  }

  const authors = Array.from(byAuthor.values())
    .map((author) => ({
      ...author,
      commits: author.commits.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }))
    .sort((a, b) => b.commits.length - a.commits.length);

  return NextResponse.json({ authors, errors });
}
