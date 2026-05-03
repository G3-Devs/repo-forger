// components/TemplateCombobox.tsx
"use client";

import { useState } from "react";

interface Template {
  id: number;
  name: string;
}

interface Props {
  templates: Template[];
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  placeholder: string;
  loadingPlaceholder: string;
}

export default function TemplateCombobox({ templates, value, onChange, loading, placeholder, loadingPlaceholder }: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="relative mt-2">
      <input
        value={value}
        disabled={loading}
        placeholder={loading ? loadingPlaceholder : placeholder}
        onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        className="w-full bg-[#0a0f1e] border border-slate-700 rounded-md p-2 pr-8 text-sm outline-none focus:border-[#38bdf8] transition disabled:opacity-50 disabled:cursor-wait"
      />

      {/* Spinner */}
      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <svg className="animate-spin h-4 w-4 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 12h4z" />
          </svg>
        </div>
      )}

      {/* Dropdown */}
      {showSuggestions && filtered.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-[#0d1424] border border-slate-700 rounded-md shadow-xl max-h-48 overflow-y-auto">
          {filtered.map((t, index) => (
            <li
              key={t.id}
              onMouseDown={() => { onChange(t.name); setShowSuggestions(false); }}
              className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-sky-400 cursor-pointer transition-colors flex gap-2"
            >
              <span className="text-slate-600 text-[10px] w-4 shrink-0 mt-0.5">{index + 1}</span>
              {t.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}