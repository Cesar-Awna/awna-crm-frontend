import React from 'react';

const Card = ({ className = '', children }) => {
  return (
    <div className={`rounded-xl border border-[var(--border-color)] bg-[var(--panel-bg)] p-5 shadow-lg ${className}`}>
      {children}
    </div>
  );
};

const CardHeader = ({ className = '', children }) => (
  <div className={`mb-3 flex flex-col gap-1 ${className}`}>{children}</div>
);

const CardTitle = ({ className = '', children }) => (
  <h3 className={`text-lg font-semibold tracking-tight ${className}`}>{children}</h3>
);

const CardContent = ({ className = '', children }) => (
  <div className={className}>{children}</div>
);

export { Card, CardHeader, CardTitle, CardContent };

