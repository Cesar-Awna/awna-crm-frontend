import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import FunnelStagesService from '../../../services/FunnelStages.js';

const MyDay = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [summaryRes, stagesRes] = await Promise.all([
          LeadsService.getMyDaySummary(),
          FunnelStagesService.getAll(),
        ]);

        if (summaryRes?.success) {
          setData(summaryRes.data);
        }
        if (stagesRes?.success) {
          setStages(stagesRes.data || []);
        }
      } catch (e) {
        console.error('Error loading my day:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getStageName = (stageId) => {
    const stage = stages.find((s) => s._id === stageId);
    return stage?.name || '—';
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return 'Hoy ' + formatTime(dateStr);
    }
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  };

  const counts = data?.counts || {};
  const leadsDueToday = data?.leadsDueToday || [];
  const leadsOverdue = data?.leadsOverdue || [];
  const meetingsToday = data?.meetingsToday || [];

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Mi Día</h1>
          <p className="text-xs text-slate-400 capitalize">{today}</p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando tu día…</p>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase">Para hoy</p>
                  <p className="text-2xl font-bold text-blue-400">{counts.dueToday || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase">Vencidos</p>
                  <p className="text-2xl font-bold text-red-400">{counts.overdue || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase">Sin acción</p>
                  <p className="text-2xl font-bold text-amber-400">{counts.noNextAction || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase">Abiertos</p>
                  <p className="text-2xl font-bold text-slate-100">{counts.openLeads || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase">Ganados (mes)</p>
                  <p className="text-2xl font-bold text-green-400">{counts.wonThisMonth || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase">Perdidos (mes)</p>
                  <p className="text-2xl font-bold text-red-400">{counts.lostThisMonth || 0}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Meetings Today */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>📅</span> Reuniones de hoy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {meetingsToday.length === 0 ? (
                    <p className="text-sm text-slate-400">No tienes reuniones programadas para hoy.</p>
                  ) : (
                    <div className="space-y-3">
                      {meetingsToday.map((meeting) => (
                        <div
                          key={meeting._id}
                          className="flex items-center justify-between rounded-lg bg-blue-500/10 border border-blue-500/30 p-3"
                        >
                          <div>
                            <p className="font-medium text-blue-300">
                              {formatTime(meeting.eventAt)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {meeting.metadata?.location || 'Sin ubicación'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate('/leads')}
                          >
                            Ver lead
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Leads Due Today */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>🎯</span> Leads para hoy
                    <span className="text-sm font-normal text-slate-400">
                      ({leadsDueToday.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leadsDueToday.length === 0 ? (
                    <p className="text-sm text-slate-400">No tienes leads programados para hoy.</p>
                  ) : (
                    <div className="space-y-2">
                      {leadsDueToday.map((lead) => (
                        <div
                          key={lead._id}
                          className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{getStageName(lead.currentStageId)}</p>
                            <p className="text-xs text-slate-400">
                              {lead.nextActionType || 'Acción'} • {formatTime(lead.nextActionAt)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate('/leads')}
                          >
                            Trabajar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Overdue Leads */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>⚠️</span> Leads vencidos
                    <span className="text-sm font-normal text-red-400">
                      ({leadsOverdue.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leadsOverdue.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-lg text-slate-300">✅ Sin leads vencidos</p>
                      <p className="text-sm text-slate-500">Excelente trabajo manteniéndote al día.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700 text-left text-slate-400">
                            <th className="pb-2 pr-4">Etapa</th>
                            <th className="pb-2 pr-4">Tipo acción</th>
                            <th className="pb-2 pr-4">Vencido desde</th>
                            <th className="pb-2 pr-4">Monto est.</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {leadsOverdue.map((lead) => (
                            <tr key={lead._id} className="border-b border-slate-800">
                              <td className="py-2 pr-4">{getStageName(lead.currentStageId)}</td>
                              <td className="py-2 pr-4 text-xs">
                                <span className="rounded bg-slate-700 px-2 py-0.5">
                                  {lead.nextActionType || '—'}
                                </span>
                              </td>
                              <td className="py-2 pr-4 text-xs text-red-400">
                                {formatDate(lead.nextActionAt)}
                              </td>
                              <td className="py-2 pr-4 text-right font-mono text-xs">
                                {lead.estimatedAmount
                                  ? `$${lead.estimatedAmount.toLocaleString('es-CL')}`
                                  : '—'}
                              </td>
                              <td className="py-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate('/leads')}
                                >
                                  Atender
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigate('/leads/new')}>
                    + Nuevo Lead
                  </Button>
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
