import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Building2 } from 'lucide-react';
import { Button } from './ui/button.jsx';
import { getNavItemsForRole } from '../config/navByRole.js';
import { getStoredRole } from '../lib/session.js';
import NotificationsService from '../services/Notifications.js';
import GlobalSearch from './GlobalSearch.jsx';
import { useBU } from '../contexts/BUContext.jsx';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const roleName = useMemo(() => getStoredRole(), []);
  const navItems = useMemo(() => getNavItemsForRole(roleName), [roleName]);
  const logoSrc = theme === 'light' ? '/images/logo-dark.webp' : '/images/logo-white.webp';
  const { activeBuId, setActiveBuId, allBus } = useBU();
  const isAdmin = roleName === 'COMPANY_ADMIN' || roleName === 'SUPER_ADMIN';

  useEffect(() => {
    NotificationsService.getUnread()
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setUnreadCount(res.data.length);
      })
      .catch(() => {});
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const NavContent = () => (
    <nav className="mt-6 space-y-1">
      {navItems.map((item) => {
        const active = location.pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            to={item.to}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            {Icon && <Icon size={17} strokeWidth={1.75} className="shrink-0" />}
            <span>{item.label}</span>
            {item.key === 'notifications' && unreadCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300"
      >
        <LogOut size={17} strokeWidth={1.75} className="shrink-0" />
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
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoSrc} alt="AWNA CRM" className="h-12 mb-3" />
          <div className="text-xs text-slate-400 font-medium">
            {roleName ? roleName.replace(/_/g, ' ') : 'Panel'}
          </div>
        </div>
        <GlobalSearch />
        {isAdmin && allBus.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-700/60 bg-slate-800/50 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <Building2 size={11} />
              Unidad de negocio
            </div>
            <select
              value={activeBuId}
              onChange={(e) => setActiveBuId(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {allBus.map((bu) => (
                <option key={bu._id} value={String(bu._id)}>{bu.name}</option>
              ))}
            </select>
          </div>
        )}
        <NavContent />
      </aside>
    </>
  );
};

export default Sidebar;
