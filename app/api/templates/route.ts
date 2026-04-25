import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org");

  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });
  if (!org) return NextResponse.json({ error: "No org provided" }, { status: 400 });

  // 1. Pedimos los repos de esa organización específica
  // Usamos per_page=100 para traer bastantes de una
  const res = await fetch(`https://api.github.com/orgs/${org}/repos?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: res.status });
  }

  const data = await res.json();

  // 2. Filtramos para quedarnos solo con los que son TEMPLATES
  // GitHub devuelve una propiedad booleana 'is_template'
  const templates = data
    .filter((repo: any) => repo.is_template)
    .map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      description: repo.description
    }));

  return NextResponse.json(templates);
}