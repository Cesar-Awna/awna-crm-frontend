import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import RankingService from '../../../services/Ranking.js';
import UsersService from '../../../services/Users.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';

const PERIOD_TABS = [
  { value: 'WEEK', label: 'Semanal' },
  { value: 'MONTH', label: 'Mensual' },
];

const AdminRanking = () => {
  const [periodType, setPeriodType] = useState('WEEK');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [filterBU, setFilterBU] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, busRes] = await Promise.all([
          UsersService.getExecutives(),
          BusinessUnitsService.getAll(),
        ]);
        if (usersRes?.success) setUsers(usersRes.data || []);
        if (busRes?.success) setBusinessUnits(busRes.data || []);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadRankings = async () => {
      setLoading(true);
      try {
        const res = periodType === 'WEEK'
          ? await RankingService.getWeekly()
          : await RankingService.getMonthly();

        if (res?.success && Array.isArray(res.data)) {
          setRankings(res.data);
        } else {
          setRankings([]);
        }
      } catch (e) {
        console.error('Error loading rankings:', e);
        setRankings([]);
      } finally {
        setLoading(false);
      }
    };
    loadRankings();
  }, [periodType]);

  const getUserName = (userId) => {
    const user = users.find((u) => u._id === userId);
    return user?.fullName || '—';
  };

  const getUserEmail = (userId) => {
    const user = users.find((u) => u._id === userId);
    return user?.email || '';
  };

  const getBUName = (buId) => {
    const bu = businessUnits.find((b) => b._id === buId);
    return bu?.name || bu?.code || '—';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  };

  const currentPeriodRankings = useMemo(() => {
    if (!rankings.length) return [];

    // Get the most recent period
    const sorted = [...rankings].sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart));
    const latestPeriod = sorted[0]?.periodStart;

    if (!latestPeriod) return [];

    const executiveIds = new Set(users.map((u) => String(u._id)));

    // Only executives in the latest period
    let filtered = sorted.filter(
      (r) => r.periodStart === latestPeriod && executiveIds.has(String(r.userId))
    );

    // Filter by business unit if selected
    if (filterBU) {
      filtered = filtered.filter((r) => String(r.businessUnitId) === filterBU);
    }

    // Sort by totalScore descending
    return filtered.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  }, [rankings, filterBU]);

  const latestPeriodLabel = useMemo(() => {
    if (!currentPeriodRankings.length) return '';
    const r = currentPeriodRankings[0];
    return `${formatDate(r.periodStart)} - ${formatDate(r.periodEnd)}`;
  }, [currentPeriodRankings]);

  const getMedalEmoji = (position) => {
    if (position === 0) return '🥇';
    if (position === 1) return '🥈';
    if (position === 2) return '🥉';
    return `#${position + 1}`;
  };

  const getPositionStyle = (position) => {
    if (position === 0) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    if (position === 1) return 'bg-slate-400/20 text-slate-300 border-slate-400/50';
    if (position === 2) return 'bg-orange-600/20 text-orange-400 border-orange-500/50';
    return 'bg-slate-800/50 text-slate-400 border-slate-700';
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Ranking de Ejecutivos</h1>
          <p className="text-xs text-slate-400">
            Clasificación por puntaje de actividad, progreso y resultados.
          </p>
        </header>

        {/* Period Tabs */}
        <div className="mb-6 flex gap-2">
          {PERIOD_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              variant={periodType === tab.value ? 'default' : 'outline'}
              onClick={() => setPeriodType(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Filter by BU */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-slate-400">Filtrar por unidad:</label>
              <select
                className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                value={filterBU}
                onChange={(e) => setFilterBU(e.target.value)}
              >
                <option value="">Todas las unidades</option>
                {businessUnits.map((bu) => (
                  <option key={bu._id} value={bu._id}>
                    {bu.code} — {bu.name}
                  </option>
                ))}
              </select>
              {latestPeriodLabel && (
                <span className="ml-auto text-xs text-slate-500">
                  Período: {latestPeriodLabel}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>
              Leaderboard {periodType === 'WEEK' ? 'Semanal' : 'Mensual'}
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({currentPeriodRankings.length} ejecutivos)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Cargando ranking…</p>
            ) : currentPeriodRankings.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-lg text-slate-300">📊 Sin datos de ranking</p>
                <p className="text-sm text-slate-500">
                  Aún no hay puntuaciones calculadas para este período.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentPeriodRankings.map((rank, index) => (
                  <div
                    key={rank._id}
                    className={`flex items-center gap-4 rounded-lg border p-4 ${getPositionStyle(index)}`}
                  >
                    {/* Position */}
                    <div className="flex h-10 w-10 items-center justify-center text-xl font-bold">
                      {getMedalEmoji(index)}
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                      <p className="font-medium">{getUserName(rank.userId)}</p>
                      <p className="text-xs text-slate-500">{getUserEmail(rank.userId)}</p>
                      <p className="text-xs text-slate-500">{getBUName(rank.businessUnitId)}</p>
                    </div>

                    {/* Scores */}
                    <div className="flex gap-4 text-center text-xs">
                      <div>
                        <p className="text-slate-400">Actividad</p>
                        <p className="text-lg font-bold text-blue-400">{rank.activityScore || 0}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Progreso</p>
                        <p className="text-lg font-bold text-purple-400">{rank.progressScore || 0}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Resultado</p>
                        <p className="text-lg font-bold text-green-400">{rank.resultScore || 0}</p>
                      </div>
                    </div>

                    {/* Total Score */}
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total</p>
                      <p className="text-2xl font-bold text-emerald-400">{rank.totalScore || 0}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Componentes del puntaje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-blue-400">Actividad</p>
                <p className="text-xs text-slate-400">
                  Llamadas, contactos, notas agregadas
                </p>
              </div>
              <div>
                <p className="font-medium text-purple-400">Progreso</p>
                <p className="text-xs text-slate-400">
                  Cambios de etapa, avance en pipeline
                </p>
              </div>
              <div>
                <p className="font-medium text-green-400">Resultado</p>
                <p className="text-xs text-slate-400">
                  Leads ganados, monto cerrado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminRanking;
