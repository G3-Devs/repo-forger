// app/api/templates/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org");

  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });
  if (!org) return NextResponse.json({ error: "No org provided" }, { status: 400 });

  try {
    // La clave es 'is:public' o 'is:private' junto con 'is:template' 
    // para que el motor de búsqueda sea más específico.
    const query = encodeURIComponent(`org:${org} is:template`);
    
    const res = await fetch(`https://api.github.com/search/repositories?q=${query}&per_page=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28" // Recomendado para Search API
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "GitHub Search Failed" }, { status: res.status });
    }

    const data = await res.json();

    // FILTRO DE SEGURIDAD: 
    // Aunque la query dice 'is:template', a veces el search trae resultados 'cercanos'.
    // Volvemos a filtrar por 'is_template' para estar 100% seguros.
    const templates = (data.items || [])
      .filter((repo: any) => repo.is_template)
      .map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description || "Sin descripción"
      }));

    return NextResponse.json(templates);
    
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}