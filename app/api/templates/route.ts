// app/api/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';

interface GitHubRepo {
  id: number;
  name: string;
  is_template: boolean;
  pushed_at: string; // ← agregás esto
}

async function fetchPage(org: string, token: string, page: number): Promise<GitHubRepo[]> {
  const url = `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
    },
  });
  if (!res.ok) return [];
  const data = await res.json() as GitHubRepo[];
  return Array.isArray(data) ? data : [];
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org");

  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });
  if (!org) return NextResponse.json({ error: "No org provided" }, { status: 400 });

  try {
    // 1. Primero obtenemos el total de repos de la org
    const orgRes = await fetch(`https://api.github.com/orgs/${org}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
      },
    });

    if (!orgRes.ok) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const orgData = await orgRes.json() as { public_repos: number; total_private_repos?: number };
    const totalRepos = (orgData.public_repos ?? 0) + (orgData.total_private_repos ?? 0);
    const totalPages = Math.ceil(totalRepos / 100);

    // 2. Pedimos todas las páginas en paralelo, de a 5 a la vez
    const CONCURRENCY = 5;
    let allTemplates: GitHubRepo[] = [];

    for (let i = 0; i < totalPages; i += CONCURRENCY) {
      const pages = Array.from(
        { length: Math.min(CONCURRENCY, totalPages - i) },
        (_, j) => i + j + 1
      );

      const results = await Promise.all(
        pages.map(page => fetchPage(org, token, page))
      );

      const templates = results
        .flat()
        .filter(repo => repo.is_template === true);

      allTemplates = [...allTemplates, ...templates];
    }

    const response = allTemplates
      .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
      }));

    return NextResponse.json(response);

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}