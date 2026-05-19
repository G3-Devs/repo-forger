import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { org, repos, prefix, token, permission } = body as {
    org: string; repos: string[]; prefix: string; token: string; permission: "pull" | "push";
  };

  if (!org || !repos?.length || !token || !permission || !prefix) {
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
        if (remaining <= 5) {
          const waitMs = (reset * 1000) - Date.now() + 1000;
          if (waitMs > 0) {
            send({ type: "rate_limit", waitMs });
            await new Promise(r => setTimeout(r, waitMs));
          }
        }
      };

      for (const repoName of repos) {
        try {
          // El username está en el nombre del repo: "prefix-username" → "username"
          const username = repoName.startsWith(prefix + "-")
            ? repoName.slice(prefix.length + 1)
            : repoName;

          const res = await fetch(
            `https://api.github.com/repos/${org}/${repoName}/collaborators/${username}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ permission }),
            }
          );

          await checkRateLimit(res);

          // 201 = invited, 204 = updated existing collaborator
          if (res.ok || res.status === 201 || res.status === 204) {
            send({ type: "result", repo: repoName, username, status: "ok" });
          } else {
            const detail = await res.text();
            send({ type: "result", repo: repoName, username, status: "error", detail });
          }

          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          send({ type: "result", repo: repoName, status: "error", detail: String(err) });
        }
      }

      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}