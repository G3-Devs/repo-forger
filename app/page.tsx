// app/page.tsx
"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import TemplateCombobox from "./components/TemplateCombobox";

const content = {
  en: {
    title: "G3 RepoForger",
    subtitle: "Mass generation of repositories for students",
    owner: "Owner",
    prefix: "Repository prefix",
    prefixPlaceholder: "Write generated repos prefix...",
    preview: "Generated repositories will have the structure:",
    template: "Origin template",
    templatePlaceholder: "Write or select template repo name...",
    loadingTemplatesPlaceholder: "Loading templates...",
    refreshTemplates: "Refresh templates",
    visibility: "Choose visibility",
    public: "Public",
    publicDesc: "Anyone can see these repositories.",
    private: "Private",
    privateDesc: "You choose who can see and commit.",
    students: "Students GitHub usernames (one per line)",
    button: "Generate repositories",
    processing: "Forging repositories...",
    results: "Process Results:",
    login: "Sign in with GitHub",
    logout: "Sign out",
    select: "Select organization",
    language: "Change language"
  },
  es: {
    title: "G3 RepoForger",
    subtitle: "Generación masiva de repositorios para estudiantes",
    owner: "Organización",
    prefix: "Prefijo del repo",
    prefixPlaceholder: "Escribí el perfijo del repositorio...",
    preview: "Estructura de los repositorios que se generarán:",
    template: "Plantilla origen",
    templatePlaceholder: "Escribí o seleccioná el nombre de la plantilla...",
    loadingTemplatesPlaceholder: "Cargando plantillas...",
    refreshTemplates: "Actualizar plantillas",
    visibility: "Elegir visibilidad",
    public: "Público",
    publicDesc: "Cualquiera puede ver estos repositorios.",
    private: "Privado",
    privateDesc: "Vos elegís quién puede ver y commitear.",
    students: "Nombres de usuario de GitHub de l@s alumn@s (uno por línea)",
    button: "Generar repositorios",
    processing: "Forjando repositorios...",
    results: "Resultados del proceso:",
    login: "Iniciar sesión con GitHub",
    logout: "Cerrar sesión",
    select: "Seleccionar organización",
    language: "Cambiar idioma"
  }
};

