import { promises as fs } from "fs";
import path from "path";
import type { AiProvider, AnalyzedActivityRecord } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_FILE = path.join(DATA_DIR, "analysis-cache.json");

function cacheKey(provider: AiProvider, id: string): string {
  return `${provider}:${id}`;
}

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(CACHE_FILE);
  } catch {
    await fs.writeFile(CACHE_FILE, "{}", "utf-8");
  }
}

async function readCache(): Promise<Record<string, AnalyzedActivityRecord>> {
  await ensureFile();
  const raw = await fs.readFile(CACHE_FILE, "utf-8");
  return JSON.parse(raw) as Record<string, AnalyzedActivityRecord>;
}

export async function getCachedAnalysis(
  provider: AiProvider,
  id: string
): Promise<AnalyzedActivityRecord | null> {
  const cache = await readCache();
  return cache[cacheKey(provider, id)] ?? null;
}

export async function setCachedAnalysis(
  provider: AiProvider,
  id: string,
  record: AnalyzedActivityRecord
): Promise<void> {
  const cache = await readCache();
  cache[cacheKey(provider, id)] = record;
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

export async function listAnalyzedActivities(): Promise<AnalyzedActivityRecord[]> {
  const cache = await readCache();
  return Object.values(cache).sort(
    (a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
  );
}
