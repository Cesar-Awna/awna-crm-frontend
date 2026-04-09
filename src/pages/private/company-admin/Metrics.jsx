import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import MetricsService from '../../../services/Metrics.js';
import FunnelStagesService from '../../../services/FunnelStages.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';

const AdminMetrics = () => {
  const [conversion, setConversion] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [summary, setSummary] = useState(null);
  const [funnelStages, setFunnelStages] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [stagesRes, busRes] = await Promise.all([
          FunnelStagesService.getAll(),
          BusinessUnitsService.getAll(),
        ]);
        if (stagesRes?.success) setFunnelStages(stagesRes.data || []);
        if (busRes?.success) setBusinessUnits(busRes.data || []);
      } catch (e) {
        console.error('Error loading initial data:', e);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      try {
        const [convRes, funnelRes, summaryRes] = await Promise.all([
          MetricsService.getConversion(),
          MetricsService.getFunnel(),
          MetricsService.getSummary(),
        ]);

        if (convRes?.success) setConversion(convRes.data);
        if (funnelRes?.success) setFunnel(funnelRes.data?.byStage || []);
        if (summaryRes?.success) setSummary(summaryRes.data);
      } catch (e) {
        console.error('Error loading metrics:', e);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, []);

  const getStageName = (stageId) => {
    const stage = funnelStages.find((s) => s._id === stageId);
    return stage?.name || 'Sin etapa';
  };

  const getStageOrder = (stageId) => {
    const stage = funnelStages.find((s) => s._id === stageId);
    return stage?.stageOrder || 999;
  };

  const sortedFunnel = useMemo(() => {
    return [...funnel].sort((a, b) => getStageOrder(a._id) - getStageOrder(b._id));
  }, [funnel, funnelStages]);

  const maxFunnelCount = useMemo(() => {
    return Math.max(...funnel.map((f) => f.count), 1);
  }, [funnel]);

  const total = conversion?.total || 0;
  const won = conversion?.won || 0;
  const lost = conversion?.lost || 0;
  const open = conversion?.open || 0;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Métricas de la Empresa</h1>
          <p className="text-xs text-slate-400">
            Indicadores de conversión, pipeline y actividad.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando métricas…</p>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Total Leads</p>
                  <p className="text-2xl font-bold text-slate-100">{total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Abiertos</p>
                  <p className="text-2xl font-bold text-blue-400">{open}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Ganados</p>
                  <p className="text-2xl font-bold text-green-400">{won}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Perdidos</p>
                  <p className="text-2xl font-bold text-red-400">{lost}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Conversión</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {conversion?.conversionRatePct || 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Funnel visualization */}
              <Card>
                <CardHeader>
                  <CardTitle>Funnel de Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                  {sortedFunnel.length === 0 ? (
                    <p className="text-sm text-slate-400">No hay leads en el pipeline.</p>
                  ) : (
                    <div className="space-y-3">
                      {sortedFunnel.map((item) => {
                        const pct = Math.round((item.count / maxFunnelCount) * 100);
                        return (
                          <div key={item._id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-300">{getStageName(item._id)}</span>
                              <span className="text-slate-400">{item.count} leads</span>
                            </div>
                            <div className="h-6 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Distribution by status */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  {total === 0 ? (
                    <p className="text-sm text-slate-400">No hay datos disponibles.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Visual distribution bars */}
                      <div className="flex h-8 rounded-lg overflow-hidden">
                        {open > 0 && (
                          <div
                            className="bg-blue-500 flex items-center justify-center text-xs font-medium"
                            style={{ width: `${(open / total) * 100}%` }}
                          >
                            {open > 0 && Math.round((open / total) * 100) >= 10 && 'Abiertos'}
                          </div>
                        )}
                        {won > 0 && (
                          <div
                            className="bg-green-500 flex items-center justify-center text-xs font-medium"
                            style={{ width: `${(won / total) * 100}%` }}
                          >
                            {won > 0 && Math.round((won / total) * 100) >= 10 && 'Ganados'}
                          </div>
                        )}
                        {lost > 0 && (
                          <div
                            className="bg-red-500 flex items-center justify-center text-xs font-medium"
                            style={{ width: `${(lost / total) * 100}%` }}
                          >
                            {lost > 0 && Math.round((lost / total) * 100) >= 10 && 'Perdidos'}
                          </div>
                        )}
                      </div>

                      {/* Legend */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-blue-500" />
                            <span className="text-sm text-slate-300">Abiertos</span>
                          </div>
                          <p className="text-lg font-bold text-blue-400">
                            {open} ({total > 0 ? Math.round((open / total) * 100) : 0}%)
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-green-500" />
                            <span className="text-sm text-slate-300">Ganados</span>
                          </div>
                          <p className="text-lg font-bold text-green-400">
                            {won} ({total > 0 ? Math.round((won / total) * 100) : 0}%)
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                            <span className="text-sm text-slate-300">Perdidos</span>
                          </div>
                          <p className="text-lg font-bold text-red-400">
                            {lost} ({total > 0 ? Math.round((lost / total) * 100) : 0}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Activity summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Resumen de Actividad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-400">
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
                    <p className="text-3xl font-bold text-blue-400">{businessUnits.length}</p>
                    <p className="text-sm text-slate-400">Unidades de negocio</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-400">{funnelStages.length}</p>
                    <p className="text-sm text-slate-400">Etapas del funnel</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversion insights */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Insights de Conversión</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <p className="text-sm text-slate-400 mb-1">Leads cerrados</p>
                    <p className="text-xl font-bold text-slate-100">{won + lost}</p>
                    <p className="text-xs text-slate-500">Ganados + Perdidos</p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <p className="text-sm text-slate-400 mb-1">Win Rate</p>
                    <p className="text-xl font-bold text-green-400">
                      {won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0}%
                    </p>
                    <p className="text-xs text-slate-500">De leads cerrados</p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <p className="text-sm text-slate-400 mb-1">Pipeline activo</p>
                    <p className="text-xl font-bold text-blue-400">{open}</p>
                    <p className="text-xs text-slate-500">Leads en proceso</p>
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

export default AdminMetrics;
