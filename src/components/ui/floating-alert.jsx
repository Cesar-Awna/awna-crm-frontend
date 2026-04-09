import React from 'react';

const variantStyles = {
  error: 'border-red-500/60 bg-red-950/95 text-red-200',
  success: 'border-emerald-500/60 bg-emerald-950/95 text-emerald-200',
  warning: 'border-amber-500/60 bg-amber-950/95 text-amber-200',
  info: 'border-sky-500/60 bg-sky-950/95 text-sky-200',
};

/**
 * Aviso fijo arriba a la derecha: visible aunque el usuario haya hecho scroll.
 * Uso típico: `message` desde estado local y `onDismiss` para cerrar.
 */
export function FloatingAlert({
  message,
  children,
  variant = 'error',
  onDismiss,
  dismissLabel = 'Cerrar',
  className = '',
  /** Si hay varios avisos a la vez (ej. éxito + error), usa 0, 1, 2… para apilarlos. */
  stackIndex = 0,
}) {
  const hasContent =
    children != null ||
    (message != null && String(message).trim() !== '');
  if (!hasContent) return null;

  const tone = variantStyles[variant] || variantStyles.error;
  const topRem = 1 + stackIndex * 5.5;

  return (
    <div
      className={`fixed right-4 z-100 w-[min(92vw,28rem)] rounded-lg border p-3 shadow-2xl ${tone} ${className}`}
      style={{ top: `${topRem}rem` }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 text-sm">{children ?? message}</div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded px-2 py-1 text-xs opacity-90 hover:bg-black/20"
          >
            {dismissLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default FloatingAlert;
