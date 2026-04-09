import React, { useEffect, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import RankingService from '../../../services/Ranking.js';

const MyRanking = () => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [weeklyRanking, setWeeklyRanking] = useState([]);
  const [monthlyRanking, setMonthlyRanking] = useState([]);
  const [period, setPeriod] = useState('weekly');
  const [loading, setLoading] = useState(true);

  const userId = JSON.parse(localStorage.getItem('user') || '{}')?.id;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [weeklyRes, monthlyRes, weeklyAll, monthlyAll] = await Promise.all([
          RankingService.getMe({ periodType: 'WEEK' }),
          RankingService.getMe({ periodType: 'MONTH' }),
          RankingService.getWeekly(),
          RankingService.getMonthly(),
        ]);

        if (weeklyRes?.success) setWeeklyData(weeklyRes.data || []);
        if (monthlyRes?.success) setMonthlyData(monthlyRes.data || []);
        if (weeklyAll?.success) setWeeklyRanking(weeklyAll.data || []);
        if (monthlyAll?.success) setMonthlyRanking(monthlyAll.data || []);
      } catch (e) {
        console.error('Error loading ranking:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getCurrentPeriodData = () => {
    if (period === 'weekly') {
      return weeklyData[0];
    }
    return monthlyData[0];
  };

  const getMyPosition = () => {
    const ranking = period === 'weekly' ? weeklyRanking : monthlyRanking;
    if (!ranking.length || !userId) return null;

    const currentPeriod = ranking.reduce((latest, item) => {
      if (!latest || new Date(item.periodStart) > new Date(latest.periodStart)) {
        return item;
      }
      return latest;
    }, null);

    if (!currentPeriod) return null;

    const currentPeriodItems = ranking.filter(
      (r) => r.periodStart === currentPeriod.periodStart
    );
    const sorted = [...currentPeriodItems].sort((a, b) => b.totalScore - a.totalScore);
    const myIndex = sorted.findIndex((r) => r.userId === userId);
    return myIndex >= 0 ? myIndex + 1 : null;
  };

  const getTotalParticipants = () => {
    const ranking = period === 'weekly' ? weeklyRanking : monthlyRanking;
    if (!ranking.length) return 0;

    const currentPeriod = ranking.reduce((latest, item) => {
      if (!latest || new Date(item.periodStart) > new Date(latest.periodStart)) {
        return item;
      }
      return latest;
    }, null);

    if (!currentPeriod) return 0;

    return ranking.filter((r) => r.periodStart === currentPeriod.periodStart).length;
  };

  const formatPeriod = (start, end) => {
    if (!start) return '—';
    const s = new Date(start);
    const e = end ? new Date(end) : null;
    const sStr = s.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    const eStr = e ? e.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '';
    return e ? `${sStr} - ${eStr}` : sStr;
  };

  const currentData = getCurrentPeriodData();
  const myPosition = getMyPosition();
  const totalParticipants = getTotalParticipants();

  const getMedal = (position) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '';
  };

  const getHistoryData = () => {
    return period === 'weekly' ? weeklyData : monthlyData;
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Mi Ranking</h1>
          <p className="text-xs text-slate-400">Tu desempeño y posición en el equipo.</p>
        </header>

        {/* Period Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'weekly'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Semanal
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Mensual
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando ranking…</p>
        ) : (
          <>
            {/* Current Position */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="md:col-span-1">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs text-slate-400 uppercase mb-2">Tu posición</p>
                  <div className="text-5xl font-bold text-blue-400">
                    {myPosition ? (
                      <>
                        {getMedal(myPosition)} #{myPosition}
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    de {totalParticipants} ejecutivos
                  </p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Puntuación actual
                    {currentData && (
                      <span className="text-sm font-normal text-slate-400 ml-2">
                        ({formatPeriod(currentData.periodStart, currentData.periodEnd)})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentData ? (
                    <div className="space-y-4">
                      <div className="text-center mb-4">
                        <p className="text-4xl font-bold text-green-400">
                          {currentData.totalScore || 0}
                        </p>
                        <p className="text-xs text-slate-400 uppercase">Puntos totales</p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xl font-semibold text-amber-400">
                            {currentData.activityScore || 0}
                          </p>
                          <p className="text-xs text-slate-400">Actividad</p>
                        </div>
                        <div>
                          <p className="text-xl font-semibold text-purple-400">
                            {currentData.progressScore || 0}
                          </p>
                          <p className="text-xs text-slate-400">Progreso</p>
                        </div>
                        <div>
                          <p className="text-xl font-semibold text-blue-400">
                            {currentData.resultScore || 0}
                          </p>
                          <p className="text-xs text-slate-400">Resultados</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No hay datos de puntuación para este período.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Score Breakdown Legend */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">¿Cómo se calcula tu puntuación?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <p className="font-semibold text-amber-400 mb-1">Actividad</p>
                    <p className="text-xs text-slate-400">
                      Llamadas, correos, reuniones realizadas y registradas.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <p className="font-semibold text-purple-400 mb-1">Progreso</p>
                    <p className="text-xs text-slate-400">
                      Leads avanzados entre etapas del embudo.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="font-semibold text-blue-400 mb-1">Resultados</p>
                    <p className="text-xs text-slate-400">
                      Leads ganados y montos cerrados.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Historial {period === 'weekly' ? 'semanal' : 'mensual'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getHistoryData().length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">
                    No hay historial disponible.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-left text-slate-400">
                          <th className="pb-2 pr-4">Período</th>
                          <th className="pb-2 pr-4 text-center">Actividad</th>
                          <th className="pb-2 pr-4 text-center">Progreso</th>
                          <th className="pb-2 pr-4 text-center">Resultados</th>
                          <th className="pb-2 text-center">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getHistoryData().map((item) => (
                          <tr key={item._id} className="border-b border-slate-800">
                            <td className="py-2 pr-4">
                              {formatPeriod(item.periodStart, item.periodEnd)}
                            </td>
                            <td className="py-2 pr-4 text-center text-amber-400">
                              {item.activityScore || 0}
                            </td>
                            <td className="py-2 pr-4 text-center text-purple-400">
                              {item.progressScore || 0}
                            </td>
                            <td className="py-2 pr-4 text-center text-blue-400">
                              {item.resultScore || 0}
                            </td>
                            <td className="py-2 text-center font-bold text-green-400">
                              {item.totalScore || 0}
                            </td>
                          </tr>
                        ))}
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

export default MyRanking;
