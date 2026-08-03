import { useEffect, useState } from 'react';
import { getStoredSession } from '../lib/session.js';
import MetricsService from '../services/Metrics.js';
import RankingService from '../services/Ranking.js';
import LeadsService from '../services/Leads.js';
import UsersService from '../services/Users.js';

const useDashboardData = (businessUnitId, activityPeriod = 'week') => {
  const [data, setData] = useState({
    summary: null,
    conversion: null,
    activity: null,
    ranking: null,
    leads: null,
    executives: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = getStoredSession();

      const params = {
        period: activityPeriod,
      };

      const leadsParams = {};
      if (businessUnitId && session?.role !== 'SUPER_ADMIN') {
        leadsParams.businessUnitId = businessUnitId;
      }

      const [summaryRes, conversionRes, activityRes, rankingRes, leadsRes, executivesRes] = await Promise.all([
        MetricsService.getSummary(),
        MetricsService.getConversion(),
        MetricsService.getActivity(params),
        RankingService.getWeekly(),
        LeadsService.getStats(leadsParams),
        UsersService.getExecutives({ limit: 1000 }),
      ]);

      setData({
        summary: summaryRes?.success ? summaryRes.data : null,
        conversion: conversionRes?.success ? conversionRes.data : null,
        activity: activityRes?.success ? activityRes.data : null,
        ranking: rankingRes?.success ? rankingRes.data : null,
        leads: leadsRes?.success ? leadsRes.data : null,
        executives: executivesRes?.success ? executivesRes.data : [],
      });
    } catch (e) {
      console.error('Error loading dashboard data:', e);
      setError(e?.message || 'Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [businessUnitId, activityPeriod]);

  return { data, loading, error, refetch: loadData };
};

export default useDashboardData;
