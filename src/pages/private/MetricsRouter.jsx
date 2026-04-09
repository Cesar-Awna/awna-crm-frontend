import React, { useMemo } from 'react';
import SupervisorMetrics from './supervisor/Metrics.jsx';
import AdminMetrics from './company-admin/Metrics.jsx';

const MetricsRouter = () => {
  const role = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const session = parsed?.data?.session || parsed?.session || null;
      return session?.roleName?.toUpperCase() || null;
    } catch {
      return null;
    }
  }, []);

  if (role === 'COMPANY_ADMIN' || role === 'SUPERVISOR') {
    return <AdminMetrics />;
  }

  return <SupervisorMetrics />;
};

export default MetricsRouter;
