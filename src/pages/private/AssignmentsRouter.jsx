import React, { useMemo } from 'react';
import SupervisorAssignments from './supervisor/Assignments.jsx';
import AdminAssignments from './company-admin/Assignments.jsx';

const AssignmentsRouter = () => {
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
    return <AdminAssignments />;
  }

  return <SupervisorAssignments />;
};

export default AssignmentsRouter;
