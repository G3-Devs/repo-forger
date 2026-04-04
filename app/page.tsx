"use client";
import { useState } from "react";
export default function Home() {
  const [org, setOrg] = useState("");
  const [template, setTemplate] = useState("");
  const [repoBase, setRepoBase] = useState("tp1");
  const [usersText, setUsersText] = useState("");
  const [result, setResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    setLoading(true);
    const users = usersText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    const res = await fetch("/api/process", {
      method: "POST",
      body: JSON.stringify({ org, template, repoBase, users }),
    });
    const data = await res.json();
    setResult(data.results);
    setLoading(false);
  };
  return (
    <main
      style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}
    >
      {" "}
      <h1>Generador de repos</h1>{" "}
      <input
        placeholder="Organización (ej: mi-org)"
        value={org}
        onChange={(e) => setOrg(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 8 }}
      />{" "}
      <input
        placeholder="Repo template (ej: tp1-template)"
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 8 }}
      />{" "}
      <input
        placeholder="Prefijo repos (ej: tp1)"
        value={repoBase}
        onChange={(e) => setRepoBase(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 8 }}
      />{" "}
      <textarea
        rows={10}
        placeholder="usuario1\nusuario2\nusuario3"
        value={usersText}
        onChange={(e) => setUsersText(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 8 }}
      />{" "}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: "#2563eb",
          color: "white",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
        }}
      >
        {" "}
        {loading ? "Procesando..." : "Crear repos + invitar"}{" "}
      </button>{" "}
      <ul style={{ marginTop: 20 }}>
        {" "}
        {result.map((r, i) => (
          <li key={i}>
            {" "}
            <strong>{r.username}</strong> — {r.status}{" "}
            {r.detail && (
              <pre style={{ fontSize: 12, color: "red" }}>
                {" "}
                {JSON.stringify(r.detail, null, 2)}{" "}
              </pre>
            )}{" "}
          </li>
        ))}{" "}
      </ul>{" "}
    </main>
  );
}
