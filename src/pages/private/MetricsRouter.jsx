import React from 'react';
import SupervisorMetrics from './supervisor/Metrics.jsx';
import AdminMetrics from './company-admin/Metrics.jsx';
import { getStoredRole } from '../../lib/session.js';

const MetricsRouter = () => {
  const role = getStoredRole();
  if (role === 'SUPERVISOR') return <SupervisorMetrics />;
  if (role === 'COMPANY_ADMIN') return <AdminMetrics />;
  return <SupervisorMetrics />;
};

export default MetricsRouter;
