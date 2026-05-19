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

type Step = "form" | "confirm" | "updating" | "done";
type Permission = "pull" | "push";

interface UpdateResult {
  repo: string;
  username?: string;
  status: "ok" | "error";
  detail?: string;
}

export default function UpdatePermissionsModal({
  isOpen, onClose, defaultOrg, defaultPrefix, token, lang, orgs,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  const [org, setOrg] = useState(defaultOrg);
  const [prefix, setPrefix] = useState(defaultPrefix);
  const [username, setUsername] = useState("");
  const [permission, setPermission] = useState<Permission>("pull");
  const [reposToUpdate, setReposToUpdate] = useState<string[]>([]);
  const [results, setResults] = useState<UpdateResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const es = lang === "es";

  const handleClose = () => {
    setStep("form");
    setResults([]);
    setReposToUpdate([]);
    setProgress({ current: 0, total: 0 });
    onClose();
  };

  const handlePreview = async () => {
    if (!org || !prefix) return;
    const res = await fetch(
      `/api/delete-repos/preview?org=${org}&prefix=${prefix}&username=${username}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      alert(es ? "No se encontraron repos con esos criterios." : "No repos found with those criteria.");
      return;
    }
    setReposToUpdate(data);
    setStep("confirm");
  };

  const handleUpdate = async () => {
    setStep("updating");
    setProgress({ current: 0, total: reposToUpdate.length });

    const res = await fetch("/api/update-permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org, repos: reposToUpdate, prefix, token, permission }),
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
        } catch { }
      }
    }
  };

  if (!isOpen) return null;

  const permLabel = permission === "pull"
    ? (es ? "solo lectura (pull)" : "read-only (pull)")
    : (es ? "escritura (push)" : "write (push)");

  const accentColor = permission === "pull" ? "amber" : "sky";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0d1424] border border-slate-700 rounded-xl shadow-2xl p-6 mx-4">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className={`text-sm font-bold uppercase tracking-wider ${accentColor === "amber" ? "text-amber-400" : "text-sky-400"}`}>
              {es ? "🔒 Cambiar permisos" : "🔒 Update permissions"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {es ? "Cambia el acceso de los alumnos a sus repos." : "Change student access level on their repos."}
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
                className="mt-2 w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-2 text-sm outline-none focus:border-amber-500/50 transition"
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
                className="mt-2 w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-2 text-sm outline-none focus:border-amber-500/50 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {es ? "Username (opcional)" : "Username (optional)"}
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={es ? "Dejá vacío para afectar todos los repos con ese prefijo" : "Leave empty for all repos with that prefix"}
                className="mt-2 w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-2 text-sm outline-none focus:border-amber-500/50 transition"
              />
            </div>

            {/* Selector de permiso */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {es ? "Nuevo permiso" : "New permission"}
              </label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {([
                  {
                    val: "pull" as Permission,
                    label: es ? "Solo lectura" : "Read only",
                    desc: es ? "Los alumnos no pueden hacer push" : "Students cannot push",
                    color: "amber",
                    icon: "🔒",
                  },
                  {
                    val: "push" as Permission,
                    label: es ? "Lectura + escritura" : "Read + write",
                    desc: es ? "Los alumnos pueden hacer push" : "Students can push",
                    color: "sky",
                    icon: "✏️",
                  },
                ] as const).map(opt => (
                  <div
                    key={opt.val}
                    onClick={() => setPermission(opt.val)}
                    className={`cursor-pointer border rounded-md p-3 transition ${
                      permission === opt.val
                        ? opt.color === "amber"
                          ? "bg-slate-900 border-amber-500 ring-1 ring-amber-500/20"
                          : "bg-slate-900 border-sky-500 ring-1 ring-sky-500/20"
                        : "border-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input type="radio" readOnly checked={permission === opt.val} className="mt-0.5" />
                      <span className={`text-xs font-bold ${
                        permission === opt.val
                          ? opt.color === "amber" ? "text-amber-400" : "text-sky-400"
                          : "text-slate-300"
                      }`}>{opt.icon} {opt.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 pl-4">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-600 italic">
              {es
                ? `Repos afectados: ${org || "org"}/${prefix || "prefijo"}-${username || "*"}`
                : `Affected repos: ${org || "org"}/${prefix || "prefix"}-${username || "*"}`}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleClose} className="px-4 py-2 text-xs text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 transition">
                {es ? "Cancelar" : "Cancel"}
              </button>
              <button
                onClick={handlePreview}
                disabled={!org || !prefix}
                className="px-4 py-2 text-xs font-bold text-amber-300 border border-amber-800 rounded-md hover:bg-amber-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                {es ? "Buscar repos →" : "Find repos →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP: confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-md p-4">
              <p className="text-xs font-bold text-amber-400 mb-1">
                {es
                  ? `Se actualizarán ${reposToUpdate.length} repos → ${permLabel}`
                  : `${reposToUpdate.length} repos will be updated → ${permLabel}`}
              </p>
              <ul className="max-h-48 overflow-y-auto space-y-1 mt-3">
                {reposToUpdate.map(r => (
                  <li key={r} className="text-xs font-mono text-slate-400">{r}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setStep("form")} className="px-4 py-2 text-xs text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 transition">
                {es ? "← Volver" : "← Back"}
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 text-xs font-bold text-amber-200 bg-amber-800/50 hover:bg-amber-700/50 border border-amber-700 rounded-md transition"
              >
                {es ? `Sí, actualizar ${reposToUpdate.length} repos` : `Yes, update ${reposToUpdate.length} repos`}
              </button>
            </div>
          </div>
        )}

        {/* STEP: updating */}
        {step === "updating" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-xs text-slate-500 font-mono mb-1">
                {progress.current === 0
                  ? (es ? "Iniciando..." : "Starting...")
                  : results[results.length - 1]?.status === "ok"
                    ? <span className="text-emerald-400">✓ {results[results.length - 1]?.repo}</span>
                    : <span className="text-rose-400">✗ {results[results.length - 1]?.repo}</span>}
              </p>
              <p className="text-slate-600 text-[11px] font-mono mt-1">
                {progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
              </p>
              <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP: done */}
        {step === "done" && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <p className="text-emerald-400 font-bold text-sm mb-1">
                {es ? "¡Listo!" : "Done!"}
              </p>
              <p className="text-xs text-slate-500">
                {results.filter(r => r.status === "ok").length} ok
                {" · "}
                {results.filter(r => r.status === "error").length} errores
              </p>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-900/40 border border-slate-800 rounded-md">
                  <span className="text-xs font-mono text-slate-400">{r.repo}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    r.status === "ok"
                      ? "text-emerald-400 bg-emerald-400/10 border border-emerald-400/30"
                      : "text-rose-400 bg-rose-400/10 border border-rose-400/30"
                  }`}>
                    {r.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
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