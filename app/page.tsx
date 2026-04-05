"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const [org, setOrg] = useState("");
  const [template, setTemplate] = useState("");
  const [repoBase, setRepoBase] = useState("tp1");
  const [usersText, setUsersText] = useState("");
  const [result, setResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: session } = useSession();

  const handleSubmit = async () => {
    const users = usersText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (!org || !template || users.length === 0) {
      alert("Completá todos los campos");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/process", {
      method: "POST",
      body: JSON.stringify({
        org,
        template,
        repoBase,
        users,
        token: session?.accessToken,
      }),
    });

    const data = await res.json();
    setResult(data.results);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-xl p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Generador de Repos</h1>

          {!session ? (
            <button
              onClick={() => signIn("github")}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Login GitHub
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">
                {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
              >
                Salir
              </button>
            </div>
          )}
        </div>

        {/* FORM */}
        <div className="space-y-3">
          <input
            placeholder="Organización (mi-org)"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            placeholder="Repo template (tp1-template)"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            placeholder="Prefijo (tp1)"
            value={repoBase}
            onChange={(e) => setRepoBase(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            rows={8}
            placeholder="usuario1\nusuario2\nusuario3"
            value={usersText}
            onChange={(e) => setUsersText(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 transition rounded font-semibold"
          >
            {loading ? "Procesando..." : "Crear repos + invitar"}
          </button>
        </div>

        {/* RESULTADOS */}
        <div className="mt-6 max-h-60 overflow-auto">
          {result.map((r, i) => (
            <div
              key={i}
              className={`p-2 mb-2 rounded text-sm ${
                r.status === "ok"
                  ? "bg-green-700"
                  : "bg-red-700"
              }`}
            >
              <strong>{r.username}</strong> — {r.status}
              {r.detail && (
                <pre className="text-xs mt-1 overflow-auto">
                  {JSON.stringify(r.detail, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}