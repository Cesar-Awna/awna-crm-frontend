import React from 'react';
import { Input } from './ui/input.jsx';

const labelClass = 'mb-1 block text-xs font-medium text-slate-400';
const requiredMark = <span className="ml-0.5 text-red-400">*</span>;

const baseClass =
  'w-full rounded-md border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50';

const DynamicField = ({ field, value, onChange, disabled = false }) => {
  const { key, label, type, required, options, placeholder } = field;

  if (type === 'select') {
    return (
      <div>
        <label className={labelClass}>{label}{required && requiredMark}</label>
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`${baseClass} cursor-pointer`}
        >
          <option value="">Seleccionar…</option>
          {(options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div className="col-span-full">
        <label className={labelClass}>{label}{required && requiredMark}</label>
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder || ''}
          rows={3}
          className={`${baseClass} resize-none`}
        />
      </div>
    );
  }

  const inputType =
    type === 'phone'  ? 'tel'    :
    type === 'number' ? 'number' :
    type === 'email'  ? 'email'  :
    type === 'date'   ? 'date'   : 'text';

  return (
    <div>
      <label className={labelClass}>{label}{required && requiredMark}</label>
      <Input
        type={inputType}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder || ''}
      />
    </div>
  );
};

export default DynamicField;
