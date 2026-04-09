import { Navigate } from 'react-router-dom';
import { getDefaultPathForRole } from '../config/navByRole.js';

/**
 * Redirige a la ruta por defecto según el rol del usuario en localStorage.
 * Si no hay sesión, redirige a /login (PrivateRoute ya no debería dejar llegar aquí).
 */
const DefaultRedirect = () => {
  let roleName = null;
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const data = JSON.parse(raw);
      roleName = data?.session?.roleName ?? null;
    }
  } catch {
    // ignore
  }
  const to = getDefaultPathForRole(roleName);
  return <Navigate to={to} replace />;
};

export default DefaultRedirect;
