import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Project } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "projects.json");

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

export async function getProjects(): Promise<Project[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw) as Project[];
}

async function saveProjects(projects: Project[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(projects, null, 2), "utf-8");
}

export async function addProject(name: string): Promise<Project> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Informe o nome do projeto.");
  }

  const projects = await getProjects();
  const alreadyExists = projects.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (alreadyExists) {
    throw new Error("Esse projeto já está cadastrado.");
  }

  const project: Project = { id: randomUUID(), name: trimmed };
  projects.push(project);
  await saveProjects(projects);
  return project;
}

export async function removeProject(id: string): Promise<void> {
  const projects = await getProjects();
  const next = projects.filter((p) => p.id !== id);
  await saveProjects(next);
}

export async function setProjectScope(id: string, scope: string): Promise<Project> {
  const projects = await getProjects();
  const project = projects.find((p) => p.id === id);
  if (!project) {
    throw new Error("Projeto não encontrado.");
  }
  project.scope = scope;
  await saveProjects(projects);
  return project;
}
