import { promises as fs } from "fs";
import path from "path";
import type { CommitActivity } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_FILE = path.join(DATA_DIR, "commit-cache.json");

function cacheKey(owner: string, name: string, sha: string): string {
  return `${owner}/${name}:${sha}`;
}

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(CACHE_FILE);
  } catch {
    await fs.writeFile(CACHE_FILE, "{}", "utf-8");
  }
}

async function readCache(): Promise<Record<string, CommitActivity>> {
  await ensureFile();
  const raw = await fs.readFile(CACHE_FILE, "utf-8");
  return JSON.parse(raw) as Record<string, CommitActivity>;
}

export async function getCachedCommits(
  owner: string,
  name: string
): Promise<Map<string, CommitActivity>> {
  const cache = await readCache();
  const prefix = `${owner}/${name}:`;
  const map = new Map<string, CommitActivity>();

  for (const [key, commit] of Object.entries(cache)) {
    if (key.startsWith(prefix)) map.set(commit.sha, commit);
  }

  return map;
}

export async function setCachedCommits(
  owner: string,
  name: string,
  commits: CommitActivity[]
): Promise<void> {
  const cache = await readCache();
  for (const commit of commits) {
    cache[cacheKey(owner, name, commit.sha)] = commit;
  }
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}
