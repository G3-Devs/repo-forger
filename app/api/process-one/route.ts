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
    // 1. Leer el árbol del template
    const treeRes = await fetch(
      `https://api.github.com/repos/${org}/${template}/git/trees/main?recursive=1`,
      { headers }
    );
    if (!treeRes.ok) {
      const detail = await treeRes.json();
      return NextResponse.json({ status: "error", step: "read_template_tree", detail });
    }
    const treeData = await treeRes.json() as {
      tree: { path: string; type: string; sha: string; mode: string }[];
      sha: string;
    };

    // 2. Crear repo con auto_init para que no quede vacío
    const createRes = await fetch(
      `https://api.github.com/orgs/${org}/repos`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: repoName,
          private: isPrivate,
          auto_init: true,
        }),
      }
    );

    let repoExisted = false;

    if (!createRes.ok) {
      if (createRes.status === 422) {
        const detail422 = await createRes.json() as { message?: string; errors?: { message: string }[] };
        const msg = detail422?.errors?.[0]?.message || detail422?.message || "";
        if (msg.toLowerCase().includes("already exist") || msg.toLowerCase().includes("name already")) {
          repoExisted = true;
        } else {
          return NextResponse.json({ status: "error", step: "create_repo", detail: detail422 });
        }
      } else {
        const detail = await createRes.json();
        return NextResponse.json({ status: "error", step: "create_repo", detail });
      }
    }

    // 3. Obtener SHA del commit inicial (el que creó auto_init o el que ya existía)
    const refRes = await fetch(
      `https://api.github.com/repos/${org}/${repoName}/git/refs/heads/main`,
      { headers }
    );
    if (!refRes.ok) {
      const detail = await refRes.json();
      return NextResponse.json({ status: "error", step: "get_ref", detail });
    }
    const refData = await refRes.json() as { object: { sha: string } };
    const baseSha = refData.object.sha;

    // Obtener el tree SHA del commit base
    const baseCommitRes = await fetch(
      `https://api.github.com/repos/${org}/${repoName}/git/commits/${baseSha}`,
      { headers }
    );
    if (!baseCommitRes.ok) {
      const detail = await baseCommitRes.json();
      return NextResponse.json({ status: "error", step: "get_base_commit", detail });
    }
    const baseCommit = await baseCommitRes.json() as { tree: { sha: string } };

    // 4. Copiar blobs del template al repo nuevo
    const blobs = treeData.tree.filter(item => item.type === "blob");

    const newBlobs = await Promise.all(
      blobs.map(async item => {
        const blobRes = await fetch(
          `https://api.github.com/repos/${org}/${template}/git/blobs/${item.sha}`,
          { headers }
        );
        const blobData = await blobRes.json() as { content: string; encoding: string };

        const newBlobRes = await fetch(
          `https://api.github.com/repos/${org}/${repoName}/git/blobs`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              content: blobData.content,
              encoding: blobData.encoding,
            }),
          }
        );
        const newBlob = await newBlobRes.json() as { sha: string };

        return {
          path: item.path,
          mode: item.mode,
          type: "blob",
          sha: newBlob.sha,
        };
      })
    );

    // 5. Crear tree con base_tree para no pisar el commit inicial
    const newTreeRes = await fetch(
      `https://api.github.com/repos/${org}/${repoName}/git/trees`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          tree: newBlobs,
          base_tree: baseCommit.tree.sha,
        }),
      }
    );
    if (!newTreeRes.ok) {
      const detail = await newTreeRes.json();
      return NextResponse.json({ status: "error", step: "create_tree", detail });
    }
    const newTree = await newTreeRes.json() as { sha: string };

    // 6. Crear commit con el base como parent
    const commitRes = await fetch(
      `https://api.github.com/repos/${org}/${repoName}/git/commits`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: "Initial commit",
          tree: newTree.sha,
          parents: [baseSha],
        }),
      }
    );
    if (!commitRes.ok) {
      const detail = await commitRes.json();
      return NextResponse.json({ status: "error", step: "create_commit", detail });
    }
    const commit = await commitRes.json() as { sha: string };

    // 7. Actualizar rama main con force (ya existe por auto_init)
    const updateRefRes = await fetch(
      `https://api.github.com/repos/${org}/${repoName}/git/refs/heads/main`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          sha: commit.sha,
          force: true,
        }),
      }
    );
    if (!updateRefRes.ok) {
      const detail = await updateRefRes.json();
      return NextResponse.json({ status: "error", step: "update_ref", detail });
    }

    /**
    // 8. Invitar usuario
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
    */

    return NextResponse.json({ status: "ok" });

  } catch (err) {
    return NextResponse.json({ status: "error", step: "exception", detail: String(err) });
  }
}