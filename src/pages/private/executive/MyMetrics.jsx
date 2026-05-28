import React, { useEffect, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import MetricsService from '../../../services/Metrics.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import { LEAD_STATUSES, getStatusLabel } from '../../../lib/leadFormMappers.js';
import { getStoredSession } from '../../../lib/session.js';

const STATUS_COLORS = {
  NUEVO: '#38bdf8',
  DATO_ERRADO: '#f87171',
  CONTACTADO: '#60a5fa',
  INTERESADO: '#a78bfa',
  COTIZACION_ENVIADA: '#fbbf24',
  EN_SEGUIMIENTO: '#f97316',
  CERRADO_GANADO: '#10b981',
  CLIENTE: '#059669',
  CERRADO_PERDIDO: '#ef4444',
  NO_INTERESADO: '#fb7185',
};

const ACTIVITY_COLORS = {
  CALL: '#38bdf8',
  CONTACT_SUCCESS: '#10b981',
  FOLLOWUP: '#60a5fa',
  WHATSAPP_SENT: '#4ade80',
  EMAIL_SENT: '#a78bfa',
  QUOTE_SENT: '#fbbf24',
  RESCHEDULE: '#f97316',
  NOTE_ADDED: '#94a3b8',
};

const ACTIVITY_PALETTE = [
  '#38bdf8', '#10b981', '#60a5fa', '#4ade80',
  '#a78bfa', '#fbbf24', '#f97316', '#94a3b8',
  '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16',
];

/* Simple SVG donut ──────────────────────────────────────── */
const Donut = ({ pct, color, size = 80, stroke = 8 }) => {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-700" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
};

const PERIODS = [
  { value: 'today', label: 'Hoy' },
  { value: 'week',  label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

const MyMetrics = () => {
  const [data, setData]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [activityPeriod, setActivityPeriod] = useState('month');
  const [activityData, setActivityData]     = useState(null);
  const [buPipelineStages, setBuPipelineStages] = useState([]);

  useEffect(() => {
    const session = getStoredSession();
    const buId = session?.businessUnitIds?.[0];
    if (!buId) return;
    BusinessUnitsService.getSchema(buId)
      .then((res) => {
        if (res?.success && res.data?.pipelineStages?.length > 0) {
          setBuPipelineStages(res.data.pipelineStages);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await MetricsService.getMe();
        if (res?.success) setData(res.data);
      } catch (e) {
        console.error('Error loading metrics:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await MetricsService.getActivity({ period: activityPeriod });
        if (res?.success) setActivityData(res.data);
      } catch (e) {
        console.error('Error loading activity metrics:', e);
      }
    };
    load();
  }, [activityPeriod]);

  const byStatus       = data?.byStatus || {};
  const activityByType = activityData?.byType || {};
  const totalLeads     = Object.values(byStatus).reduce((s, n) => s + n, 0);
  const maxStatus      = Math.max(...Object.values(byStatus), 1);
  const maxActivity    = Math.max(...Object.values(activityByType), activityData?.closures || 0, 1);
  const convPct        = data?.conversionRatePct ?? 0;
  const closedThisMonth = (data?.wonThisMonth || 0) + (data?.lostThisMonth || 0);

  // Build display stages: BU custom stages or legacy fallback
  const displayStages = buPipelineStages.length > 0
    ? buPipelineStages
    : LEAD_STATUSES.map((s) => ({ key: s.value, label: s.label, color: STATUS_COLORS[s.value] }));

  const getStageColor = (key) => {
    const stage = buPipelineStages.find((s) => s.key === key);
    return stage?.color || STATUS_COLORS[key] || '#94a3b8';
  };

  // Build display activity types: from API response or empty (will render closures only)
  const displayActivityTypes = activityData?.activityTypes
    ? activityData.activityTypes.map((a, i) => ({
        key:   a.key,
        label: a.label,
        count: activityByType[a.key] || 0,
        color: ACTIVITY_COLORS[a.key] || ACTIVITY_PALETTE[i % ACTIVITY_PALETTE.length],
      }))
    : [];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Mis Métricas</h1>
          <p className="text-xs text-slate-400">Tu desempeño personal como ejecutivo.</p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando métricas…</p>
        ) : !data ? (
          <p className="text-sm text-slate-400">No hay datos disponibles.</p>
        ) : (
          <>
            {/* KPIs */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs uppercase text-slate-400">Total leads</p>
                  <p className="text-3xl font-bold text-slate-100">{data.totalLeads || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs uppercase text-slate-400">En gestión</p>
                  <p className="text-3xl font-bold text-sky-400">{data.openLeads || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs uppercase text-slate-400">Ganados</p>
                  <p className="text-3xl font-bold text-emerald-400">{data.wonLeads || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs uppercase text-slate-400">Perdidos</p>
                  <p className="text-3xl font-bold text-rose-400">{data.lostLeads || 0}</p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Conversión + mes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Este mes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative flex-shrink-0">
                      <Donut pct={convPct} color="#10b981" size={80} stroke={8} />
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-emerald-400">
                        {convPct}%
                      </span>
                    </div>
                    <div className="flex-1 space-y-3">
                      {[
                        { label: 'Ganados',    value: data.wonThisMonth  || 0, color: '#10b981' },
                        { label: 'Perdidos',   value: data.lostThisMonth || 0, color: '#f43f5e' },
                        { label: 'Conversión', value: `${convPct}%`,           color: '#a78bfa', noBar: true },
                      ].map((row) => (
                        <div key={row.label}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-slate-400">{row.label}</span>
                            <span className="font-semibold" style={{ color: row.color }}>{row.value}</span>
                          </div>
                          {!row.noBar && (
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${closedThisMonth > 0 ? (row.value / closedThisMonth) * 100 : 0}%`,
                                  backgroundColor: row.color,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Esta semana */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Esta semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <p className="text-2xl font-bold text-emerald-400">{data.wonThisWeek || 0}</p>
                      <p className="text-xs text-slate-400">Leads ganados</p>
                    </div>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-2xl font-bold text-amber-400">{data.eventsThisWeek || 0}</p>
                      <p className="text-xs text-slate-400">Actividades</p>
                    </div>
                  </div>

                  {data.currentRanking && (
                    <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-center">
                      <p className="mb-1 text-xs uppercase text-slate-400">Puntuación mensual</p>
                      <p className="text-2xl font-bold text-blue-300">
                        {data.currentRanking.totalScore || 0} pts
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Distribución por estado */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Distribución por estado</CardTitle>
              </CardHeader>
              <CardContent>
                {totalLeads > 0 && (
                  <div className="mb-4 flex h-2 w-full overflow-hidden rounded-full">
                    {displayStages.map((s) => {
                      const count = byStatus[s.key] || 0;
                      if (!count) return null;
                      const color = s.color || getStageColor(s.key);
                      return (
                        <div
                          key={s.key}
                          title={`${s.label}: ${count}`}
                          style={{
                            width: `${(count / totalLeads) * 100}%`,
                            backgroundColor: color,
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                <div className="space-y-3">
                  {displayStages.map((s) => {
                    const count = byStatus[s.key] || 0;
                    const pct   = (count / maxStatus) * 100;
                    const color = s.color || getStageColor(s.key);
                    return (
                      <div key={s.key} className="flex items-center gap-3">
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="w-36 text-xs text-slate-300">{s.label}</span>
                        <div className="flex-1 overflow-hidden rounded-full bg-slate-700 h-2">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="w-6 text-right text-sm font-semibold tabular-nums text-slate-300">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Actividad registrada */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Actividad registrada</CardTitle>
                  <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
                    {PERIODS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setActivityPeriod(p.value)}
                        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                          activityPeriod === p.value
                            ? 'bg-slate-600 text-slate-100'
                            : 'text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    ...displayActivityTypes,
                    {
                      key:   'closures',
                      label: 'Cierres (ganados)',
                      count: activityData?.closures || 0,
                      color: '#10b981',
                    },
                  ].map((row) => (
                    <div key={row.key} className="flex items-center gap-3">
                      <span className="w-40 flex-shrink-0 text-xs text-slate-400">{row.label}</span>
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
                        className="w-6 text-right text-sm font-semibold tabular-nums"
                        style={{ color: row.color }}
                      >
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default MyMetrics;
