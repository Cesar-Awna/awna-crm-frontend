import { Navigate } from 'react-router-dom';
import { getDefaultPathForRole } from '../config/navByRole.js';
import { getStoredRole } from '../lib/session.js';

const DefaultRedirect = () => {
  const to = getDefaultPathForRole(getStoredRole());
  return <Navigate to={to} replace />;
};

export default DefaultRedirect;
