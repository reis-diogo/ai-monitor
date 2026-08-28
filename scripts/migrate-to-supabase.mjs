import { readFile } from "fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf-8"));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertAndVerify(table, rows, onConflict, sourceCount) {
  for (const batch of chunk(rows, 50)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) {
      console.error(`✗ ${table}: erro no upsert -`, error.message);
      process.exit(1);
    }
  }

  const { count, error: countError } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (countError) {
    console.error(`✗ ${table}: erro ao contar -`, countError.message);
    process.exit(1);
  }

  const ok = count === sourceCount;
  console.log(
    `${ok ? "✓" : "✗"} ${table}: origem=${sourceCount} supabase=${count}${ok ? "" : "  <<< DIVERGENCIA"}`
  );
  if (!ok) process.exitCode = 1;
}

async function main() {
  // 1. repos
  const repos = await readJson("data/repos.json");
  await upsertAndVerify(
    "repos",
    repos.map((r) => ({
      id: r.id,
      owner: r.owner,
      name: r.name,
      url: r.url,
      added_at: r.addedAt,
    })),
    "id",
    repos.length
  );

  // 2. projects (before project_analysis_cache due to FK)
  const projects = await readJson("data/projects.json");
  await upsertAndVerify(
    "projects",
    projects.map((p) => ({ id: p.id, name: p.name, scope: p.scope ?? null })),
    "id",
    projects.length
  );

  // 3. professionals
  const professionals = await readJson("data/professionals.json");
  await upsertAndVerify(
    "professionals",
    professionals.map((p) => ({
      author_name: p.authorName,
      role: p.role,
      clickup_email: p.clickupEmail ?? null,
      avatar_url: p.avatarUrl ?? null,
      aliases: p.aliases ?? [],
    })),
    "author_name",
    professionals.length
  );

  // 4. commit_cache
  const commitCache = await readJson("data/commit-cache.json");
  const commitRows = Object.values(commitCache).map((c) => ({
    repo_owner: c.repoOwner,
    repo_name: c.repoName,
    sha: c.sha,
    message: c.message,
    author_name: c.authorName,
    author_avatar_url: c.authorAvatarUrl ?? null,
    url: c.url,
    date: c.date,
    additions: c.additions,
    deletions: c.deletions,
    diff: c.diff ?? "",
  }));
  await upsertAndVerify("commit_cache", commitRows, "repo_owner,repo_name,sha", commitRows.length);

  // 5. analysis_cache
  const analysisCache = await readJson("data/analysis-cache.json");
  const analysisRows = Object.values(analysisCache).map((a) => ({
    provider: a.provider,
    activity_id: a.id,
    source: a.source,
    intent: a.intent,
    score: a.score,
    critique: a.critique,
    author_name: a.authorName,
    author_avatar_url: a.authorAvatarUrl ?? null,
    title: a.title,
    url: a.url,
    date: a.date,
    location: a.location,
    additions: a.additions ?? null,
    deletions: a.deletions ?? null,
    analyzed_at: a.analyzedAt,
  }));
  await upsertAndVerify(
    "analysis_cache",
    analysisRows,
    "provider,activity_id",
    analysisRows.length
  );

  // 6. project_analysis_cache (last: FK -> projects.id)
  const projectAnalysisCache = await readJson("data/project-analysis-cache.json");
  const projectAnalysisRows = Object.values(projectAnalysisCache).map((a) => ({
    provider: a.provider,
    project_id: a.projectId,
    project_name: a.projectName,
    score: a.score,
    critique: a.critique,
    missing_topics: a.missingTopics ?? [],
    out_of_scope_work: a.outOfScopeWork ?? [],
    over_delivery: a.overDelivery ?? [],
    commit_count: a.commitCount ?? 0,
    analyzed_at: a.analyzedAt,
  }));
  await upsertAndVerify(
    "project_analysis_cache",
    projectAnalysisRows,
    "provider,project_id",
    projectAnalysisRows.length
  );

  if (process.exitCode === 1) {
    console.log("\nMigração terminou com divergências — NÃO prosseguir até resolver.");
  } else {
    console.log("\nMigração concluída, todas as contagens batem.");
  }
}

main();
