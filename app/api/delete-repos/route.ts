import { NextRequest } from "next/server";

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { org, repos, token } = body as { org: string; repos: string[]; token: string };

  if (!org || !repos?.length || !token) {
    return new Response(JSON.stringify({ error: "Faltan parámetros" }), { status: 400 });
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

        console.log(`[rate limit] remaining: ${remaining}`);

        if (remaining <= 5) {
          const waitMs = (reset * 1000) - Date.now() + 1000;
          if (waitMs > 0) {
            console.warn(`⏳ Rate limit alcanzado, esperando ${Math.ceil(waitMs / 1000)}s...`);
            send({ type: "rate_limit", waitMs });
            await new Promise(r => setTimeout(r, waitMs));
            console.log(`✓ Reanudando tras rate limit`);
          }
        }
      };

      for (const repoName of repos) {
        try {
          const res = await fetch(
            `https://api.github.com/repos/${org}/${repoName}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
              },
            }
          );

          const responseText = await res.text();
          console.log(`DELETE ${org}/${repoName} → status: ${res.status}`);

          await checkRateLimit(res);

          if (res.status === 204 || res.status === 200 || res.status === 404) {
            send({ type: "result", repo: repoName, status: "ok" });
          } else {
            send({ type: "result", repo: repoName, status: "error", detail: responseText });
          }

          await new Promise(r => setTimeout(r, 300));

        } catch (err) {
          send({ type: "result", repo: repoName, status: "error", detail: String(err) });
        }
      }

      send({ type: "done" });
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}