import type { CommitActivity, PullRequestInfo } from "@/lib/types";

const GITHUB_API = "https://api.github.com";
const DIFF_CHAR_LIMIT = 8000;

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN não configurado em .env.local");
  }
  return token;
}

async function githubFetch(path: string) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Repositório não encontrado ou sem acesso com este token.");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Token do GitHub inválido ou sem permissão suficiente.");
    }
    throw new Error(`Erro ao consultar o GitHub (${res.status}).`);
  }

  return res.json();
}

type GitHubCommitListItem = { sha: string };

type GitHubCommitDetail = {
  sha: string;
  html_url: string;
  author: { login?: string; avatar_url?: string } | null;
  commit: {
    message: string;
    author: { name?: string; date?: string } | null;
  };
  stats?: { additions: number; deletions: number };
  files?: { filename: string; patch?: string; additions: number; deletions: number }[];
};

async function fetchCommitDetail(
  owner: string,
  name: string,
  sha: string
): Promise<CommitActivity> {
  const data = (await githubFetch(
    `/repos/${owner}/${name}/commits/${sha}`
  )) as GitHubCommitDetail;

  const diff = (data.files ?? [])
    .map((f) => `--- ${f.filename} (+${f.additions}/-${f.deletions})\n${f.patch ?? ""}`)
    .join("\n\n")
    .slice(0, DIFF_CHAR_LIMIT);

  return {
    sha: data.sha,
    message: data.commit.message.split("\n")[0] ?? "",
    authorName: data.author?.login ?? data.commit.author?.name ?? "desconhecido",
    authorAvatarUrl: data.author?.avatar_url ?? null,
    url: data.html_url,
    date: data.commit.author?.date ?? "",
    additions: data.stats?.additions ?? 0,
    deletions: data.stats?.deletions ?? 0,
    diff,
    repoOwner: owner,
    repoName: name,
  };
}

type GitHubPullRequestListItem = {
  number: number;
  title: string;
  html_url: string;
  user: { login?: string } | null;
  head: { ref: string };
};

export async function fetchOpenPullRequests(
  owner: string,
  name: string
): Promise<PullRequestInfo[]> {
  const list = (await githubFetch(
    `/repos/${owner}/${name}/pulls?state=open&per_page=100`
  )) as GitHubPullRequestListItem[];

  return list.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    authorName: pr.user?.login ?? null,
    branchName: pr.head.ref,
  }));
}

export async function fetchAllCommitsWithStats(
  owner: string,
  name: string,
  cachedCommits: Map<string, CommitActivity>
): Promise<CommitActivity[]> {
  const perPage = 100;
  const newCommits: CommitActivity[] = [];
  let page = 1;

  while (true) {
    const list = (await githubFetch(
      `/repos/${owner}/${name}/commits?per_page=${perPage}&page=${page}`
    )) as GitHubCommitListItem[];

    if (list.length === 0) break;

    const pendingShas: string[] = [];
    let reachedKnownCommit = false;

    for (const item of list) {
      if (cachedCommits.has(item.sha)) {
        reachedKnownCommit = true;
        break;
      }
      pendingShas.push(item.sha);
    }

    if (pendingShas.length > 0) {
      const details = await Promise.all(
        pendingShas.map((sha) => fetchCommitDetail(owner, name, sha))
      );
      newCommits.push(...details);
    }

    if (reachedKnownCommit || list.length < perPage) break;
    page++;
  }

  return [...newCommits, ...cachedCommits.values()];
}

type GitHubRepoDetail = { default_branch: string };

type GitHubTreeEntry = { path: string; type: string };

type GitHubTreeResponse = { tree: GitHubTreeEntry[]; truncated: boolean };

const METADATA_TYPE_LABELS: { dir: string; label: string }[] = [
  { dir: "objects", label: "Objetos e campos" },
  { dir: "flows", label: "Flows" },
  { dir: "classes", label: "Classes Apex" },
  { dir: "triggers", label: "Triggers" },
  { dir: "lwc", label: "Lightning Web Components" },
  { dir: "aura", label: "Componentes Aura" },
  { dir: "permissionsets", label: "Permission Sets" },
  { dir: "profiles", label: "Profiles" },
  { dir: "layouts", label: "Page Layouts" },
  { dir: "flexipages", label: "Lightning Pages" },
  { dir: "quickActions", label: "Quick Actions" },
  { dir: "validationRules", label: "Validation Rules" },
  { dir: "workflows", label: "Workflows" },
  { dir: "approvalProcesses", label: "Approval Processes" },
  { dir: "sharingRules", label: "Sharing Rules" },
  { dir: "customMetadata", label: "Custom Metadata" },
  { dir: "namedCredentials", label: "Named Credentials" },
  { dir: "staticresources", label: "Static Resources" },
];

const MAX_ITEMS_PER_TYPE = 40;

function entryName(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file.replace(/\.[^.]+-meta\.xml$/, "").replace(/\.[^.]+$/, "");
}

export async function fetchOrgMetadataSummary(
  owner: string,
  name: string
): Promise<string | null> {
  const repo = (await githubFetch(`/repos/${owner}/${name}`)) as GitHubRepoDetail;
  const tree = (await githubFetch(
    `/repos/${owner}/${name}/git/trees/${repo.default_branch}?recursive=1`
  )) as GitHubTreeResponse;

  const files = tree.tree.filter((entry) => entry.type === "blob");
  const sections: string[] = [];

  for (const { dir, label } of METADATA_TYPE_LABELS) {
    const names = new Set<string>();
    for (const file of files) {
      if (!file.path.includes(`/${dir}/`)) continue;
      names.add(entryName(file.path));
    }
    if (!names.size) continue;

    const list = Array.from(names).sort();
    const shown = list.slice(0, MAX_ITEMS_PER_TYPE);
    const extra = list.length - shown.length;
    sections.push(
      `${label} (${list.length}): ${shown.join(", ")}${extra > 0 ? ` … +${extra}` : ""}`
    );
  }

  if (!sections.length) return null;

  const header = `Repositório ${owner}/${name} (branch ${repo.default_branch})${
    tree.truncated ? " — árvore truncada pelo GitHub, listagem parcial" : ""
  }`;

  return `${header}\n\n${sections.join("\n\n")}`;
}
