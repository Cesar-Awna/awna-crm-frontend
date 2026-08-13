import React, { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import { Button } from './ui/button.jsx';

// value: { from: 'YYYY-MM-DD' | '', to: 'YYYY-MM-DD' | '' }
// onChange: ({ from, to }) => void

const toLocalDate = (str) => {
  if (!str) return undefined;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toStr = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const fmtShort = (str) => {
  const d = toLocalDate(str);
  if (!d) return '';
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const buildPresets = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  return [
    { key: 'today', label: 'Hoy', from: today, to: today },
    { key: 'yesterday', label: 'Ayer', from: addDays(today, -1), to: addDays(today, -1) },
    { key: 'last7', label: 'Últimos 7 días', from: addDays(today, -6), to: today },
    { key: 'last30', label: 'Últimos 30 días', from: addDays(today, -29), to: today },
    { key: 'monthToDate', label: 'Este mes hasta la fecha', from: startOfMonth, to: today },
    { key: 'month', label: 'Este mes', from: startOfMonth, to: endOfMonth },
    { key: 'lastMonth', label: 'Mes pasado', from: startOfLastMonth, to: endOfLastMonth },
  ];
};

const DateRangePicker = ({ value = { from: '', to: '' }, onChange, placeholder = 'Todas las fechas' }) => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState({ from: undefined, to: undefined });
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPending({ from: toLocalDate(value.from), to: toLocalDate(value.to) });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const presets = buildPresets();

  const isPresetActive = (p) =>
    pending.from && pending.to &&
    toStr(pending.from) === toStr(p.from) && toStr(pending.to) === toStr(p.to);

  const handleApply = () => {
    onChange?.({ from: toStr(pending.from), to: toStr(pending.to || pending.from) });
    setOpen(false);
  };

  const handleClear = () => {
    onChange?.({ from: '', to: '' });
    setOpen(false);
  };

  const buttonLabel = value.from
    ? `${fmtShort(value.from)} – ${fmtShort(value.to || value.from)}`
    : placeholder;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 items-center gap-2 rounded-md border border-(--input-border) bg-(--input-bg) px-3 text-sm ${
          value.from ? 'text-(--input-fg)' : 'text-(--muted-fg)'
        }`}
      >
        <span>📅</span>
        <span>{buttonLabel}</span>
        <span className="text-xs text-(--muted-fg)">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 flex flex-col gap-0 rounded-lg border border-(--border-color) bg-(--panel-bg) shadow-2xl backdrop-blur-xl sm:flex-row">
          {/* Presets */}
          <div className="flex flex-col border-b border-(--border-color) py-2 sm:border-b-0 sm:border-r">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPending({ from: p.from, to: p.to })}
                className={`whitespace-nowrap px-4 py-2 text-left text-sm hover:bg-(--hover-bg) ${
                  isPresetActive(p) ? 'bg-(--hover-bg) font-medium text-(--app-fg)' : 'text-(--muted-fg-2)'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="whitespace-nowrap px-4 py-2 text-left text-sm text-(--muted-fg) underline hover:bg-(--hover-bg)"
            >
              Todas las fechas
            </button>
          </div>

          {/* Calendar + actions */}
          <div className="p-3">
            <DayPicker
              mode="range"
              locale={es}
              selected={pending.from ? { from: pending.from, to: pending.to } : undefined}
              onSelect={(r) => setPending({ from: r?.from, to: r?.to })}
              defaultMonth={pending.from || new Date()}
              captionLayout="dropdown"
              className="crm-daypicker"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-(--muted-fg)">
                {pending.from
                  ? `${fmtShort(toStr(pending.from))} – ${fmtShort(toStr(pending.to || pending.from))}`
                  : 'Selecciona un rango o atajo'}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={handleApply} disabled={!pending.from}>
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
