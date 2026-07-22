import React, { useEffect, useState, Component } from 'react';

class MetricsErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#f87171', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          <strong>Error en Métricas (comparte este mensaje para solucionar):</strong>{'\n\n'}
          {this.state.error?.message}{'\n\n'}
          {this.state.error?.stack}
        </div>
      );
    }
    return this.props.children;
  }
}
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';

const InfoTip = ({ text }) => (
  <span className="group relative ml-1.5 inline-block cursor-help align-middle">
    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[10px] leading-none text-slate-400 select-none">?</span>
    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-72 -translate-x-1/2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-xs font-normal leading-relaxed text-slate-300 shadow-2xl group-hover:block whitespace-pre-line">
      {text}
      <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-600" />
    </span>
  </span>
);
import MetricsService from '../../../services/Metrics.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import { LEAD_STATUSES, getStatusLabel } from '../../../lib/leadFormMappers.js';

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

const ACTIVITY_PALETTE = [
  '#38bdf8', '#10b981', '#60a5fa', '#4ade80',
  '#a78bfa', '#fbbf24', '#f97316', '#94a3b8',
  '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16',
];

const PERIODS = [
  { value: 'today', label: 'Hoy' },
  { value: 'week',  label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WORK_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const getDayLabel = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_LABELS[d.getDay()];
};

const heatColor = (value, max) => {
  if (!value || !max) return 'transparent';
  const intensity = Math.round((value / max) * 100);
  if (intensity === 0) return 'transparent';
  if (intensity < 25) return 'rgba(56, 189, 248, 0.2)';
  if (intensity < 50) return 'rgba(56, 189, 248, 0.45)';
  if (intensity < 75) return 'rgba(56, 189, 248, 0.7)';
  return 'rgba(56, 189, 248, 0.95)';
};

const AdminMetrics = () => {
  const [conversion, setConversion]         = useState(null);
  const [summary, setSummary]               = useState(null);
  const [businessUnits, setBusinessUnits]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [activityData, setActivityData]     = useState(null);
  const [activityPeriod, setActivityPeriod] = useState('today');
  const [activityBuId, setActivityBuId]     = useState('');
  const [execReport, setExecReport]         = useState(null);
  const [reportLoading, setReportLoading]   = useState(true);

  useEffect(() => {
    BusinessUnitsService.getAll()
      .then((res) => { if (res?.success) setBusinessUnits(res.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      try {
        const [convRes, summaryRes] = await Promise.all([
          MetricsService.getConversion(),
          MetricsService.getSummary(),
        ]);
        if (convRes?.success) setConversion(convRes.data);
        if (summaryRes?.success) setSummary(summaryRes.data);
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
    if (activityBuId) params.businessUnitId = activityBuId;
    MetricsService.getActivity(params)
      .then((res) => { if (res?.success) setActivityData(res.data); })
      .catch(() => {});
  }, [activityPeriod, activityBuId]);

  useEffect(() => {
    setReportLoading(true);
    MetricsService.getExecutiveReport()
      .then((res) => { if (res?.success) setExecReport(res.data); })
      .catch(() => {})
      .finally(() => setReportLoading(false));
  }, []);

  const total    = conversion?.total || 0;
  const won      = conversion?.won || 0;
  const lost     = conversion?.lost || 0;
  const open     = conversion?.open || 0;
  const byStatus = conversion?.byStatus || summary?.byStatus || {};
  const maxCount = Math.max(...Object.values(byStatus), 1);

  const displayStatuses = Object.keys(byStatus).length > 0
    ? Object.keys(byStatus)
    : LEAD_STATUSES.map((s) => s.value);

  const activityTypes = activityData?.activityTypes || [];
  const activityByType = activityData?.byType || {};
  const maxActivity = Math.max(...activityTypes.map((a) => activityByType[a.key] || 0), activityData?.closures || 0, 1);

  const heatMaxVal = execReport?.executives?.length
    ? Math.max(...execReport.executives.flatMap((e) => WORK_HOURS.map((h) => e.callsByHour[h] || 0)), 1)
    : 1;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Métricas de la Empresa</h1>
          <p className="text-xs text-slate-400">
            Indicadores de conversión y distribución de leads por estado.
          </p>
        </header>

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

            {/* Actividad por tipo */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Actividad registrada</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-50"
                      value={activityBuId}
                      onChange={(e) => setActivityBuId(e.target.value)}
                    >
                      <option value="">Todas las unidades</option>
                      {businessUnits.map((bu) => (
                        <option key={bu._id} value={bu._id}>
                          {bu.code} — {bu.name}
                        </option>
                      ))}
                    </select>
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
                </div>
              </CardHeader>
              <CardContent>
                {activityTypes.length === 0 && !activityData ? (
                  <p className="text-sm text-slate-400">Selecciona una unidad de negocio para ver la actividad.</p>
                ) : (
                  <div className="space-y-3">
                    {[
                      ...activityTypes.map((a, i) => ({
                        key:   a.key,
                        label: a.label,
                        count: activityByType[a.key] || 0,
                        color: ACTIVITY_PALETTE[i % ACTIVITY_PALETTE.length],
                      })),
                      {
                        key:   'closures',
                        label: 'Cierres (ganados)',
                        count: activityData?.closures || 0,
                        color: '#10b981',
                      },
                    ].map((row) => (
                      <div key={row.key} className="flex items-center gap-3">
                        <span className="w-44 shrink-0 text-xs text-slate-400">{row.label}</span>
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

            <Card>
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
                    <p className="text-3xl font-bold text-sky-400">{businessUnits.length}</p>
                    <p className="text-sm text-slate-400">Unidades de negocio</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Productividad por ejecutivo — llamadas últimos 7 días */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>
                  Productividad por ejecutivo — últimos 7 días
                  <InfoTip text={"Actividades registradas por cada ejecutivo en los últimos 7 días (llamadas, seguimientos, emails, WhatsApps, etc.).\n\n% Cierre: de todos sus leads cerrados (ganados + perdidos), qué porcentaje fue ganado. Ejemplo: 3 ganados de 10 cerrados = 30%.\n\nTotal: suma de actividades de los 7 días."} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <p className="text-sm text-slate-400">Cargando…</p>
                ) : !execReport?.executives?.length ? (
                  <p className="text-sm text-slate-400">Sin datos de ejecutivos.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                          <th className="pb-2 pr-4">Ejecutivo</th>
                          <th className="pb-2 pr-4 text-center text-emerald-400">% Cierre</th>
                          {execReport.days.map((d) => (
                            <th key={d} className="pb-2 px-2 text-center">{getDayLabel(d)}</th>
                          ))}
                          <th className="pb-2 pl-4 text-center text-sky-400">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {execReport.executives.map((exec) => {
                          const total = exec.callsByDay.reduce((a, b) => a + b, 0);
                          return (
                            <tr key={exec.userId} className="border-b border-slate-800">
                              <td className="py-2 pr-4 font-medium text-slate-200 whitespace-nowrap">{exec.fullName}</td>
                              <td className="py-2 pr-4 text-center">
                                <span className={`font-bold ${exec.closureRate >= 20 ? 'text-emerald-400' : exec.closureRate >= 10 ? 'text-amber-400' : 'text-slate-400'}`}>
                                  {exec.closureRate}%
                                </span>
                              </td>
                              {exec.callsByDay.map((count, i) => (
                                <td key={i} className="py-2 px-2 text-center tabular-nums text-slate-300">
                                  {count || <span className="text-slate-600">—</span>}
                                </td>
                              ))}
                              <td className="py-2 pl-4 text-center font-bold text-sky-400 tabular-nums">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mapa de calor — actividad por hora */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>
                  Mapa de calor — actividad por hora
                  <InfoTip text="Muestra en qué horarios del día cada ejecutivo registra más actividad. Los colores van de gris (sin actividad) hasta verde intenso (muy alta actividad). Útil para identificar patrones de trabajo." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <p className="text-sm text-slate-400">Cargando…</p>
                ) : !execReport?.executives?.length ? (
                  <p className="text-sm text-slate-400">Sin datos de ejecutivos.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="pb-2 pr-4 text-left">Ejecutivo</th>
                          {WORK_HOURS.map((h) => (
                            <th key={h} className="pb-2 px-1 text-center">{h}h</th>
                          ))}
                          <th className="pb-2 pl-3 text-center text-sky-400">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {execReport.executives.map((exec) => {
                          const total = WORK_HOURS.reduce((s, h) => s + (exec.callsByHour[h] || 0), 0);
                          return (
                            <tr key={exec.userId} className="border-b border-slate-800">
                              <td className="py-1.5 pr-4 font-medium text-slate-200 whitespace-nowrap">{exec.fullName}</td>
                              {WORK_HOURS.map((h) => {
                                const val = exec.callsByHour[h] || 0;
                                return (
                                  <td
                                    key={h}
                                    className="py-1.5 px-1 text-center rounded tabular-nums"
                                    style={{ backgroundColor: heatColor(val, heatMaxVal) }}
                                    title={`${h}:00 — ${val} llamadas`}
                                  >
                                    {val || ''}
                                  </td>
                                );
                              })}
                              <td className="py-1.5 pl-3 text-center font-bold text-sky-400 tabular-nums">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span>Intensidad:</span>
                      {[0.2, 0.45, 0.7, 0.95].map((op, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: `rgba(56,189,248,${op})` }} />
                          {['Bajo', 'Medio', 'Alto', 'Muy alto'][i]}
                        </span>
                      ))}
                    </div>
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

const AdminMetricsWithBoundary = () => (
  <MetricsErrorBoundary>
    <AdminMetrics />
  </MetricsErrorBoundary>
);

export default AdminMetricsWithBoundary;
