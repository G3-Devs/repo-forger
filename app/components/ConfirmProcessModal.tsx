"use client";

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  repoCount: number;
  estimatedTime: string;
  lang: "en" | "es";
}

export default function ConfirmProcessModal({ isOpen, onConfirm, onCancel, repoCount, estimatedTime, lang }: Props) {
  if (!isOpen) return null;

  const es = lang === "es";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0d1424] border border-slate-700 rounded-xl shadow-2xl p-6 mx-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Ícono */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-sky-950/50 border border-sky-800/50 flex items-center justify-center">
            <img src="/icon.png" width={32} height={32} alt="" className="rounded-sm" />
          </div>
        </div>

        {/* Título */}
        <h2 className="text-center text-sm font-bold text-slate-200 mb-1">
          {es ? `Crear ${repoCount} repositorios` : `Create ${repoCount} repositories`}
        </h2>
        <p className="text-center text-xs text-slate-500 mb-6">
          {es ? "Revisá los detalles antes de continuar" : "Review the details before continuing"}
        </p>

        {/* Info */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-lg">
            <span className="text-xs text-slate-400">{es ? "Repositorios a crear" : "Repositories to create"}</span>
            <span className="text-xs font-bold text-sky-400 font-mono">{repoCount}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-lg">
            <span className="text-xs text-slate-400">{es ? "Tiempo estimado" : "Estimated time"}</span>
            <span className="text-xs font-bold text-sky-400 font-mono">{estimatedTime}</span>
          </div>
          <div className="flex gap-2 px-4 py-3 bg-amber-950/20 border border-amber-800/30 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0 mt-0.5">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <p className="text-[11px] text-amber-300/80">
              {es
                ? "No cerrés ni recargues la pestaña durante el proceso."
                : "Don't close or reload the tab during the process."}
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 transition cursor-pointer"
          >
            {es ? "Cancelar" : "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-200 bg-sky-700 hover:bg-sky-600 border border-sky-600 rounded-md transition cursor-pointer"
          >
            {es ? "Sí, crear repos" : "Yes, create repos"}
          </button>
        </div>

      </div>
    </div>
  );
}