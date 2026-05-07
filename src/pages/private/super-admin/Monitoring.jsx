import React, { useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import Admin from '../../../services/Admin.js';
import Companies from '../../../services/Companies.js';

const Monitoring = () => {
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsRes, companiesRes] = await Promise.all([
          Admin.getStats(),
          Companies.getAll({ limit: 100 }),
        ]);
        if (statsRes?.success) setStats(statsRes.data);
        if (companiesRes?.success) setCompanies(companiesRes.data || []);
      } catch (e) {
        console.error('Error loading monitoring data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-50">
        <Sidebar />
        <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
          <p className="text-sm text-slate-400">Cargando datos de monitoreo...</p>
        </main>
      </div>
    );
  }

  const totalCompanies = stats?.totalCompanies || 0;
  const activeCompanies = stats?.activeCompanies || 0;
  const suspendedCompanies = stats?.suspendedCompanies || 0;
  const totalUsers = stats?.totalUsers || 0;
  const appVersion = stats?.appVersion || '—';
  const appStatus = stats?.appStatus || 'unknown';
  const uptime = stats?.uptime || 0;
  const nodeVersion = stats?.nodeVersion || '—';

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Monitoreo del sistema</h1>
          <p className="text-xs text-slate-400">Estado de la plataforma y empresas registradas (SUPER_ADMIN).</p>
        </header>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Total empresas</p>
              <p className="text-2xl font-bold text-sky-400">{totalCompanies}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Activas</p>
              <p className="text-2xl font-bold text-emerald-400">{activeCompanies}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Suspendidas</p>
              <p className="text-2xl font-bold text-rose-400">{suspendedCompanies}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Total usuarios</p>
              <p className="text-2xl font-bold text-violet-400">{totalUsers}</p>
            </CardContent>
          </Card>
        </div>

        {/* System Health Card */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Estado del sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Versión de la app</p>
                  <p className="text-lg font-semibold">{appVersion}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Estado</p>
                  <div className="mt-1">
                    <span
                      className="inline-block rounded px-2 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: appStatus === 'active' ? '#10b98133' : '#ef444433',
                        color: appStatus === 'active' ? '#10b981' : '#ef4444',
                      }}
                    >
                      {appStatus === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Uptime del servidor</p>
                  <p className="text-lg font-semibold">{formatUptime(uptime)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Versión de Node</p>
                  <p className="text-sm font-semibold">{nodeVersion}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Empresas registradas ({companies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <p className="text-sm text-slate-400">No hay empresas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="pb-2 pr-4">Nombre</th>
                      <th className="pb-2 pr-4">RUT</th>
                      <th className="pb-2 pr-4">Estado</th>
                      <th className="pb-2 pr-4">Usuarios</th>
                      <th className="pb-2">Creada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company._id} className="border-b border-slate-800 hover:bg-slate-800/30">
                        <td className="py-2 pr-4 text-sm font-medium">{company.name}</td>
                        <td className="py-2 pr-4 text-xs text-slate-400">{company.rut || '—'}</td>
                        <td className="py-2 pr-4">
                          <span
                            className="inline-block rounded px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: company.status === 'ACTIVE' ? '#10b98133' : '#ef444433',
                              color: company.status === 'ACTIVE' ? '#10b981' : '#ef4444',
                            }}
                          >
                            {company.status === 'ACTIVE' ? 'Activa' : 'Suspendida'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-xs font-semibold">{company.userCount || 0}</td>
                        <td className="py-2 text-xs text-slate-400">{formatDate(company.createdAt)}</td>
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

export default Monitoring;
