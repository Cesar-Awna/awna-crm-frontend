import React, { useMemo } from 'react';
import ExecutiveLeads from './executive/Leads.jsx';
import AdminLeads from './company-admin/Leads.jsx';

const LeadsRouter = () => {
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
    return <AdminLeads />;
  }

  return <ExecutiveLeads />;
};

export default LeadsRouter;
