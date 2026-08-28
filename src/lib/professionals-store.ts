import { promises as fs } from "fs";
import path from "path";
import type { Professional, ProfessionalRole } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "professionals.json");

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

export async function getProfessionals(): Promise<Professional[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw) as Professional[];
}

async function saveProfessionals(list: Professional[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}

export async function upsertProfessional(params: {
  authorName: string;
  role: ProfessionalRole;
  clickupEmail?: string;
  avatarUrl?: string;
}): Promise<Professional[]> {
  const list = await getProfessionals();
  const existing = list.find((p) => p.authorName === params.authorName);

  if (existing) {
    existing.role = params.role;
    if (params.clickupEmail) existing.clickupEmail = params.clickupEmail;
    if (params.avatarUrl) existing.avatarUrl = params.avatarUrl;
  } else {
    list.push({
      authorName: params.authorName,
      role: params.role,
      ...(params.clickupEmail ? { clickupEmail: params.clickupEmail } : {}),
      ...(params.avatarUrl ? { avatarUrl: params.avatarUrl } : {}),
    });
  }

  await saveProfessionals(list);
  return list;
}

export async function ensurePoFromClickupEmail(email: string, name: string): Promise<void> {
  const list = await getProfessionals();
  const alreadyRegistered = list.some(
    (p) => p.clickupEmail?.toLowerCase() === email.toLowerCase()
  );
  if (alreadyRegistered) return;

  list.push({
    authorName: name,
    role: "po",
    clickupEmail: email,
    aliases: [name],
  });

  await saveProfessionals(list);
}

export async function addAlias(authorName: string, alias: string): Promise<Professional[]> {
  const list = await getProfessionals();
  const existing = list.find((p) => p.authorName === authorName);
  if (!existing) {
    throw new Error("Classifique essa pessoa antes de adicionar um apelido.");
  }

  const aliases = new Set((existing.aliases ?? []).map((a) => a.toLowerCase()));
  aliases.add(alias.toLowerCase());
  existing.aliases = Array.from(aliases);

  await saveProfessionals(list);
  return list;
}

export async function removeAlias(authorName: string, alias: string): Promise<Professional[]> {
  const list = await getProfessionals();
  const existing = list.find((p) => p.authorName === authorName);
  if (existing?.aliases) {
    existing.aliases = existing.aliases.filter((a) => a.toLowerCase() !== alias.toLowerCase());
  }

  await saveProfessionals(list);
  return list;
}
