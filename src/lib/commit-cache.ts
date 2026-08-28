import { getSupabase } from "@/lib/supabase";
import type { CommitActivity } from "@/lib/types";

type CommitCacheRow = {
  repo_owner: string;
  repo_name: string;
  sha: string;
  message: string;
  author_name: string;
  author_avatar_url: string | null;
  url: string;
  date: string;
  additions: number;
  deletions: number;
  diff: string;
};

function rowToCommit(row: CommitCacheRow): CommitActivity {
  return {
    sha: row.sha,
    message: row.message,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    url: row.url,
    date: row.date,
    additions: row.additions,
    deletions: row.deletions,
    diff: row.diff,
    repoOwner: row.repo_owner,
    repoName: row.repo_name,
  };
}

export async function getCachedCommits(
  owner: string,
  name: string
): Promise<Map<string, CommitActivity>> {
  const { data, error } = await getSupabase()
    .from("commit_cache")
    .select("*")
    .eq("repo_owner", owner)
    .eq("repo_name", name);

  if (error) throw new Error(`Erro ao ler cache de commits: ${error.message}`);

  const map = new Map<string, CommitActivity>();
  for (const row of (data ?? []) as CommitCacheRow[]) {
    map.set(row.sha, rowToCommit(row));
  }
  return map;
}

export async function setCachedCommits(
  owner: string,
  name: string,
  commits: CommitActivity[]
): Promise<void> {
  if (commits.length === 0) return;

  const rows: CommitCacheRow[] = commits.map((c) => ({
    repo_owner: owner,
    repo_name: name,
    sha: c.sha,
    message: c.message,
    author_name: c.authorName,
    author_avatar_url: c.authorAvatarUrl,
    url: c.url,
    date: c.date,
    additions: c.additions,
    deletions: c.deletions,
    diff: c.diff,
  }));

  const { error } = await getSupabase()
    .from("commit_cache")
    .upsert(rows, { onConflict: "repo_owner,repo_name,sha" });

  if (error) throw new Error(`Erro ao salvar cache de commits: ${error.message}`);
}
