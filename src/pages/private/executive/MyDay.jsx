import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import { getStatusLabel, getActivityLabel } from '../../../lib/leadFormMappers.js';
import useBUSchema from '../../../hooks/useBUSchema.js';

// Fallback color palette — used when a stage/activity key has no color in the schema
const FALLBACK_STATUS_COLORS = {
  NUEVO: '#38bdf8', DATO_ERRADO: '#f87171', CONTACTADO: '#60a5fa',
  CARTERIZADO: '#818cf8', GENERACION_CONTRATO: '#2dd4bf', REVISION_ONBOARDING: '#4ade80', APROBADO_DEFINITIVO: '#10b981',
  INTERESADO: '#a78bfa', COTIZACION_ENVIADA: '#fbbf24', EN_SEGUIMIENTO: '#f97316',
  CERRADO_GANADO: '#10b981', CLIENTE: '#059669', CERRADO_PERDIDO: '#ef4444',
  NO_INTERESADO: '#fb7185',
};

const FALLBACK_ACTIVITY_COLORS = {
  CALL: '#38bdf8', CONTACT_SUCCESS: '#10b981', FOLLOWUP: '#60a5fa',
  WHATSAPP_SENT: '#4ade80', EMAIL_SENT: '#a78bfa', QUOTE_SENT: '#fbbf24',
  RESCHEDULE: '#f97316', NOTE_ADDED: '#94a3b8', VISIT: '#8b5cf6',
  VISIT_ATTENDED: '#06b6d4', CONTACT_SUCCESS2: '#10b981',
};

