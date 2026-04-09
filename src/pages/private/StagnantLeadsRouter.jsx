import React, { useMemo } from 'react';
import ExecutiveStagnantLeads from './executive/StagnantLeads.jsx';
import AdminStagnantLeads from './company-admin/StagnantLeads.jsx';

const StagnantLeadsRouter = () => {
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
    return <AdminStagnantLeads />;
  }

  return <ExecutiveStagnantLeads />;
};

export default StagnantLeadsRouter;
