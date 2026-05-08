import {
  Sun,
  Users,
  PlusCircle,
  Trophy,
  BarChart2,
  Bell,
  User,
  ClipboardList,
  LayoutGrid,
  Building2,
  Activity,
  HeadphonesIcon,
  FormInput,
} from 'lucide-react';

const EXECUTIVE = [
  { key: 'my-day',       label: 'Mi Día',         to: '/my-day',      icon: Sun },
  { key: 'leads',        label: 'Leads',           to: '/leads',       icon: Users },
  { key: 'new-lead',     label: 'Nuevo Lead',      to: '/leads/new',   icon: PlusCircle },
  { key: 'my-ranking',   label: 'Mi Ranking',      to: '/my-ranking',  icon: Trophy },
  { key: 'my-metrics',   label: 'Mis Métricas',    to: '/my-metrics',  icon: BarChart2 },
  { key: 'notifications',label: 'Notificaciones',  to: '/notifications',icon: Bell },
  { key: 'profile',      label: 'Perfil',          to: '/profile',     icon: User },
];

const SUPERVISOR = [
  { key: 'leads',        label: 'Leads',           to: '/leads',       icon: Users },
  { key: 'ranking',      label: 'Ranking',         to: '/ranking',     icon: Trophy },
  { key: 'metrics',      label: 'Métricas',        to: '/metrics',     icon: BarChart2 },
  { key: 'assignments',  label: 'Asignaciones',    to: '/assignments', icon: ClipboardList },
  { key: 'notifications',label: 'Notificaciones',  to: '/notifications',icon: Bell },
  { key: 'profile',      label: 'Perfil',          to: '/profile',     icon: User },
];

const COMPANY_ADMIN = [
  ...SUPERVISOR,
  { key: 'users',        label: 'Usuarios',           to: '/users',        icon: Users },
  { key: 'admin',        label: 'Panel Admin',        to: '/admin',        icon: LayoutGrid },
  { key: 'form-builder', label: 'Constructor de Form', to: '/form-builder', icon: FormInput  },
];

const SUPER_ADMIN = [
  { key: 'companies',    label: 'Empresas',        to: '/companies',   icon: Building2 },
  { key: 'monitoring',   label: 'Monitoreo',       to: '/monitoring',  icon: Activity },
  { key: 'profile',      label: 'Perfil',          to: '/profile',     icon: User },
];

export const NAV_BY_ROLE = {
  EXECUTIVE,
  SUPERVISOR,
  COMPANY_ADMIN,
  SUPER_ADMIN,
};

export const DEFAULT_PATH_BY_ROLE = {
  EXECUTIVE: '/my-day',
  SUPERVISOR: '/leads',
  COMPANY_ADMIN: '/leads',
  SUPER_ADMIN: '/companies',
};

export function getNavItemsForRole(roleName) {
  const role = (roleName || '').toUpperCase().replace(/\s/g, '_');
  return NAV_BY_ROLE[role] ?? EXECUTIVE;
}

export function getDefaultPathForRole(roleName) {
  const role = (roleName || '').toUpperCase().replace(/\s/g, '_');
  return DEFAULT_PATH_BY_ROLE[role] ?? '/my-day';
}
