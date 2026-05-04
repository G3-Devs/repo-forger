import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { org, template, repoName, username, isPrivate, token } = body;

  if (!token || !org || !template || !repoName) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  try {
    // 1. Crear repo desde template
    const createRepo = await fetch(
      `https://api.github.com/repos/${org}/${template}/generate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ owner: org, name: repoName, private: isPrivate }),
      }
    );

    if (!createRepo.ok) {
      if (createRepo.status === 403 || createRepo.status === 429) {
        const retryAfter = createRepo.headers.get("retry-after");
        const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;
        return NextResponse.json({
          status: "error",
          step: "create_repo",
          detail: "secondary_rate_limit",
          retryAfter: waitSeconds,
        });
      }

      if (createRepo.status === 422) {
        const detail422 = await createRepo.json() as { message?: string; errors?: { message: string }[] };
        const msg = detail422?.errors?.[0]?.message || detail422?.message || "";
        if (msg.toLowerCase().includes("already exist") || msg.toLowerCase().includes("name already")) {
          // repo ya existe, continuamos
        } else if (msg.toLowerCase().includes("submitted too quickly") || msg.toLowerCase().includes("could not clone")) {
          return NextResponse.json({
            status: "error",
            step: "create_repo",
            detail: "secondary_rate_limit",
            retryAfter: 60,
          });
        } else {
          return NextResponse.json({ status: "error", step: "create_repo", detail: detail422 });
        }
      } else {
        const detail = await createRepo.json();
        return NextResponse.json({ status: "error", step: "create_repo", detail });
      }
    }

    // 2. Esperar a que el repo exista
    let repoReady = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      const checkRepo = await fetch(
        `https://api.github.com/repos/${org}/${repoName}`,
        { headers }
      );
      if (checkRepo.ok) { repoReady = true; break; }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!repoReady) {
      return NextResponse.json({ status: "error", step: "repo_not_ready", detail: "El repo no estuvo disponible a tiempo" });
    }

    
    // 3. Invitar usuario
    const invite = await fetch(
      `https://api.github.com/repos/${org}/${repoName}/collaborators/${username}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ permission: "push" }),
      }
    );

    if (!invite.ok) {
      const detail = await invite.text();
      return NextResponse.json({ status: "error", step: "invite", detail });
    }
    
    return NextResponse.json({ status: "ok" });

  } catch (err) {
    return NextResponse.json({ status: "error", step: "exception", detail: String(err) });
  }
}