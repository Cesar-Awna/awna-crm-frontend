import React from 'react';
import DynamicField from './DynamicField.jsx';

/**
 * Renders all schema fields in a 2-column grid.
 * Non-textarea fields come first, then `extraFields` (injected inline),
 * then textarea fields (which span full width).
 */
const DynamicLeadForm = ({ schema = [], values = {}, onChange, disabled = false, extraFields = null }) => {
  const sorted = [...schema].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (!sorted.length) {
    return (
      <p className="text-sm text-slate-500 italic">
        No hay campos definidos para esta unidad de negocio.
      </p>
    );
  }

  const inlineFields  = sorted.filter((f) => f.type !== 'textarea');
  const textareaFields = sorted.filter((f) => f.type === 'textarea');

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {inlineFields.map((field) => (
        <DynamicField
          key={field.key}
          field={field}
          value={values[field.key] ?? ''}
          onChange={(val) => onChange(field.key, val)}
          disabled={disabled}
        />
      ))}
      {extraFields}
      {textareaFields.map((field) => (
        <DynamicField
          key={field.key}
          field={field}
          value={values[field.key] ?? ''}
          onChange={(val) => onChange(field.key, val)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default DynamicLeadForm;
