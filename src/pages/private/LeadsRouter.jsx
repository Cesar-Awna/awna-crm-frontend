import React from 'react';
import ExecutiveLeads from './executive/Leads.jsx';
import AdminLeads from './company-admin/Leads.jsx';
import { getStoredRole } from '../../lib/session.js';

const LeadsRouter = () => {
  const role = getStoredRole();
  if (role === 'COMPANY_ADMIN' || role === 'SUPERVISOR') return <AdminLeads />;
  return <ExecutiveLeads />;
};

export default LeadsRouter;
