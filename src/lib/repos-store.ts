import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { RegisteredRepo } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "repos.json");

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

export async function getRepos(): Promise<RegisteredRepo[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw) as RegisteredRepo[];
}

async function saveRepos(repos: RegisteredRepo[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(repos, null, 2), "utf-8");
}

export function parseRepoUrl(input: string): { owner: string; name: string } | null {
  const trimmed = input.trim();

  const shorthandMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shorthandMatch) {
    return { owner: shorthandMatch[1], name: shorthandMatch[2].replace(/\.git$/, "") };
  }

  try {
    const url = new URL(trimmed);
    if (!url.hostname.includes("github.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], name: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

export async function addRepo(input: string): Promise<RegisteredRepo> {
  const parsed = parseRepoUrl(input);
  if (!parsed) {
    throw new Error("Link de repositório inválido. Use uma URL do GitHub ou o formato owner/repo.");
  }

  const repos = await getRepos();
  const alreadyExists = repos.some(
    (r) => r.owner.toLowerCase() === parsed.owner.toLowerCase() && r.name.toLowerCase() === parsed.name.toLowerCase()
  );
  if (alreadyExists) {
    throw new Error("Esse repositório já está cadastrado.");
  }

  const repo: RegisteredRepo = {
    id: randomUUID(),
    owner: parsed.owner,
    name: parsed.name,
    url: `https://github.com/${parsed.owner}/${parsed.name}`,
    addedAt: new Date().toISOString(),
  };

  repos.push(repo);
  await saveRepos(repos);
  return repo;
}

export async function removeRepo(id: string): Promise<void> {
  const repos = await getRepos();
  const next = repos.filter((r) => r.id !== id);
  await saveRepos(next);
}
