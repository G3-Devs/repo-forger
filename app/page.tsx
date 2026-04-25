// app/page.tsx
"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";

// 1. Diccionario fuera del componente para evitar ruidos de re-render
const content = {
  en: {
    title: "Create new repositories",
    subtitle: "RepoForger - Mass-automator by G3-Devs",
    owner: "Owner",
    prefix: "Repository prefix",
    preview: "Will be generated:",
    template: "Start with a template",
    templatePlaceholder: "Search for a template repo...",
    visibility: "Choose visibility",
    public: "Public",
    publicDesc: "Anyone can see these repositories.",
    private: "Private",
    privateDesc: "You choose who can see and commit.",
    students: "Student GitHub Usernames (one per line)",
    button: "Create repositories for students",
    processing: "Forging repositories...",
    results: "Process Results:",
    login: "Sign in with GitHub",
    logout: "Sign out",
    select: "Select organization"
  },
  es: {
    title: "Crear nuevos repositorios",
    subtitle: "RepoForger - Automatización masiva por G3-Devs",
    owner: "Dueño",
    prefix: "Prefijo del repositorio",
    preview: "Se generará:",
    template: "Empezar con un template",
    templatePlaceholder: "Buscar un repo template...",
    visibility: "Elegir visibilidad",
    public: "Público",
    publicDesc: "Cualquiera puede ver estos repositorios.",
    private: "Privado",
    privateDesc: "Vos elegís quién puede ver y commitear.",
    students: "Usuarios de GitHub (uno por línea)",
    button: "Crear repositorios para alumnos",
    processing: "Forjando repositorios...",
    results: "Resultados del proceso:",
    login: "Entrar con GitHub",
    logout: "Cerrar sesión",
    select: "Seleccionar organización"
  }
};

export default function Page() {
  const { data: session } = useSession();
  
  // ESTADOS
  const [lang, setLang] = useState<"es" | "en">("es");
  const [org, setOrg] = useState("");
  const [template, setTemplate] = useState("");
  const [repoBase, setRepoBase] = useState("tp1");
  const [usersText, setUsersText] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [result, setResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Referencia activa a los textos
  const t = content[lang];

  // Cambio de idioma (Fix definitivo)
  const toggleLanguage = () => {
    setLang((current) => (current === "en" ? "es" : "en"));
  };

  useEffect(() => {
    if (!session?.accessToken) return;
    fetch("/api/orgs", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((res) => res.json())
      .then((data) => setOrgs(data));
  }, [session]);

  useEffect(() => {
    if (!org || !session?.accessToken) {
      setTemplates([]);
      return;
    }
    fetch(`/api/templates?org=${org}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(err => console.error("Error templates", err));
  }, [org, session]);

  const handleSubmit = async () => {
    const users = usersText.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!org || !template || users.length === 0) {
      alert(lang === "en" ? "Please fill all fields" : "Por favor completá todos los campos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        body: JSON.stringify({ org, template, repoBase, users, isPrivate, token: session?.accessToken }),
      });
      const data = await res.json();
      setResult(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-[#d1d5db] flex flex-col items-center p-6 md:p-12 font-sans">
      <div className="w-full max-w-3xl space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{t.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{t.subtitle}</p>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            {/* BOTÓN TRADUCCIÓN */}
            <button 
              onClick={toggleLanguage}
              className="text-xs font-bold text-slate-400 border border-slate-700 px-3 py-1.5 rounded hover:bg-slate-800 transition flex items-center gap-2"
            >
              {lang === "en" ? "🇦🇷 ES" : "🇺🇸 EN"}
            </button>

            {session && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 font-mono">{session.user?.email}</span>
                <button onClick={() => signOut()} className="text-xs text-[#f85149] hover:underline font-semibold uppercase">{t.logout}</button>
              </div>
            )}
          </div>
        </div>

        {!session ? (
          <div className="py-20 flex justify-center bg-slate-900/30 border border-slate-800 rounded-lg">
             <button onClick={() => signIn("github")} className="bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#0a0f1e] px-8 py-2.5 rounded-md font-bold transition shadow-lg shadow-sky-500/10">
               {t.login}
             </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* FORMULARIO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.owner}</label>
                <select
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  className="bg-[#0a0f1e] border border-slate-700 rounded-md p-2 text-sm focus:border-[#38bdf8] outline-none"
                >
                  <option value="">{t.select}</option>
                  {orgs.map((o) => <option key={o.id} value={o.login}>{o.login}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.prefix}</label>
                <input
                  value={repoBase}
                  onChange={(e) => setRepoBase(e.target.value)}
                  className="bg-[#0a0f1e] border border-slate-700 rounded-md p-2 text-sm focus:border-[#38bdf8] outline-none w-full"
                />
              </div>
            </div>

            <div className="p-3 bg-[#38bdf8]/5 border border-[#38bdf8]/10 rounded-lg">
              <p className="text-xs text-slate-500">
                {t.preview} <span className="text-[#38bdf8] font-mono font-bold ml-1">{org || "org"}/{repoBase}-[username]</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.template}</label>
              <input
                list="templates-datalist"
                placeholder={t.templatePlaceholder}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-2 text-sm outline-none focus:border-[#38bdf8]"
              />
              <datalist id="templates-datalist">
                {templates.map((t) => <option key={t.id} value={t.name}>{t.description}</option>)}
              </datalist>
            </div>

            {/* VISIBILIDAD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[ {val: false, lab: t.public, desc: t.publicDesc}, {val: true, lab: t.private, desc: t.privateDesc} ].map((opt) => (
                  <div 
                    key={String(opt.val)}
                    onClick={() => setIsPrivate(opt.val)}
                    className={`flex items-start gap-3 cursor-pointer border rounded-md p-4 transition ${isPrivate === opt.val ? 'bg-slate-900 border-[#38bdf8]' : 'bg-transparent border-slate-800 hover:border-slate-700'}`}
                  >
                    <input type="radio" checked={isPrivate === opt.val} readOnly className="mt-1" />
                    <div className="text-sm">
                      <p className={`font-bold ${isPrivate === opt.val ? 'text-[#38bdf8]' : 'text-slate-300'}`}>{opt.lab}</p>
                      <p className="text-xs text-slate-600">{opt.desc}</p>
                    </div>
                  </div>
                ))}
            </div>

            {/* USERNAMES */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.students}</label>
              <textarea
                rows={5}
                value={usersText}
                onChange={(e) => setUsersText(e.target.value)}
                className="w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-3 text-sm font-mono outline-none focus:border-[#38bdf8] resize-none"
                placeholder="octocat&#10;torvalds"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-md font-bold transition-all shadow-lg active:scale-95"
            >
              {loading ? t.processing : t.button}
            </button>
          </div>
        )}

        {/* LOG */}
        {result.length > 0 && (
          <div className="mt-10 pt-8 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{t.results}</h3>
            <div className="space-y-2">
              {result.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-900/30 border border-slate-800 rounded-md">
                  <span className="text-xs font-mono text-slate-300">{r.username}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.status === "ok" ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"}`}>
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