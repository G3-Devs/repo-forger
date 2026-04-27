// app/api/templates/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org");

  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });
  if (!org) return NextResponse.json({ error: "No org provided" }, { status: 400 });

  try {
    let allTemplates: any[] = [];
    let page = 1;
    const maxPages = 5; // Revisamos hasta 500 repositorios

    for (page = 1; page <= maxPages; page++) {
      // USAMOS EL ENDPOINT DE REPOS CON ORDEN POR CREACIÓN
      // sort=created: asegura que lo nuevo esté primero
      // direction=desc: de más nuevo a más viejo
      const url = `https://api.github.com/orgs/${org}/repos?sort=created&direction=desc&per_page=100&page=${page}`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "Cache-Control": "no-cache"
        },
      });

      if (!res.ok) break;

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;

      // Filtramos en caliente
      const found = data.filter((repo: any) => repo.is_template);
      allTemplates = [...allTemplates, ...found];

      // Si la página no vino llena, no hay más repos en la orga
      if (data.length < 100) break;
    }

    // Eliminamos duplicados por ID (por si GitHub mueve algo entre páginas)
    const uniqueTemplates = Array.from(new Map(allTemplates.map(item => [item.id, item])).values());

    // Mapeamos a lo que necesita tu frontend
    const response = uniqueTemplates.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      description: repo.description || "Sin descripción"
    }));

    return NextResponse.json(response);
    
  } catch (err) {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}