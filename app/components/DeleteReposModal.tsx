"use client";

import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultOrg: string;
  defaultPrefix: string;
  token: string;
  lang: "en" | "es";
  orgs: { id: number; login: string }[];
}

type Step = "form" | "confirm" | "deleting" | "done";

interface DeleteResult {
  repo: string;
  status: "ok" | "error";
  detail?: string;
}

export default function DeleteReposModal({ isOpen, onClose, defaultOrg, defaultPrefix, token, lang, orgs }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [org, setOrg] = useState(defaultOrg);
  const [prefix, setPrefix] = useState(defaultPrefix);
  const [username, setUsername] = useState("");
  const [results, setResults] = useState<DeleteResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [reposToDelete, setReposToDelete] = useState<string[]>([]);

  const es = lang === "es";

  const handleClose = () => {
    setStep("form");
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setUsername("");
    onClose();
  };

  // Busca los repos que matchean antes de confirmar
  const handlePreview = async () => {
    if (!org || !prefix) return;

    // Busca repos de la org que empiecen con el prefijo
    const res = await fetch(`/api/delete-repos/preview?org=${org}&prefix=${prefix}&username=${username}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      alert(es ? "No se encontraron repos con esos criterios." : "No repos found with those criteria.");
      return;
    }
    setReposToDelete(data);
    setStep("confirm");
  };

  const handleDelete = async () => {
    setStep("deleting");
    setProgress({ current: 0, total: reposToDelete.length });

    const res = await fetch("/api/delete-repos", {
      method: "DELETE",
      body: JSON.stringify({ org, repos: reposToDelete, token }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === "result") {
            setResults(prev => [...prev, parsed]);
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          }
          if (parsed.type === "done") setStep("done");
          if (parsed.type === "rate_limit") {
            console.warn(`⏳ Rate limit, esperando ${Math.ceil(parsed.waitMs / 1000)}s`);
          }
        } catch { }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0d1424] border border-slate-700 rounded-xl shadow-2xl p-6 mx-4">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-sm font-bold text-rose-400 uppercase tracking-wider">
              {es ? "⚠ Eliminar repositorios" : "⚠ Delete repositories"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {es ? "Esta acción es irreversible." : "This action is irreversible."}
            </p>
          </div>
          <button onClick={handleClose} className="text-slate-600 hover:text-slate-300 transition text-lg leading-none">✕</button>
        </div>

        {/* STEP: form */}
        {step === "form" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {es ? "Organización" : "Organization"}
              </label>
              <select
                value={org}
                onChange={e => setOrg(e.target.value)}
                className="mt-2 w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-2 text-sm outline-none focus:border-rose-500/50 transition"
              >
                <option value="">{es ? "Seleccionar organización" : "Select organization"}</option>
                {orgs.map(o => (
                  <option key={o.id} value={o.login}>{o.login}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {es ? "Prefijo del repo" : "Repo prefix"}
              </label>
              <input
                value={prefix}
                onChange={e => setPrefix(e.target.value)}
                placeholder={es ? "ej: tp1-2026" : "e.g. tp1-2026"}
                className="mt-2 w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-2 text-sm outline-none focus:border-rose-500/50 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {es ? "Username (opcional)" : "Username (optional)"}
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={es ? "Dejá vacío para borrar todos los repos con ese prefijo" : "Leave empty to delete all repos with that prefix"}
                className="mt-2 w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-2 text-sm outline-none focus:border-rose-500/50 transition"
              />
            </div>

            <p className="text-[11px] text-slate-600 italic">
              {es
                ? `Se eliminarán repos que coincidan con: ${org || "org"}/${prefix || "prefijo"}-${username || "*"}`
                : `Will delete repos matching: ${org || "org"}/${prefix || "prefix"}-${username || "*"}`}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleClose} className="px-4 py-2 text-xs text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 transition">
                {es ? "Cancelar" : "Cancel"}
              </button>
              <button
                onClick={handlePreview}
                disabled={!org || !prefix}
                className="px-4 py-2 text-xs font-bold text-rose-300 border border-rose-800 rounded-md hover:bg-rose-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                {es ? "Buscar repos →" : "Find repos →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP: confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-rose-950/20 border border-rose-800/40 rounded-md p-4">
              <p className="text-xs font-bold text-rose-400 mb-3">
                {es ? `Se eliminarán ${reposToDelete.length} repositorios:` : `${reposToDelete.length} repositories will be deleted:`}
              </p>
              <ul className="max-h-48 overflow-y-auto space-y-1">
                {reposToDelete.map(r => (
                  <li key={r} className="text-xs font-mono text-slate-400">{r}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-rose-300 font-semibold">
              {es ? "¿Estás seguro? Esta acción no se puede deshacer." : "Are you sure? This cannot be undone."}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setStep("form")} className="px-4 py-2 text-xs text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 transition">
                {es ? "← Volver" : "← Back"}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-600 rounded-md transition"
              >
                {es ? `Sí, eliminar ${reposToDelete.length} repos` : `Yes, delete ${reposToDelete.length} repos`}
              </button>
            </div>
          </div>
        )}

        {/* STEP: deleting */}
        {step === "deleting" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-xs text-slate-500 font-mono mb-1">
                {progress.current === 0
                  ? (es ? "Iniciando..." : "Starting...")
                  : results[results.length - 1]?.status === "ok"
                    ? <span className="text-emerald-400">✓ {results[results.length - 1]?.repo}</span>
                    : <span className="text-rose-400">✗ {results[results.length - 1]?.repo}</span>
                }
              </p>
              <p className="text-slate-600 text-[11px] font-mono mt-1">
                {progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
              </p>
              <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-rose-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP: done */}
        {step === "done" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-emerald-400 font-bold text-sm mb-1">
                {es ? "¡Proceso completado!" : "Process complete!"}
              </p>
              <p className="text-xs text-slate-500">
                {results.filter(r => r.status === "ok").length} {es ? "eliminados" : "deleted"},&nbsp;
                {results.filter(r => r.status === "error").length} {es ? "errores" : "errors"}
              </p>
            </div>
            {results.filter(r => r.status === "error").length > 0 && (
              <div className="bg-rose-950/20 border border-rose-800/40 rounded-md p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-bold text-rose-400 mb-2">{es ? "Errores:" : "Errors:"}</p>
                {results.filter(r => r.status === "error").map((r, i) => (
                  <div key={i} className="text-xs font-mono text-rose-400">✗ {r.repo}</div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={handleClose} className="px-4 py-2 text-xs font-bold text-slate-300 border border-slate-700 rounded-md hover:bg-slate-800 transition">
                {es ? "Cerrar" : "Close"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}