// app/api/process/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { org, template, repoBase, users } = body;

  const token = body.token || process.env.GITHUB_TOKEN;
  // const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "No token" }, { status: 500 });
  }

  const results: any[] = [];

  for (const username of users) {
    const repoName = `${repoBase}-${username}`;

    try {
      // ========================
      // 1. Crear repo desde template
      // ========================
      const createRepo = await fetch(
        `https://api.github.com/repos/${org}/${template}/generate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({
            owner: org,
            name: repoName,
            private: true,
          }),
        }
      );

      const createData = await createRepo.json();

      if (!createRepo.ok) {
        if (createRepo.status === 422) {
          // Repo ya existe → seguimos
          console.log(`Repo ya existe: ${repoName}`);
        } else {
          results.push({
            username,
            status: "error",
            step: "create_repo",
            detail: createData,
          });
          continue;
        }
      }

      // ========================
      // 2. Esperar a que el repo exista (CLAVE)
      // ========================
      let repoReady = false;

      for (let i = 0; i < 6; i++) {
        const checkRepo = await fetch(
          `https://api.github.com/repos/${org}/${repoName}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (checkRepo.ok) {
          repoReady = true;
          break;
        }

        await new Promise((r) => setTimeout(r, 500));
      }

      if (!repoReady) {
        results.push({
          username,
          status: "error",
          step: "repo_not_ready",
          detail: "El repo no estuvo disponible a tiempo",
        });
        continue;
      }

      // ========================
      // 3. Invitar usuario
      // ========================
      const invite = await fetch(
        `https://api.github.com/repos/${org}/${repoName}/collaborators/${username}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({ permission: "push" }),
        }
      );

      const inviteText = await invite.text();

      if (!invite.ok) {
        results.push({
          username,
          status: "error",
          step: "invite",
          detail: inviteText,
        });
        continue;
      }

      results.push({
        username,
        status: "ok",
      });

      // pequeña pausa para no romper rate limit
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      results.push({
        username,
        status: "error",
        step: "exception",
        detail: String(err),
      });
    }
  }

  return NextResponse.json({ results });
}