const MyDay = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [followups, setFollowups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(null);
  const { activityTypes, pipelineStages } = useBUSchema();

  // Build color lookups from BU schema, falling back to hardcoded maps
  const statusColorMap = pipelineStages.length > 0
    ? Object.fromEntries(pipelineStages.map((s) => [s.key, s.color || '#94a3b8']))
    : FALLBACK_STATUS_COLORS;

  const activityColorMap = activityTypes.length > 0
    ? { ...FALLBACK_ACTIVITY_COLORS, ...Object.fromEntries(activityTypes.map((a, i) => {
        const palette = ['#38bdf8','#10b981','#60a5fa','#4ade80','#a78bfa','#fbbf24','#f97316','#94a3b8','#8b5cf6','#06b6d4'];
        return [a.key, palette[i % palette.length]];
      })) }
    : FALLBACK_ACTIVITY_COLORS;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [summaryRes, followupsRes] = await Promise.all([
          LeadsService.getMyDaySummary(),
          LeadsService.getUpcomingFollowups(),
        ]);
        if (summaryRes?.success) setData(summaryRes.data);
        if (followupsRes?.success) setFollowups(followupsRes.data);
      } catch (e) {
        console.error('Error loading my day:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const counts        = data?.counts || {};
  const byStatus      = counts.byStatus || {};
  const wonThisMonth  = counts.wonThisMonth  || 0;
  const lostThisMonth = counts.lostThisMonth || 0;
  const openCount     = counts.openCount     ?? Object.values(byStatus).reduce((s, n) => s + n, 0);
  const invalidCount  = counts.invalidCount  ?? 0;
  const byActivity    = data?.todayActivity?.byType || {};

  const statusEntries = Object.entries(byStatus);
  const totalLeads    = Object.values(byStatus).reduce((s, n) => s + n, 0);
  const maxActivity   = Math.max(...Object.values(byActivity), 1);

  const dismissFollowup = async (e, leadId) => {
    e.stopPropagation();
    setDismissing(leadId);
    try {
      await LeadsService.dismissFollowup(leadId);
      setFollowups((prev) => ({
        today:   (prev?.today   || []).filter((l) => l._id !== leadId),
        overdue: (prev?.overdue || []).filter((l) => l._id !== leadId),
      }));
    } catch (err) {
      console.error('Error dismissing followup:', err);
    } finally {
      setDismissing(null);
    }
  };

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="flex min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Mi Día</h1>
          <p className="text-xs capitalize text-slate-400">{today}</p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando tu día…</p>
        ) : (
          <>
            {/* KPIs */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs uppercase text-slate-400">En gestión</p>
                  <p className="text-2xl font-bold text-sky-400">{openCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs uppercase text-slate-400">Ganados (mes)</p>
                  <p className="text-2xl font-bold text-emerald-400">{wonThisMonth}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs uppercase text-slate-400">Perdidos (mes)</p>
                  <p className="text-2xl font-bold text-rose-400">{lostThisMonth}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs uppercase text-slate-400">No válidos</p>
                  <p className="text-2xl font-bold text-red-400">{invalidCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Próximo Seguimiento - Today */}
            {followups?.today && followups.today.length > 0 && (
              <Card className="mb-6 border-emerald-500/30 bg-emerald-500/5">
                <CardHeader>
                  <CardTitle className="text-emerald-400">📅 Próximo seguimiento para hoy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {followups.today.map((lead) => (
                      <div
                        key={lead._id}
                        onClick={() => navigate(`/leads/${lead._id}`)}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 hover:bg-emerald-500/20 transition"
                      >
                        <div>
                          <p className="text-sm font-medium text-emerald-300">
                            {lead.fields?.['Razón Social'] || lead.fields?.razonSocial || lead.razonSocial || '—'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {lead.contactPhone || lead.fields?.Telefono || lead.fields?.telefono || '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs font-semibold text-emerald-300">{lead.nextActionType || '—'}</p>
                            <p className="text-xs text-slate-500">Hoy</p>
                          </div>
                          <button
                            onClick={(e) => dismissFollowup(e, lead._id)}
                            disabled={dismissing === lead._id}
                            className="ml-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
                          >
                            {dismissing === lead._id ? '…' : 'Listo'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seguimientos Vencidos - Overdue */}
            {followups?.overdue && followups.overdue.length > 0 && (
              <Card className="mb-6 border-orange-500/30 bg-orange-500/5">
                <CardHeader>
                  <CardTitle className="text-orange-400">⚠️ Seguimientos vencidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {followups.overdue.map((lead) => {
                      const daysOverdue = Math.floor((Date.now() - new Date(lead.nextContactDate)) / (1000 * 60 * 60 * 24));
                      return (
                        <div
                          key={lead._id}
                          onClick={() => navigate(`/leads/${lead._id}`)}
                          className="flex cursor-pointer items-center justify-between rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 hover:bg-orange-500/20 transition"
                        >
                          <div>
                            <p className="text-sm font-medium text-orange-300">
                              {lead.fields?.['Razón Social'] || lead.fields?.razonSocial || lead.razonSocial || '—'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {lead.contactPhone || lead.fields?.Telefono || lead.fields?.telefono || '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs font-semibold text-orange-300">{lead.nextActionType || '—'}</p>
                              <p className="text-xs text-orange-400 font-semibold">{daysOverdue}d atrás</p>
                            </div>
                            <button
                              onClick={(e) => dismissFollowup(e, lead._id)}
                              disabled={dismissing === lead._id}
                              className="ml-1 rounded-md bg-orange-600 px-2 py-1 text-xs font-semibold text-white hover:bg-orange-500 disabled:opacity-50 transition"
                            >
                              {dismissing === lead._id ? '…' : 'Listo'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pipeline por estado */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Mis leads por estado</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Per-status cards with percentage */}
                {totalLeads > 0 && (
                  <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {statusEntries.map(([key, count]) => {
                      if (!count) return null;
                      const pct = ((count / totalLeads) * 100).toFixed(1).replace('.0', '');
                      return (
                        <div
                          key={key}
                          className="rounded-md border border-(--border-color) bg-(--input-bg) px-3 py-2"
                          style={{ borderLeft: `3px solid ${statusColorMap[key] || '#94a3b8'}` }}
                        >
                          <p className="truncate text-xs text-(--muted-fg)" title={getStatusLabel(key) || key}>
                            {getStatusLabel(key) || key}
                          </p>
                          <p className="text-base font-semibold text-(--app-fg)">
                            {pct}%{' '}
                            <span className="text-xs font-normal text-(--muted-fg)">({count})</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {statusEntries.map(([key, count]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: statusColorMap[key] || '#94a3b8' }}
                        />
                        <span className="text-xs text-slate-400">{getStatusLabel(key) || key}</span>
                      </div>
                      <span className="text-lg font-semibold tabular-nums text-slate-100">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actividad de hoy */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Actividad de hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(byActivity).map(([key, count]) => {
                    const label = getActivityLabel(key, activityTypes);
                    const color = activityColorMap[key] || '#94a3b8';
                    const pct   = Math.round((count / maxActivity) * 100);
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="w-36 flex-shrink-0 text-xs text-slate-400">{label}</span>
                        <div className="flex-1 overflow-hidden rounded-full bg-slate-700 h-2">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <span
                          className="w-6 text-right text-sm font-semibold tabular-nums"
                          style={{ color }}
                        >
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Acciones rápidas */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigate('/leads/new')}>+ Nuevo Lead</Button>
                  <Button variant="outline" onClick={() => navigate('/leads')}>
                    Ver todos mis leads
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/my-metrics')}>
                    Mis métricas
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/my-ranking')}>
                    Mi ranking
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default MyDay;
