import React, { useEffect, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import MetricsService from '../../../services/Metrics.js';
import UsersService from '../../../services/Users.js';
import LeadsService from '../../../services/Leads.js';
import { LEAD_STATUSES, getStatusLabel } from '../../../lib/leadFormMappers.js';

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

const ACTIVITY_PALETTE = [
  '#38bdf8', '#10b981', '#60a5fa', '#4ade80',
  '#a78bfa', '#fbbf24', '#f97316', '#94a3b8',
  '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16',
];

const PERIODS = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

const SupervisorMetrics = () => {
  const [conversion, setConversion] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState(null);
  const [activityPeriod, setActivityPeriod] = useState('today');
  const [executives, setExecutives] = useState([]);
  const [metricsData, setMetricsData] = useState({});
  const [counters, setCounters] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      try {
        const [convRes, summaryRes, countersRes] = await Promise.all([
          MetricsService.getConversion(),
          MetricsService.getSummary(),
          MetricsService.getActivityCounters(),
        ]);
        if (convRes?.success) setConversion(convRes.data);
        if (summaryRes?.success) setSummary(summaryRes.data);
        if (countersRes?.success) setCounters(countersRes.data);
      } catch (e) {
        console.error('Error loading metrics:', e);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, []);

  useEffect(() => {
    const params = { period: activityPeriod };
    MetricsService.getActivity(params)
      .then((res) => { if (res?.success) setActivityData(res.data); })
      .catch(() => { });
  }, [activityPeriod]);

  useEffect(() => {
    const loadExecutives = async () => {
      try {
        const usersRes = await UsersService.getExecutives({ limit: 1000 });
        if (usersRes?.success && Array.isArray(usersRes.data)) {
          setExecutives(usersRes.data);
          const metrics = {};
          for (const exec of usersRes.data) {
            try {
              const res = await LeadsService.getStats({ ownerUserId: exec._id });
              if (res?.success && res.data) {
                metrics[exec._id] = res.data;
              }
            } catch (e) {
              console.error(`Error loading metrics for ${exec._id}:`, e);
            }
          }
          setMetricsData(metrics);
        }
      } catch (e) {
        console.error('Error loading executives:', e);
      }
    };
    loadExecutives();
  }, []);

  const total = conversion?.total || 0;
  const won = conversion?.won || 0;
  const lost = conversion?.lost || 0;
  const open = conversion?.open || 0;
  const byStatus = conversion?.byStatus || summary?.byStatus || {};
  const maxCount = Math.max(...Object.values(byStatus), 1);

  const displayStatuses = Object.keys(byStatus).length > 0
    ? Object.keys(byStatus)
    : LEAD_STATUSES.map((s) => s.value);

  const activityTypes = activityData?.activityTypes || [];
  const activityByType = activityData?.byType || {};
  const maxActivity = Math.max(...activityTypes.map((a) => activityByType[a.key] || 0), activityData?.closures || 0, 1);

  const getMetric = (execId, key, fallback = 0) => metricsData[execId]?.[key] ?? fallback;

  const handleRefreshMetrics = async () => {
    try {
      const usersRes = await UsersService.getExecutives();
      if (usersRes?.success && Array.isArray(usersRes.data)) {
        const metrics = {};
        for (const exec of usersRes.data) {
          try {
            const res = await LeadsService.getStats({ ownerUserId: exec._id });
            if (res?.success && res.data) {
              metrics[exec._id] = res.data;
            }
          } catch (e) {
            console.error(`Error loading metrics for ${exec._id}:`, e);
          }
        }
        setMetricsData(metrics);
      }
    } catch (e) {
      console.error('Error refreshing metrics:', e);
    }
  };

  const handleDeleteExecutive = async (userId) => {
    if (!window.confirm('¿Confirmas eliminar este ejecutivo?')) return;
    setError(null);
    try {
      const res = await UsersService.delete(userId);
      if (res?.success) {
        setSuccess('Ejecutivo eliminado correctamente.');
        setTimeout(() => setSuccess(null), 4000);
        const usersRes = await UsersService.getExecutives({ limit: 1000 });
        if (usersRes?.success && Array.isArray(usersRes.data)) {
          setExecutives(usersRes.data);
          await handleRefreshMetrics();
        }
      } else {
        setError(res?.message || 'Error al eliminar ejecutivo');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Error al eliminar ejecutivo');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Métricas del Equipo</h1>
          <p className="text-xs text-slate-400">
            Indicadores de conversión y desempeño de tu equipo.
          </p>
        </header>
        {error && (
          <div className="mb-4 rounded-md bg-rose-500/15 px-4 py-3 text-sm text-rose-200 border border-rose-500/30">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 border border-emerald-500/30">
            {success}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Cargando métricas…</p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Total leads</p>
                  <p className="text-2xl font-bold text-slate-100">{total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">En gestión</p>
                  <p className="text-2xl font-bold text-sky-400">{open}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Ganados</p>
                  <p className="text-2xl font-bold text-emerald-400">{won}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Perdidos</p>
                  <p className="text-2xl font-bold text-rose-400">{lost}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Conversión</p>
                  <p className="text-2xl font-bold text-violet-400">
                    {conversion?.conversionRatePct || 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Contadores de Actividad */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Contadores de Actividad del Equipo</CardTitle>
              </CardHeader>
              <CardContent>
                {counters ? (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                      <p className="text-xs uppercase text-slate-400 mb-1">Llamadas realizadas</p>
                      <p className="text-3xl font-bold text-sky-400">{counters.callCount}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                      <p className="text-xs uppercase text-slate-400 mb-1">Contactos efectivos</p>
                      <p className="text-3xl font-bold text-emerald-400">{counters.contactSuccessCount}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                      <p className="text-xs uppercase text-slate-400 mb-1">Seguimientos</p>
                      <p className="text-3xl font-bold text-violet-400">{counters.followupCount}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                      <p className="text-xs uppercase text-slate-400 mb-1">WhatsApp enviados</p>
                      <p className="text-3xl font-bold text-green-400">{counters.whatsappSentCount}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                      <p className="text-xs uppercase text-slate-400 mb-1">Correos enviados</p>
                      <p className="text-3xl font-bold text-blue-400">{counters.emailSentCount}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                      <p className="text-xs uppercase text-slate-400 mb-1">Cotizaciones enviadas</p>
                      <p className="text-3xl font-bold text-yellow-400">{counters.quoteSentCount}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                      <p className="text-xs uppercase text-slate-400 mb-1">Reagendamientos</p>
                      <p className="text-3xl font-bold text-orange-400">{counters.rescheduleCount}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                      <p className="text-xs uppercase text-slate-400 mb-1">Cierres (ventas)</p>
                      <p className="text-3xl font-bold text-rose-400">{counters.closureCount}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Cargando contadores...</p>
                )}
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Distribución por estado</CardTitle>
              </CardHeader>
              <CardContent>
                {total === 0 ? (
                  <p className="text-sm text-slate-400">No hay datos disponibles.</p>
                ) : (
                  <div className="space-y-3">
                    {displayStatuses.map((statusKey) => {
                      const count = byStatus[statusKey] || 0;
                      const pct = Math.round((count / maxCount) * 100);
                      const label = getStatusLabel(statusKey) || statusKey;
                      const color = STATUS_COLORS[statusKey] || '#94a3b8';
                      return (
                        <div key={statusKey}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-slate-300">{label}</span>
                            <span className="text-slate-400">{count} leads</span>
                          </div>
                          <div className="h-6 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: color,
                                opacity: 0.85,
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

            <Card className="mb-6">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Actividad registrada</CardTitle>
                  <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
                    {PERIODS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setActivityPeriod(p.value)}
                        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${activityPeriod === p.value
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-(--muted-fg) hover:text-(--app-fg)'
                          }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activityTypes.length === 0 && !activityData ? (
                  <p className="text-sm text-slate-400">Selecciona una unidad de negocio para ver la actividad.</p>
                ) : (
                  <div className="space-y-3">
                    {[
                      ...activityTypes.map((a, i) => ({
                        key: a.key,
                        label: a.label,
                        count: activityByType[a.key] || 0,
                        color: ACTIVITY_PALETTE[i % ACTIVITY_PALETTE.length],
                      })),
                      {
                        key: 'closures',
                        label: 'Cierres (ganados)',
                        count: activityData?.closures || 0,
                        color: '#10b981',
                      },
                    ].map((row) => (
                      <div key={row.key} className="flex items-center gap-3">
                        <span className="w-44 flex-shrink-0 text-xs text-slate-400">{row.label}</span>
                        <div className="flex-1 overflow-hidden rounded-full bg-slate-700 h-2">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.round((row.count / maxActivity) * 100)}%`,
                              backgroundColor: row.color,
                            }}
                          />
                        </div>
                        <span
                          className="w-8 text-right text-sm font-semibold tabular-nums"
                          style={{ color: row.color }}
                        >
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-violet-400">
                      {summary?.totalEvents || 0}
                    </p>
                    <p className="text-sm text-slate-400">Eventos registrados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-400">
                      {conversion?.conversionRatePct || 0}%
                    </p>
                    <p className="text-sm text-slate-400">Tasa de conversión</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-sky-400">{executives.length}</p>
                    <p className="text-sm text-slate-400">Ejecutivos en tu equipo</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Desempeño por ejecutivo</CardTitle>
                <button
                  onClick={handleRefreshMetrics}
                  className="text-xs px-3 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  🔄 Refrescar
                </button>
              </CardHeader>
              <CardContent>
                {executives.length === 0 ? (
                  <p className="text-sm text-slate-400">No hay ejecutivos asignados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-left text-slate-400">
                          <th className="pb-3 pr-4">Ejecutivo</th>
                          <th className="pb-3 pr-4 text-center">Total leads</th>
                          <th className="pb-3 pr-4 text-center">En gestión</th>
                          <th className="pb-3 pr-4 text-center">Ganados</th>
                          <th className="pb-3 pr-4 text-center">Perdidos</th>
                          <th className="pb-3 pr-4 text-center">No válidos</th>
                          <th className="pb-3 pr-4 text-center">Conversión</th>
                          <th className="pb-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executives.map((exec) => {
                          const totalCount = getMetric(exec._id, 'total', 0);
                          const openCount = getMetric(exec._id, 'openCount', 0);
                          const wonCount = getMetric(exec._id, 'wonCount', 0);
                          const lostCount = getMetric(exec._id, 'lostCount', 0);
                          const invalidCount = getMetric(exec._id, 'invalidCount', 0);
                          const conversionRate = wonCount + lostCount > 0 ? ((wonCount / (wonCount + lostCount)) * 100).toFixed(1) : 0;

                          return (
                            <tr
                              key={exec._id}
                              className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="py-3 pr-4 font-medium">
                                {exec.fullName}
                                <p className="text-xs text-slate-500 mt-0.5">{exec.email}</p>
                              </td>
                              <td className="py-3 pr-4 text-center">
                                <span className="inline-block rounded bg-slate-700/40 px-2 py-1 text-slate-200 font-semibold">
                                  {totalCount}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-center">
                                <span className="inline-block rounded bg-sky-500/20 px-2 py-1 text-sky-300 font-semibold">
                                  {openCount}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-center">
                                <span className="inline-block rounded bg-emerald-500/20 px-2 py-1 text-emerald-300 font-semibold">
                                  {wonCount}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-center">
                                <span className="inline-block rounded bg-rose-500/20 px-2 py-1 text-rose-300 font-semibold">
                                  {lostCount}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-center">
                                <span className="inline-block rounded bg-red-500/20 px-2 py-1 text-red-300 font-semibold">
                                  {invalidCount}
                                </span>
                              </td>
                              <td className="py-3 text-center">
                                <span className="inline-block rounded bg-violet-500/20 px-2 py-1 text-violet-300 font-semibold">
                                  {conversionRate}%
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-rose-400 border-rose-400 hover:bg-rose-500/10"
                                  onClick={() => handleDeleteExecutive(exec._id)}
                                >
                                  Eliminar
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default SupervisorMetrics;
