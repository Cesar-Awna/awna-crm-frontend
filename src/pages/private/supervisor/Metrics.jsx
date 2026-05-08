import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import UsersService from '../../../services/Users.js';
import LeadsService from '../../../services/Leads.js';

const Metrics = () => {
  const [executives, setExecutives] = useState([]);
  const [metricsData, setMetricsData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const usersRes = await UsersService.getExecutives();
        if (usersRes?.success && Array.isArray(usersRes.data)) {
          setExecutives(usersRes.data);

          // Cargar métricas para cada ejecutivo
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
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getMetric = (execId, key, fallback = 0) => metricsData[execId]?.[key] ?? fallback;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Métricas por Ejecutivo</h1>
          <p className="text-xs text-slate-400">Desempeño y conversión de tu equipo.</p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando métricas…</p>
        ) : executives.length === 0 ? (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-400">No hay ejecutivos asignados.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tabla de métricas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="pb-3 pr-4">Ejecutivo</th>
                      <th className="pb-3 pr-4 text-center">En gestión</th>
                      <th className="pb-3 pr-4 text-center">Ganados</th>
                      <th className="pb-3 pr-4 text-center">Perdidos</th>
                      <th className="pb-3 pr-4 text-center">No válidos</th>
                      <th className="pb-3 text-center">Conversión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executives.map((exec) => {
                      const openCount = getMetric(exec._id, 'openCount', 0);
                      const wonCount = getMetric(exec._id, 'wonCount', 0);
                      const lostCount = getMetric(exec._id, 'lostCount', 0);
                      const invalidCount = getMetric(exec._id, 'invalidCount', 0);
                      const total = openCount + wonCount + lostCount + invalidCount;
                      const conversionRate = total > 0 ? ((wonCount / (wonCount + lostCount)) * 100).toFixed(1) : 0;

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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Metrics;
