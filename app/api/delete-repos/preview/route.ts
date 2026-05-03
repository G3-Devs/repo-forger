import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org");
  const prefix = searchParams.get("prefix");
  const username = searchParams.get("username") || "";

  if (!token || !org || !prefix) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  // El nombre exacto a buscar depende de si hay username o no
  // Con username: busca "{prefix}-{username}"
  // Sin username: busca todos los que empiecen con "{prefix}-"
  const query = username
    ? `${prefix}-${username}`
    : `${prefix}-`;

  let allRepos: string[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    const matched = data
      .map((r: any) => r.name)
      .filter((name: string) => username ? name === query : name.startsWith(query));

    allRepos = [...allRepos, ...matched];
    if (data.length < 100) break;
    page++;
  }

  return NextResponse.json(allRepos);
}