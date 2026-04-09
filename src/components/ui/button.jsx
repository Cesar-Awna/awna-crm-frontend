import React from 'react';

const baseClasses =
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-[var(--ring-offset)]';

const variantClasses = {
  default: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
  outline:
    'border border-[var(--border-color)] bg-transparent text-[var(--input-fg)] hover:bg-[var(--hover-bg)]',
  ghost: 'bg-transparent text-[var(--input-fg)] hover:bg-[var(--hover-bg)]',
};

const sizeClasses = {
  default: 'h-10 px-4 py-2',
  sm: 'h-8 px-3',
  lg: 'h-11 px-6',
  icon: 'h-9 w-9',
};

const Button = ({ className = '', variant = 'default', size = 'default', ...props }) => {
  const v = variantClasses[variant] || variantClasses.default;
  const s = sizeClasses[size] || sizeClasses.default;
  return (
    <button
      className={`${baseClasses} ${v} ${s} ${className}`}
      {...props}
    />
  );
};

export { Button };