export default function Page() {
  const { data: session } = useSession();
  const [lang, setLang] = useState<"en" | "es">("es");
  const [org, setOrg] = useState("");
  const [template, setTemplate] = useState("");
  const [repoBase, setRepoBase] = useState("");
  const [usersText, setUsersText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [result, setResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const t = content[lang];

  //Fetch orgas (cachea en sessionStorage para no recargar)
  useEffect(() => {
    if (!session?.accessToken) return;

    const cacheKey = `orgs_${session.accessToken}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      setOrgs(JSON.parse(cached));
      return;
    }

    fetch("/api/orgs", { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrgs(data);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      });
  }, [session]);

  //Fetch templates (cachea en sessionStorage para no recargar)
  useEffect(() => {
    if (!org || !session?.accessToken) {
      setTemplates([]);
      setTemplate("");
      return;
    }

    setTemplates([]);
    setTemplate("");

    const cacheKey = `templates_${org}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      setTemplates(JSON.parse(cached));
      return;
    }

    setLoadingTemplates(true);

    fetch(`/api/templates?org=${org}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTemplates(data);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      })
      .finally(() => setLoadingTemplates(false));
  }, [org, session]);

  //Generar repos
  const handleSubmit = async () => {
    const users = usersText.split("\n").map(u => u.trim()).filter(Boolean);
    if (!org || !template || users.length === 0) {
      return alert(lang === "en" ? "Please fill all fields" : "Por favor completá todos los campos");
    }

    setLoading(true);
    setResult([]);
    setProgress({ current: 0, total: 0 });

    const res = await fetch("/api/process", {
      method: "POST",
      body: JSON.stringify({ org, template, repoBase, users, isPrivate, token: session?.accessToken }),
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
            setResult(prev => [...prev, parsed]);
          }
          if (parsed.type === "progress") {
            setProgress({ current: parsed.current, total: parsed.total });
          }
          if (parsed.type === "rate_limit") {
            console.warn(`Rate limit alcanzado, esperando ${Math.ceil(parsed.waitMs / 1000)}s...`);
          }
          if (parsed.type === "done") {
            setLoading(false);
            setTimeout(() => setProgress({ current: 0, total: 0 }), 2000);
          }
        } catch { /* línea incompleta, ignorar */ }
      }
    }

    setLoading(false);
  };

  const refreshTemplates = () => {
    if (!org) return;
    sessionStorage.removeItem(`templates_${org}`);
    setTemplates([]);
    setTemplate("");
    setLoadingTemplates(true);

    fetch(`/api/templates?org=${org}`, {
      headers: { Authorization: `Bearer ${session?.accessToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTemplates(data);
          sessionStorage.setItem(`templates_${org}`, JSON.stringify(data));
        }
      })
      .finally(() => setLoadingTemplates(false));
  };

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-[#d1d5db] flex flex-col items-center p-6 md:p-12 < selection:bg-[#38bdf8]/30">
      <div className="w-full max-w-3xl space-y-8">
        {/* HEADER */}
        <div className="flex justify-between items-start pb-4">
          <div>
            <h1 className="text-xl font-bold text-sky-400 uppercase tracking-wider">{t.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{t.subtitle}</p>
          </div>

          <div className="flex flex-row gap-2 items-end">
            {/* BOTÓN DE IDIOMA */}
            <button
              title={t.language}
              onClick={() => setLang(l => l === "en" ? "es" : "en")}
              className="px-3 py-1.5 gap-2 cursor-pointer text-xs font-bold text-slate-400 border border-slate-700 rounded hover:bg-slate-800 transition"
            >
              {lang === "en"
                ? <div className="flex flex-row gap-2"><span>🇺🇸</span><span>EN</span></div>
                : <div className="flex flex-row gap-2"><span>🇦🇷</span><span>ES</span></div>}
            </button>

            {/* BOTÓN CERRAR SESIÓN (NUEVO) */}
            {session && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-slate-600 hidden sm:block">
                  {session.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  title={t.logout} // Muestra el texto al pasar el mouse
                  className="cursor-pointer p-2 rounded-md border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 transition-all group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {!session ? (
          <div className="py-20 flex justify-center bg-slate-900/30 border border-slate-800 rounded-lg shadow-xl">
            <button onClick={() => signIn("github")} className="bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#0a0f1e] px-8 py-2.5 rounded-md font-bold transition shadow-lg shadow-sky-500/10">
              {t.login}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">

            {/* USUARIO CONECTADO (OPCIONAL) */}
            <div className="flex justify-end">
              <span className="text-[10px] font-mono text-slate-600">{session.user?.email}</span>
            </div>

            {/* OWNER / PREFIX */}
            <div className="pt-1 flex flex-col gap-2 mb-10 border-t border-slate-800/50">
              <div className="pt-1 flex flex-col md:flex-row md:items-end gap-4 md:gap-3 sm:gap-3">
                <div className="flex flex-col gap-4 flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.owner}</label>
                  <select
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    className="p-2 w-full bg-[#0a0f1e] border border-slate-700 rounded-md text-sm outline-none focus:border-[#38bdf8] transition"
                  >
                    <option value="">{t.select}</option>
                    {orgs.map((o) => <option key={o.id} value={o.login}>{o.login}</option>)}
                  </select>
                </div>

                <span className="hidden md:block text-3xl text-slate-700 mb-0.5 font-light">/</span>

                <div className="flex flex-col gap-3 flex-[1.5]">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.prefix}</label>
                  <input
                    placeholder={t.prefixPlaceholder}
                    value={repoBase}
                    onChange={(e) => setRepoBase(e.target.value)}
                    className="p-2 bg-[#0a0f1e] border border-slate-700 rounded-md text-sm focus:border-[#38bdf8] outline-none w-full transition"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic mt-1">
                {t.preview} <span className="text-[#38bdf8] font-mono font-bold ml-1">{org || "org"}/{repoBase}-[username]</span>
              </p>
            </div>

            {/* TEMPLATE */}
            <div className="pt-1 border-t border-slate-800/50 mb-10">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t.template}
              </label>
              <div className="flex items-stretch gap-2 mt-2">
                <TemplateCombobox
                  templates={templates}
                  value={template}
                  onChange={setTemplate}
                  loading={loadingTemplates}
                  placeholder={t.templatePlaceholder}
                  loadingPlaceholder={t.loadingTemplatesPlaceholder}
                />
                {org && (
                  <button
                    onClick={refreshTemplates}
                    disabled={loadingTemplates}
                    title={t.refreshTemplates}
                    className="cursor-pointer shrink-0 px-3 text-slate-400 hover:text-sky-400 disabled:opacity-30 transition-all border border-slate-700 hover:border-sky-400/40 hover:bg-sky-400/5 rounded-md"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={loadingTemplates ? "animate-spin" : "transition-transform hover:rotate-180 duration-300"}
                    >
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M8 16H3v5" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* VISIBILIDAD */}
            <div className="space-y-4 mb-10">
              <div className="border-t border-slate-800/50 pt-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.visibility}</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[{ val: false, lab: t.public, desc: t.publicDesc }, { val: true, lab: t.private, desc: t.privateDesc }].map((opt) => (
                  <div
                    key={String(opt.val)}
                    onClick={() => setIsPrivate(opt.val)}
                    className={`flex items-start gap-3 cursor-pointer border rounded-md p-4 transition ${isPrivate === opt.val ? 'bg-slate-900 border-[#38bdf8] ring-1 ring-[#38bdf8]/20' : 'bg-transparent border-slate-800 hover:border-slate-700'}`}
                  >
                    <input type="radio" checked={isPrivate === opt.val} readOnly className="mt-1" />
                    <div className="text-sm">
                      <p className={`font-bold ${isPrivate === opt.val ? 'text-[#38bdf8]' : 'text-slate-300'}`}>{opt.lab}</p>
                      <p className="text-xs text-slate-600">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* USERNAMES Y BOTÓN GENERAR*/}
            <div className="space-y-4 pt-1 border-t border-slate-800/50">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.students}</label>
              <textarea
                rows={5}
                value={usersText}
                onChange={(e) => setUsersText(e.target.value)}
                className="mt-5 w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-3 text-sm font-mono outline-none focus:border-[#38bdf8] resize-none transition"
                placeholder={"Username_1\nUsername_2\n..."}
              />
              {/* Botón generar */}
              <div className="flex flex-col items-end">
                {/* Botón */}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="relative overflow-hidden min-w-48 px-6 py-2.5 rounded-md font-bold text-sm transition-all duration-300 shadow-lg active:scale-95 disabled:cursor-not-allowed border cursor-pointer hover:shadow-sky-500/20 hover:shadow-xl hover:border-sky-500/70 hover:bg-sky-950/30"
                  style={{
                    borderColor: loading ? "#1e3a4a" : "#0284c7",
                    color: loading ? "#94a3b8" : "#e2e8f0",
                    backgroundColor: "transparent",
                  }}
                >
                  {/* Barra de progreso que llena el fondo */}
                  {loading && progress.total > 0 && (
                    <div
                      className="absolute inset-0 bg-sky-900/40 transition-all duration-500 ease-out origin-left"
                      style={{ transform: `scaleX(${progress.current / progress.total})` }}
                    />
                  )}

                  {/* Texto con transiciones */}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      progress.current >= progress.total && progress.total > 0 ? (
                        // Estado: ¡Listo!
                        <span className="flex items-center gap-2 text-emerald-400 animate-in fade-in duration-500">
                          <img src="/icon.png" width={16} height={16} alt="" className="rounded-sm" />
                          {lang === "es" ? "¡Listo!" : "Done!"}
                        </span>
                      ) : (
                        // Estado: cargando
                        <span className="flex items-center gap-2 animate-in fade-in duration-300">
                          <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                            <path d="M8 16H3v5" />
                          </svg>
                          {lang === "es" ? "Forjando..." : "Forging..."}
                        </span>
                      )
                    ) : (
                      // Estado: idle
                      <span className="flex items-center gap-2 animate-in fade-in duration-300">
                        {t.button}
                        <img src="/icon.png" width={16} height={16} alt="" className="rounded-sm" />
                      </span>
                    )}
                  </span>
                </button>
                {/* Contador */}
                <div className={`max-w-48 text-right mt-2 text-xs text-slate-500 font-mono transition-opacity duration-500 ${loading && progress.total > 0 ? "opacity-100" : "opacity-0"}`}>
                  Progreso: {progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOG DE RESULTADOS */}
        {result.length > 0 && (
          <div className="mt-10 pt-8 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{t.results}</h3>
            <div className="space-y-2">
              {result.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-900/30 border border-slate-800 rounded-md">
                  <span className="text-xs font-mono text-slate-300">{r.username}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.status === "ok" ? "text-emerald-400 bg-emerald-400/10 border border-emerald-400/30" : "text-rose-400 bg-rose-400/10 border border-rose-400/30"}`}>
                    {r.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}