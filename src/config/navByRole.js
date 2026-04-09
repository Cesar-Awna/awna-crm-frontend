/**
 * Ítems del menú lateral por rol.
 * Cada rol ve solo los ítems listados aquí.
 */

const EXECUTIVE = [
  { key: 'my-day', label: 'Mi Día', to: '/my-day' },
  { key: 'leads', label: 'Leads', to: '/leads' },
  { key: 'new-lead', label: 'Nuevo Lead', to: '/leads/new' },
  { key: 'my-ranking', label: 'Mi Ranking', to: '/my-ranking' },
  { key: 'my-metrics', label: 'Mis Métricas', to: '/my-metrics' },
  { key: 'notifications', label: 'Notificaciones', to: '/notifications' },
  { key: 'profile', label: 'Perfil', to: '/profile' },
];

const SUPERVISOR = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { key: 'leads', label: 'Leads', to: '/leads' },
  { key: 'dormant', label: 'Dormidos', to: '/leads/dormant' },
  { key: 'stagnant', label: 'Estancados', to: '/leads/stagnant' },
  { key: 'ranking', label: 'Ranking', to: '/ranking' },
  { key: 'metrics', label: 'Métricas', to: '/metrics' },
  { key: 'assignments', label: 'Asignaciones', to: '/assignments' },
  { key: 'notifications', label: 'Notificaciones', to: '/notifications' },
  { key: 'profile', label: 'Perfil', to: '/profile' },
];

const COMPANY_ADMIN = [
  ...SUPERVISOR,
  { key: 'admin', label: 'Panel Admin', to: '/admin' },
];

const SUPER_ADMIN = [
  { key: 'companies', label: 'Empresas', to: '/companies' },
  { key: 'monitoring', label: 'Monitoreo', to: '/monitoring' },
  { key: 'support', label: 'Soporte', to: '/support' },
  { key: 'profile', label: 'Perfil', to: '/profile' },
];

export const NAV_BY_ROLE = {
  EXECUTIVE,
  SUPERVISOR,
  COMPANY_ADMIN,
  SUPER_ADMIN,
};

export const DEFAULT_PATH_BY_ROLE = {
  EXECUTIVE: '/my-day',
  SUPERVISOR: '/dashboard',
  COMPANY_ADMIN: '/dashboard',
  SUPER_ADMIN: '/companies',
};

/**
 * @param {string} roleName - session.roleName del login
 * @returns {Array<{ key: string, label: string, to: string }>}
 */
export function getNavItemsForRole(roleName) {
  const role = (roleName || '').toUpperCase().replace(/\s/g, '_');
  const items = NAV_BY_ROLE[role] ?? EXECUTIVE;
  return items;
}

/**
 * @param {string} roleName
 * @returns {string} path to redirect after login or default
 */
export function getDefaultPathForRole(roleName) {
  const role = (roleName || '').toUpperCase().replace(/\s/g, '_');
  return DEFAULT_PATH_BY_ROLE[role] ?? '/dashboard';
}
