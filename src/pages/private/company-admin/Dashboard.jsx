import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import { getStoredSession } from '../../../lib/session.js';
import useDashboardData from '../../../hooks/useDashboardData.js';

const STATUS_COLORS = {
  NUEVO: '#38bdf8',
  DATO_ERRADO: '#f87171',
  CONTACTADO: '#60a5fa',
  INTERESADO: '#a78bfa',
  COTIZACION_ENVIADA: '#fbbf24',
  EN_SEGUIMIENTO: '#f97316',
  CERRADO_GANADO: '#10b981',
  CERRADO_PERDIDO: '#ef4444',
};

const ACTIVITY_COLORS = [
  '#38bdf8', '#60a5fa', '#a78bfa', '#ec4899', '#f97316', '#fbbf24',
  '#10b981', '#14b8a6', '#6366f1', '#f43f5e', '#84cc16', '#22d3ee',
];

const Dashboard = () => {
  const navigate = useNavigate();
  const session = getStoredSession();
  const [selectedBUId, setSelectedBUId] = useState('');
  const [activityPeriod, setActivityPeriod] = useState('week');
  const [businessUnits, setBusinessUnits] = useState([]);

  const { data, loading, error } = useDashboardData(selectedBUId, activityPeriod);

  React.useEffect(() => {
    const loadBusinessUnits = async () => {
      try {
        const res = await BusinessUnitsService.getAll();
        if (res?.success) {
          setBusinessUnits(res.data || []);
          if (!selectedBUId && res.data?.length > 0) {
            setSelectedBUId(res.data[0]._id);
          }
        }
      } catch (e) {
        console.error('Error loading business units:', e);
      }
    };
    loadBusinessUnits();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-50">
        <Sidebar />
        <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
          <p className="text-sm text-slate-400">Cargando dashboard...</p>
        </main>
      </div>
    );
  }

  const summary = data.summary || {};
  const conversion = data.conversion || {};
  const activity = data.activity || { byType: {}, closures: 0 };
  const ranking = data.ranking || [];
  const executives = data.executives || [];

  const openLeads = summary.openLeads || 0;
  const wonLeads = summary.wonLeads || 0;
  const lostLeads = summary.lostLeads || 0;
  const conversionRate = conversion.conversionRatePct || 0;
  const totalEvents = summary.totalEvents || 0;

  const byStatus = summary.byStatus || {};
  const statusEntries = Object.entries(byStatus).sort(([, a], [, b]) => b - a).slice(0, 8);
  const statusTotal = statusEntries.reduce((sum, [, count]) => sum + count, 0);

  const activityByType = activity.byType || {};
  const activityEntries = Object.entries(activityByType).sort(([, a], [, b]) => b - a);
  const activityTotal = activityEntries.reduce((sum, [, count]) => sum + count, 0);

  const topExecutives = ranking.slice(0, 5).map((item) => {
    const exec = executives.find((e) => e._id === item.userId);
    return { ...item, fullName: exec?.fullName || 'Usuario desconocido' };
  });

  const getMedalEmoji = (position) => {
    const medals = ['🥇', '🥈', '🥉'];
    return medals[position] || `${position + 1}º`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard de Empresa</h1>
              <p className="text-xs text-slate-400">
                {formatDate(new Date())} • Bienvenido, {session?.user?.fullName || 'Usuario'}
              </p>
            </div>
            {businessUnits.length > 1 && (
              <div className="flex gap-2">
                <label className="text-xs text-slate-400">Unidad de negocio:</label>
                <select
                  value={selectedBUId}
                  onChange={(e) => setSelectedBUId(e.target.value)}
                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                >
                  <option value="">Todas</option>
                  {businessUnits.map((bu) => (
                    <option key={bu._id} value={bu._id}>
                      {bu.code} — {bu.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-md bg-red-500/20 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">En gestión</p>
              <p className="text-2xl font-bold text-sky-400">{openLeads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Ganados</p>
              <p className="text-2xl font-bold text-emerald-400">{wonLeads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Perdidos</p>
              <p className="text-2xl font-bold text-rose-400">{lostLeads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Conversión</p>
              <p className="text-2xl font-bold text-violet-400">{conversionRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Eventos</p>
              <p className="text-2xl font-bold text-slate-300">{totalEvents}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Pipeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pipeline por estado</CardTitle>
            </CardHeader>
            <CardContent>
              {statusTotal === 0 ? (
                <p className="text-xs text-slate-400">Sin datos disponibles</p>
              ) : (
                <div className="space-y-3">
                  {statusEntries.map(([status, count], idx) => {
                    const pct = ((count / statusTotal) * 100).toFixed(1);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 capitalize">{status.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-slate-200">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: STATUS_COLORS[status] || '#64748b',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actividad registrada</CardTitle>
              <div className="mt-2 flex gap-1">
                {['today', 'week', 'month'].map((period) => (
                  <Button
                    key={period}
                    size="sm"
                    variant={activityPeriod === period ? 'default' : 'outline'}
                    onClick={() => setActivityPeriod(period)}
                    className="text-xs"
                  >
                    {period === 'today' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {activityTotal === 0 ? (
                <p className="text-xs text-slate-400">Sin datos disponibles</p>
              ) : (
                <div className="space-y-3">
                  {activityEntries.slice(0, 6).map(([type, count], idx) => {
                    const pct = ((count / activityTotal) * 100).toFixed(1);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 capitalize">{type}</span>
                          <span className="font-semibold text-slate-200">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top ejecutivos esta semana</CardTitle>
          </CardHeader>
          <CardContent>
            {topExecutives.length === 0 ? (
              <p className="text-xs text-slate-400">Sin datos de ranking</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="pb-2 pr-4">Posición</th>
                      <th className="pb-2 pr-4">Ejecutivo</th>
                      <th className="pb-2 pr-4">Score</th>
                      <th className="pb-2">Leads ganados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topExecutives.map((exec, idx) => (
                      <tr key={exec.userId} className="border-b border-slate-800 hover:bg-slate-800/30">
                        <td className="py-3 pr-4">
                          <span className="inline-block text-lg">{getMedalEmoji(idx)}</span>
                        </td>
                        <td className="py-3 pr-4 font-medium">{exec.fullName}</td>
                        <td className="py-3 pr-4">
                          <span className="font-bold text-violet-400">{exec.totalScore || 0}</span>
                        </td>
                        <td className="py-3">
                          <span className="text-emerald-400 font-semibold">
                            {exec.resultScore || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;

