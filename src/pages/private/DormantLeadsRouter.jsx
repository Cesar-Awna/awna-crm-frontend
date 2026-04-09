import React, { useMemo } from 'react';
import ExecutiveDormantLeads from './executive/DormantLeads.jsx';
import AdminDormantLeads from './company-admin/DormantLeads.jsx';

const DormantLeadsRouter = () => {
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
    return <AdminDormantLeads />;
  }

  return <ExecutiveDormantLeads />;
};

export default DormantLeadsRouter;
