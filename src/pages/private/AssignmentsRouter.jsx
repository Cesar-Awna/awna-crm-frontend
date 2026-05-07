import React from 'react';
import SupervisorAssignments from './supervisor/Assignments.jsx';
import AdminAssignments from './company-admin/Assignments.jsx';
import { getStoredRole } from '../../lib/session.js';

const AssignmentsRouter = () => {
  const role = getStoredRole();
  if (role === 'COMPANY_ADMIN' || role === 'SUPERVISOR') return <AdminAssignments />;
  return <SupervisorAssignments />;
};

export default AssignmentsRouter;
