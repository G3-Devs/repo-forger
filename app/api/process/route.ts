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

      const log = (level: "info" | "warn" | "error", message: string) => {
        send({ type: "log", level, message });
      };

      const checkRateLimit = async (response: Response, step: string) => {
        const remaining = parseInt(response.headers.get("x-ratelimit-remaining") || "999");
        const reset = parseInt(response.headers.get("x-ratelimit-reset") || "0");

        log("info", `[${step}] rate limit remaining: ${remaining}`);

        if (remaining <= 5) {
          const waitMs = (reset * 1000) - Date.now() + 1000;
          if (waitMs > 0) {
            log("warn", `⏳ Rate limit alcanzado en [${step}], esperando ${Math.ceil(waitMs / 1000)}s...`);
            send({ type: "rate_limit", waitMs, remaining });
            await new Promise(r => setTimeout(r, waitMs));
            log("info", `✓ Reanudando tras rate limit en [${step}]`);
          }
        }
      };

      const globalStart = Date.now();
      log("info", `🚀 Iniciando proceso: ${users.length} repositorios`);

      for (let i = 0; i < users.length; i++) {
        const username = users[i];
        const repoName = `${repoBase}-${username}`;
        const repoStart = Date.now();

        log("info", `\n[${i + 1}/${users.length}] Iniciando: ${repoName}`);
        send({ type: "progress", current: i + 1, total: users.length, username });

        try {
          // 1. Crear repo desde template (con reintento por throttle)
          let createRepo: Response | null = null;
          let created = false;

          for (let attempt = 0; attempt < 5; attempt++) {
            createRepo = await fetch(
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

            await checkRateLimit(createRepo, "create_repo");

            if (createRepo.ok) {
              log("info", `  ✓ Repo creado en ${Date.now() - repoStart}ms`);
              created = true;
              break;
            }

            if (createRepo.status === 422) {
              const detail422 = await createRepo.clone().json() as { message?: string; errors?: { message: string }[] };
              const msg = detail422?.errors?.[0]?.message || detail422?.message || "";

              if (msg.toLowerCase().includes("submitted too quickly") || msg.toLowerCase().includes("could not clone")) {
                const waitS = Math.pow(2, attempt + 1); // 2s, 4s, 8s, 16s, 32s
                log("warn", `⏳ Throttle de GitHub (intento ${attempt + 1}/5), esperando ${waitS}s...`);
                await new Promise(r => setTimeout(r, waitS * 1000));
                continue;
              }

              if (msg.toLowerCase().includes("already exist") || msg.toLowerCase().includes("name already")) {
                log("warn", `⚠ Repo ya existía: ${repoName}, continuando...`);
                created = true;
                break;
              }

              log("error", `✗ Error 422 creando ${repoName}: ${JSON.stringify(detail422)}`);
              send({ type: "result", username, status: "error", step: "create_repo", detail: detail422 });
              break;
            } else {
              const detail = await createRepo.json();
              log("error", `✗ Error ${createRepo.status} creando repo ${repoName}: ${JSON.stringify(detail)}`);
              send({ type: "result", username, status: "error", step: "create_repo", detail });
              break;
            }
          }

          if (!created) continue;

          // 2. Esperar a que el repo exista
          let repoReady = false;
          for (let attempt = 0; attempt < 15; attempt++) {  // ← subimos de 8 a 15
            const checkRepo = await fetch(
              `https://api.github.com/repos/${org}/${repoName}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (checkRepo.ok) {
              repoReady = true;
              log("info", `  ✓ Repo disponible (intento ${attempt + 1}) en ${Date.now() - repoStart}ms`);
              break;
            }
            log("info", `  … Repo no disponible aún, reintento ${attempt + 1}/15`);
            await new Promise(r => setTimeout(r, 1000));  // ← subimos de 700ms a 1000ms
          }

          /** 
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

          await checkRateLimit(invite, "invite");

          if (!invite.ok) {
            const detail = await invite.text();
            log("error", `✗ Error invitando a ${username}: ${detail}`);
            send({ type: "result", username, status: "error", step: "invite", detail });
            continue;
          }

          log("info", `  ✓ Invitación enviada. Repo completo en ${Date.now() - repoStart}ms`);
          */
          send({ type: "result", username, status: "ok" });

          const elapsed = ((Date.now() - globalStart) / 1000).toFixed(1);
          log("info", `  ⏱ Tiempo acumulado: ${elapsed}s para ${i + 1} repos`);

          // Pausa base entre repos
          await new Promise(r => setTimeout(r, 500));

        } catch (err) {
          log("error", `✗ Excepción en ${username}: ${String(err)}`);
          send({ type: "result", username, status: "error", step: "exception", detail: String(err) });
        }
      }

      const totalTime = ((Date.now() - globalStart) / 1000).toFixed(1);
      log("info", `\n✅ Proceso completo: ${users.length} repos en ${totalTime}s`);
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