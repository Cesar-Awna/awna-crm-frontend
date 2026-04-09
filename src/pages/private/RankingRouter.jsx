import React, { useMemo } from 'react';
import SupervisorRanking from './supervisor/Ranking.jsx';
import AdminRanking from './company-admin/Ranking.jsx';

const RankingRouter = () => {
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

  if (role === 'COMPANY_ADMIN') {
    return <AdminRanking />;
  }

  // SUPERVISOR uses the same admin view
  if (role === 'SUPERVISOR') {
    return <AdminRanking />;
  }

  return <SupervisorRanking />;
};

export default RankingRouter;
