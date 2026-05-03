// app/api/process/route.ts
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { org, template, repoBase, users, isPrivate } = body;
  const token = body.token || process.env.GITHUB_TOKEN;

  if (!token) {
    return new Response(JSON.stringify({ error: "No token" }), { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      const checkRateLimit = async (response: Response) => {
        const remaining = parseInt(response.headers.get("x-ratelimit-remaining") || "999");
        const reset = parseInt(response.headers.get("x-ratelimit-reset") || "0");

        if (remaining <= 5) {
          const waitMs = (reset * 1000) - Date.now() + 1000; // +1s de margen
          if (waitMs > 0) {
            send({ type: "rate_limit", waitMs, remaining });
            await new Promise(r => setTimeout(r, waitMs));
          }
        }
      };

      for (let i = 0; i < users.length; i++) {
        const username = users[i];
        const repoName = `${repoBase}-${username}`;

        send({ type: "progress", current: i + 1, total: users.length, username });

        try {
          // 1. Crear repo desde template
          const createRepo = await fetch(
            `https://api.github.com/repos/${org}/${template}/generate`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
              },
              body: JSON.stringify({ owner: org, name: repoName, private: isPrivate }),
            }
          );

          await checkRateLimit(createRepo);

          if (!createRepo.ok && createRepo.status !== 422) {
            const detail = await createRepo.json();
            send({ type: "result", username, status: "error", step: "create_repo", detail });
            continue;
          }

          if (createRepo.status === 422) {
            send({ type: "log", username, message: "Repo ya existía, continuando..." });
          }

          // 2. Esperar a que el repo exista
          let repoReady = false;
          for (let attempt = 0; attempt < 8; attempt++) {
            const checkRepo = await fetch(
              `https://api.github.com/repos/${org}/${repoName}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (checkRepo.ok) { repoReady = true; break; }
            await new Promise(r => setTimeout(r, 700));
          }

          if (!repoReady) {
            send({ type: "result", username, status: "error", step: "repo_not_ready", detail: "El repo no estuvo disponible a tiempo" });
            continue;
          }

          // 3. Invitar usuario
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

          await checkRateLimit(invite);

          if (!invite.ok) {
            const detail = await invite.text();
            send({ type: "result", username, status: "error", step: "invite", detail });
            continue;
          }

          send({ type: "result", username, status: "ok" });

          // Pausa base entre repos
          await new Promise(r => setTimeout(r, 300));

        } catch (err) {
          send({ type: "result", username, status: "error", step: "exception", detail: String(err) });
        }
      }

      send({ type: "done" });
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}