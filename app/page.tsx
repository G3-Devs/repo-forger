// app/page.tsx
"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";

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

  const t = content[lang];

  useEffect(() => {
    if (!session?.accessToken) return;
    fetch("/api/orgs", { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then(res => res.json()).then(data => setOrgs(data));
  }, [session]);

  useEffect(() => {
    if (!org || !session?.accessToken) {
      setTemplates([]);
      return;
    }

    setTemplates([]); // ← limpia inmediatamente antes del fetch

    fetch(`/api/templates?org=${org}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setTemplates(data); });
  }, [org, session]);

  const handleSubmit = async () => {
    const users = usersText.split("\n").map(u => u.trim()).filter(Boolean);
    if (!org || !template || users.length === 0) return alert(lang === "en" ? "Please fill all fields" : "Por favor completá todos los campos");
    setLoading(true);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        body: JSON.stringify({ org, template, repoBase, users, isPrivate, token: session?.accessToken }),
      });
      const data = await res.json();
      setResult(data.results || []);
    } finally { setLoading(false); }
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
                ? <div className="flex flex-row gap-2"><span>🇦🇷</span><span>ES</span></div>
                : <div className="flex flex-row gap-2"><span>🇺🇸</span><span>EN</span></div>}
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
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.template}</label>
              <input
                list="templates-datalist"
                placeholder={t.templatePlaceholder}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="mt-2 w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-2 text-sm outline-none focus:border-[#38bdf8] transition"
              />
              <datalist id="templates-datalist">
                {templates.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </datalist>
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

            {/* USERNAMES */}
            <div className="space-y-2 pt-1 border-t border-slate-800/50">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.students}</label>
              <textarea
                rows={5}
                value={usersText}
                onChange={(e) => setUsersText(e.target.value)}
                className="mt-5 w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-3 text-sm font-mono outline-none focus:border-[#38bdf8] resize-none transition"
                placeholder={"Username_1\nUsername_2\n..."}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="cursor-pointer p-3 bg-sky-600 hover:text-slate-700 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded-md font-bold transition-all shadow-lg active:scale-95"
              >
                {loading ? t.processing : t.button}
              </button>
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