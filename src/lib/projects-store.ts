import { getSupabase } from "@/lib/supabase";
import type { Project } from "@/lib/types";

type ProjectRow = {
  id: string;
  name: string;
  scope: string | null;
};

function rowToProject(row: ProjectRow): Project {
  return { id: row.id, name: row.name, ...(row.scope ? { scope: row.scope } : {}) };
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await getSupabase().from("projects").select("*").order("name");
  if (error) throw new Error(`Erro ao listar projetos: ${error.message}`);
  return (data ?? []).map((row) => rowToProject(row as ProjectRow));
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

  const { data, error } = await getSupabase()
    .from("projects")
    .insert({ name: trimmed })
    .select("*")
    .single();

  if (error) throw new Error(`Erro ao cadastrar projeto: ${error.message}`);
  return rowToProject(data as ProjectRow);
}

export async function removeProject(id: string): Promise<void> {
  const { error } = await getSupabase().from("projects").delete().eq("id", id);
  if (error) throw new Error(`Erro ao remover projeto: ${error.message}`);
}

// O nome e a chave que liga o projeto aos cards: o dropdown "projeto" do ClickUp
// chega como texto e e casado com este campo por igualdade. Renomear aqui sem
// renomear la desliga o projeto dos cards dele — quem chama avisa o usuario.
export async function setProjectName(id: string, name: string): Promise<Project> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Informe o nome do projeto.");
  }

  const projects = await getProjects();
  const duplicated = projects.some(
    (project) => project.id !== id && project.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicated) {
    throw new Error("Já existe um projeto com esse nome.");
  }

  const { data, error } = await getSupabase()
    .from("projects")
    .update({ name: trimmed })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`Erro ao renomear projeto: ${error.message}`);
  if (!data) throw new Error("Projeto não encontrado.");
  return rowToProject(data as ProjectRow);
}

export async function setProjectScope(id: string, scope: string): Promise<Project> {
  const { data, error } = await getSupabase()
    .from("projects")
    .update({ scope })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`Erro ao salvar escopo: ${error.message}`);
  if (!data) throw new Error("Projeto não encontrado.");
  return rowToProject(data as ProjectRow);
}
