import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LeadsService from '../services/Leads.js';

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await LeadsService.search({ q: query.trim() });
        if (res?.success) {
          setResults((res.data || []).slice(0, 8));
          setOpen(true);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (lead) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    navigate(`/leads/${lead._id}`);
  };

  const getLeadName = (lead) =>
    lead.fields?.razonSocial ?? lead.razonSocial ?? `Lead #${lead._id.slice(-6)}`;

  const getLeadContact = (lead) =>
    lead.fields?.nombreContacto ?? lead.fields?.contactName ?? lead.contactName ?? '';

  const STATUS_COLORS = {
    NUEVO: '#38bdf8', CONTACTADO: '#60a5fa', INTERESADO: '#a78bfa',
    COTIZACION_ENVIADA: '#fbbf24', EN_SEGUIMIENTO: '#f97316',
    CERRADO_GANADO: '#10b981', CLIENTE: '#059669',
    CERRADO_PERDIDO: '#ef4444', NO_INTERESADO: '#fb7185',
    DATO_ERRADO: '#94a3b8',
  };

  return (
    <div ref={containerRef} className="relative mb-4">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder="Buscar lead…"
          className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] py-2 pl-8 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--sidebar-bg)] shadow-xl">
          {results.map((lead) => (
            <button
              key={lead._id}
              type="button"
              onClick={() => handleSelect(lead)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-800 transition-colors"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[lead.status] || '#94a3b8' }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-200">{getLeadName(lead)}</p>
                {getLeadContact(lead) && (
                  <p className="truncate text-xs text-slate-400">{getLeadContact(lead)}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && results.length === 0 && !loading && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-[var(--border-color)] bg-[var(--sidebar-bg)] px-3 py-3 shadow-xl">
          <p className="text-xs text-slate-400">Sin resultados para "{query}"</p>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
