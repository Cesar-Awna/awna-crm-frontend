import React, { useEffect, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import MetricsService from '../../../services/Metrics.js';
import FunnelStagesService from '../../../services/FunnelStages.js';

const MyMetrics = () => {
  const [data, setData] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [metricsRes, stagesRes] = await Promise.all([
          MetricsService.getMe(),
          FunnelStagesService.getAll(),
        ]);

        if (metricsRes?.success) {
          setData(metricsRes.data);
        }
        if (stagesRes?.success) {
          setStages(stagesRes.data || []);
        }
      } catch (e) {
        console.error('Error loading metrics:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getStageName = (stageId) => {
    const stage = stages.find((s) => s._id === stageId);
    return stage?.name || 'Etapa';
  };

  const getStageColor = (stageId) => {
    const stage = stages.find((s) => s._id === stageId);
    return stage?.color || '#64748b';
  };

  const formatAmount = (amount) => {
    if (!amount) return '$0';
    return '$' + amount.toLocaleString('es-CL');
  };

  const getByStageCount = (stageId) => {
    if (!data?.byStage) return 0;
    const found = data.byStage.find((s) => s._id === stageId);
    return found?.count || 0;
  };

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
            {/* Main KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-slate-400 uppercase">Total leads</p>
                  <p className="text-3xl font-bold text-slate-100">{data.totalLeads || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-slate-400 uppercase">Abiertos</p>
                  <p className="text-3xl font-bold text-blue-400">{data.openLeads || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-slate-400 uppercase">Ganados</p>
                  <p className="text-3xl font-bold text-green-400">{data.wonLeads || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-slate-400 uppercase">Perdidos</p>
                  <p className="text-3xl font-bold text-red-400">{data.lostLeads || 0}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* This Month */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Este mes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <p className="text-2xl font-bold text-green-400">{data.wonThisMonth || 0}</p>
                      <p className="text-xs text-slate-400">Ganados</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-2xl font-bold text-red-400">{data.lostThisMonth || 0}</p>
                      <p className="text-xs text-slate-400">Perdidos</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                      <p className="text-2xl font-bold text-purple-400">{data.conversionRatePct || 0}%</p>
                      <p className="text-xs text-slate-400">Conversión</p>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-xs text-slate-400 uppercase mb-1">Monto cerrado este mes</p>
                    <p className="text-2xl font-bold text-green-300">{formatAmount(data.totalAmountThisMonth)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* This Week */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Esta semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center mb-4">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <p className="text-2xl font-bold text-green-400">{data.wonThisWeek || 0}</p>
                      <p className="text-xs text-slate-400">Leads ganados</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <p className="text-2xl font-bold text-amber-400">{data.eventsThisWeek || 0}</p>
                      <p className="text-xs text-slate-400">Actividades</p>
                    </div>
                  </div>

                  {data.currentRanking && (
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                      <p className="text-xs text-slate-400 uppercase mb-1">Mi puntuación mensual</p>
                      <p className="text-2xl font-bold text-blue-300">{data.currentRanking.totalScore || 0} pts</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Acciones pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                      <p className="text-3xl font-bold text-blue-400">{data.dueToday || 0}</p>
                      <p className="text-xs text-slate-400">Para hoy</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                      <p className="text-3xl font-bold text-red-400">{data.overdue || 0}</p>
                      <p className="text-xs text-slate-400">Vencidos</p>
                    </div>
                  </div>

                  {(data.dueToday > 0 || data.overdue > 0) && (
                    <p className="text-xs text-slate-500 mt-3 text-center">
                      Revisa tu día en "Mi Día" para ver el detalle.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Funnel Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribución por etapa</CardTitle>
                </CardHeader>
                <CardContent>
                  {stages.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Sin etapas configuradas.</p>
                  ) : (
                    <div className="space-y-3">
                      {stages.map((stage) => {
                        const count = getByStageCount(stage._id);
                        const maxCount = Math.max(
                          ...stages.map((s) => getByStageCount(s._id)),
                          1
                        );
                        const widthPct = (count / maxCount) * 100;
                        return (
                          <div key={stage._id}>
                            <div className="flex justify-between text-xs mb-1">
                              <span style={{ color: stage.color }}>{stage.name}</span>
                              <span className="text-slate-400">{count}</span>
                            </div>
                            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${widthPct}%`,
                                  backgroundColor: stage.color || '#64748b',
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

            {/* Performance Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Resumen de desempeño</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 rounded-lg bg-slate-800/50">
                    <p className="text-slate-400 mb-1">Tasa de conversión</p>
                    <p className="text-xl font-bold">
                      {data.conversionRatePct || 0}%
                    </p>
                    <p className="text-xs text-slate-500">
                      De leads cerrados, {data.conversionRatePct || 0}% fueron ganados.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50">
                    <p className="text-slate-400 mb-1">Ticket promedio</p>
                    <p className="text-xl font-bold">
                      {data.wonThisMonth > 0
                        ? formatAmount(Math.round(data.totalAmountThisMonth / data.wonThisMonth))
                        : '$0'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Monto promedio por lead ganado este mes.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50">
                    <p className="text-slate-400 mb-1">Pipeline activo</p>
                    <p className="text-xl font-bold">{data.openLeads || 0} leads</p>
                    <p className="text-xs text-slate-500">
                      Oportunidades en tu embudo actualmente.
                    </p>
                  </div>
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
