import { NextResponse } from "next/server";
import { getRepos } from "@/lib/repos-store";
import { fetchOpenPullRequests } from "@/lib/github";
import { isAllowedUser } from "@/lib/require-allowed-user";

export async function GET() {
  if (!(await isAllowedUser())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const repos = await getRepos();

  const results = await Promise.allSettled(
    repos.map((repo) => fetchOpenPullRequests(repo.owner, repo.name))
  );

  const repoPullRequests = results.map((result, i) => ({
    owner: repos[i].owner,
    name: repos[i].name,
    pullRequests: result.status === "fulfilled" ? result.value : [],
  }));

  return NextResponse.json({ repoPullRequests });
}
