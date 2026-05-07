import React from 'react';
import SupervisorRanking from './supervisor/Ranking.jsx';
import AdminRanking from './company-admin/Ranking.jsx';
import { getStoredRole } from '../../lib/session.js';

const RankingRouter = () => {
  const role = getStoredRole();
  if (role === 'COMPANY_ADMIN' || role === 'SUPERVISOR') return <AdminRanking />;
  return <SupervisorRanking />;
};

export default RankingRouter;
