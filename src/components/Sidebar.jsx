import React, { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button.jsx';
import { getNavItemsForRole } from '../config/navByRole.js';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const roleName = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data?.session?.roleName ?? null;
    } catch {
      return null;
    }
  }, []);

  const navItems = useMemo(() => getNavItemsForRole(roleName), [roleName]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const NavContent = () => (
    <nav className="mt-6 space-y-1">
      {navItems.map((item) => {
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.key}
            to={item.to}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-800 text-[0.6rem] font-bold text-[var(--app-fg)]">
              {item.key.slice(0, 2).toUpperCase()}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300"
      >
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-900/40 text-xs font-bold">
          ⎋
        </span>
        <span>Cerrar sesión</span>
      </button>
    </nav>
  );

  return (
    <>
      <div className="fixed top-4 left-4 z-40 lg:hidden">
        <Button
          size="icon"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          ☰
        </Button>
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-[var(--sidebar-overlay-bg)] p-4 shadow-xl transition-transform lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight text-emerald-400">
            Awna CRM
          </span>
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
            ✕
          </Button>
        </div>
        <NavContent />
      </div>

      <aside className="hidden h-screen w-64 flex-col border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] px-4 py-6 lg:flex lg:sticky lg:top-0 lg:overflow-y-auto">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-extrabold">
            A
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight text-slate-50">
              Awna CRM
            </div>
            <div className="text-xs text-slate-400">
              {roleName ? roleName.replace(/_/g, ' ') : 'Panel'}
            </div>
          </div>
        </div>
        <NavContent />
      </aside>
    </>
  );
};

export default Sidebar;
