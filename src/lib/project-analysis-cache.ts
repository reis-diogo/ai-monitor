import { promises as fs } from "fs";
import path from "path";
import type { AiProvider, AnalyzedProjectRecord } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_FILE = path.join(DATA_DIR, "project-analysis-cache.json");

function cacheKey(provider: AiProvider, projectId: string): string {
  return `${provider}:${projectId}`;
}

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(CACHE_FILE);
  } catch {
    await fs.writeFile(CACHE_FILE, "{}", "utf-8");
  }
}

async function readCache(): Promise<Record<string, AnalyzedProjectRecord>> {
  await ensureFile();
  const raw = await fs.readFile(CACHE_FILE, "utf-8");
  return JSON.parse(raw) as Record<string, AnalyzedProjectRecord>;
}

export async function getCachedProjectAnalysis(
  provider: AiProvider,
  projectId: string
): Promise<AnalyzedProjectRecord | null> {
  const cache = await readCache();
  return cache[cacheKey(provider, projectId)] ?? null;
}

export async function setCachedProjectAnalysis(
  provider: AiProvider,
  projectId: string,
  record: AnalyzedProjectRecord
): Promise<void> {
  const cache = await readCache();
  cache[cacheKey(provider, projectId)] = record;
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

export async function listProjectAnalyses(): Promise<AnalyzedProjectRecord[]> {
  const cache = await readCache();
  return Object.values(cache).sort(
    (a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
  );
}

export async function removeProjectAnalyses(projectId: string): Promise<void> {
  const cache = await readCache();
  for (const key of Object.keys(cache)) {
    if (cache[key].projectId === projectId) {
      delete cache[key];
    }
  }
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}
