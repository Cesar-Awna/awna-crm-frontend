import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import MetricsService from '../../../services/Metrics.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import UsersService from '../../../services/Users.js';
import { usePagination } from '../../../hooks/usePagination.js';
import PaginationControls from '../../../components/PaginationControls.jsx';
import { exportCSV } from '../../../utils/exportCSV.js';
import { fetchHitosColumn } from '../../../utils/hitosExport.js';

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

const Reports = () => {
  const [activeTab, setActiveTab] = useState('leads');
  const [businessUnits, setBusinessUnits] = useState([]);
  const [executives, setExecutives] = useState([]);

  const leadsPageination = usePagination(1, 20);
  const [leadsData, setLeadsData] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsFilters, setLeadsFilters] = useState({
    businessUnitId: '',
    ownerUserId: '',
    status: '',
    nextContactDateFrom: '',
    nextContactDateTo: '',
    fuenteLead: '',
    productoCotizado: '',
  });

  const [conversionData, setConversionData] = useState(null);
  const [conversionLoading, setConversionLoading] = useState(false);

  const [activityData, setActivityData] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPeriod, setActivityPeriod] = useState('week');
  const [activityUserId, setActivityUserId] = useState('');
  const [exportLeadsLoading, setExportLeadsLoading] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [fuenteOptions, setFuenteOptions] = useState([]);

  useEffect(() => {
    if (!leadsFilters.businessUnitId) { setProductOptions([]); setFuenteOptions([]); return; }
    BusinessUnitsService.getSchema(leadsFilters.businessUnitId)
      .then((res) => {
        if (!res?.success) return;
        const field = (res.data?.leadSchema || []).find((f) => f.key === 'productoCotizado');
        setFuenteOptions((res.data?.leadSchema || []).find((f) => f.key === 'fuenteLead')?.options || []);
        setProductOptions(field?.options || []);
      })
      .catch(() => setProductOptions([]));
  }, [leadsFilters.businessUnitId]);

  React.useEffect(() => {
    const loadFilters = async () => {
      try {
        const [busRes, execRes] = await Promise.all([
          BusinessUnitsService.getAll(),
          UsersService.getExecutives({ limit: 1000 }),
        ]);
        if (busRes?.success) setBusinessUnits(busRes.data || []);
        if (execRes?.success) setExecutives(execRes.data || []);
      } catch (e) {
        console.error('Error loading filters:', e);
      }
    };
    loadFilters();
  }, []);

  // Tab: Leads
  const loadLeads = async () => {
    setLeadsLoading(true);
    try {
      const params = {
        page: leadsPageination.currentPage,
        limit: leadsPageination.limit,
      };
      if (leadsFilters.businessUnitId) params.businessUnitId = leadsFilters.businessUnitId;
      if (leadsFilters.ownerUserId) params.ownerUserId = leadsFilters.ownerUserId;
      if (leadsFilters.status) params.status = leadsFilters.status;
      if (leadsFilters.nextContactDateFrom) params.nextContactDateFrom = leadsFilters.nextContactDateFrom;
      if (leadsFilters.nextContactDateTo) params.nextContactDateTo = leadsFilters.nextContactDateTo;
      if (leadsFilters.fuenteLead) params.fuenteLead = leadsFilters.fuenteLead;
      if (leadsFilters.productoCotizado) params.productoCotizado = leadsFilters.productoCotizado;

      const res = await LeadsService.getAll(params);
      if (res?.success && Array.isArray(res.data)) {
        setLeadsData(res.data);
        leadsPageination.updatePaginationData(res.pagination);
      }
    } catch (e) {
      console.error('Error loading leads:', e);
    } finally {
      setLeadsLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'leads') {
      loadLeads();
    }
  }, [activeTab, leadsPageination.currentPage, leadsPageination.limit]);

  React.useEffect(() => {
    leadsPageination.reset();
  }, [leadsFilters]);

  // Tab: Conversion
  const loadConversion = async () => {
    setConversionLoading(true);
    try {
      const [convRes, sumRes] = await Promise.all([
        MetricsService.getConversion(),
        MetricsService.getSummary(),
      ]);
      setConversionData({
        conversion: convRes?.success ? convRes.data : null,
        summary: sumRes?.success ? sumRes.data : null,
      });
    } catch (e) {
      console.error('Error loading conversion:', e);
    } finally {
      setConversionLoading(false);
    }
  };

  // Tab: Activity
  const loadActivity = async () => {
    setActivityLoading(true);
    try {
      const params = { period: activityPeriod };
      if (activityUserId) params.userId = activityUserId;
      const res = await MetricsService.getActivity(params);
      setActivityData(res?.success ? res.data : null);
    } catch (e) {
      console.error('Error loading activity:', e);
    } finally {
      setActivityLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'conversion') {
      loadConversion();
    }
  }, [activeTab]);

  React.useEffect(() => {
    if (activeTab === 'activity') {
      loadActivity();
    }
  }, [activeTab, activityPeriod, activityUserId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleExportLeads = async () => {
    setExportLeadsLoading(true);
    try {
      let allLeads = [];
      let page = 1;
      while (true) {
        const params = { page, limit: 100 };
        if (leadsFilters.businessUnitId) params.businessUnitId = leadsFilters.businessUnitId;
        if (leadsFilters.ownerUserId) params.ownerUserId = leadsFilters.ownerUserId;
        if (leadsFilters.status) params.status = leadsFilters.status;
        if (leadsFilters.nextContactDateFrom) params.nextContactDateFrom = leadsFilters.nextContactDateFrom;
        if (leadsFilters.nextContactDateTo) params.nextContactDateTo = leadsFilters.nextContactDateTo;
        if (leadsFilters.fuenteLead) params.fuenteLead = leadsFilters.fuenteLead;
        if (leadsFilters.productoCotizado) params.productoCotizado = leadsFilters.productoCotizado;
        const res = await LeadsService.getAll(params);
        if (!res?.success || !Array.isArray(res.data) || res.data.length === 0) break;
        allLeads = [...allLeads, ...res.data];
        if (res.data.length < 100) break;
        page++;
      }
      const hitos = await fetchHitosColumn(allLeads);
      const f = (lead, key) => lead?.fields?.[key] ?? lead?.[key] ?? '—';
      const csvData = allLeads.map((lead) => ({
        'Razón Social': f(lead, 'razonSocial'),
        'RUT': f(lead, 'rutEmpresa'),
        'Contacto': f(lead, 'contactName'),
        'Email': f(lead, 'contactEmail'),
        'Teléfono': f(lead, 'contactPhone'),
        'Producto cotizado': lead.fields?.productoCotizado || '—',
        'Valor esperado': lead.fields?.valorEsperado || '—',
        'Moneda': lead.fields?.monedaValorEsperado || '—',
        'Segmentación': lead.fields?.segmentacion || '—',
        'Fuente de lead': lead.fields?.fuenteLead || '—',
        'Estado': lead.status || '—',
        'BU': businessUnits.find((b) => b._id === lead.businessUnitId)?.name || '—',
        'Ejecutivo': executives.find((e) => e._id === lead.ownerUserId)?.fullName || '—',
        'Ingreso': formatDate(lead.createdAt),
        'Fecha de cierre': lead.closedAt ? formatDate(lead.closedAt) : '—',
        'Llamadas realizadas': lead.callCount ?? 0,
        'Contactos efectivos': lead.contactSuccessCount ?? 0,
        'Seguimientos': lead.followupCount ?? 0,
        'WhatsApp enviados': lead.whatsappSentCount ?? 0,
        'Correos enviados': lead.emailSentCount ?? 0,
        'Cotizaciones enviadas': lead.quoteSentCount ?? 0,
        'Reagendamientos': lead.rescheduleCount ?? 0,
        'Hitos': hitos[String(lead._id)] || '',
      }));
      exportCSV(csvData, `reporte-leads-${new Date().toISOString().split('T')[0]}.csv`);
    } finally {
      setExportLeadsLoading(false);
    }
  };

  const handleExportConversion = () => {
    if (!conversionData?.conversion) return;
    const conv = conversionData.conversion;
    const csvData = Object.entries(conv.byStatus || {}).map(([status, count]) => ({
      'Estado': status,
      'Cantidad': count,
      'Porcentaje': ((count / (conv.total || 1)) * 100).toFixed(1) + '%',
    }));
    exportCSV(csvData, `reporte-conversion-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportActivity = () => {
    if (!activityData?.byType) return;
    const csvData = Object.entries(activityData.byType).map(([type, count]) => ({
      'Tipo': type,
      'Cantidad': count,
      'Porcentaje': ((count / Object.values(activityData.byType).reduce((a, b) => a + b, 0)) * 100).toFixed(1) + '%',
    }));
    csvData.push({ 'Tipo': '--- Cierres realizados ---', 'Cantidad': activityData.closures || 0, 'Porcentaje': '—' });
    exportCSV(csvData, `reporte-actividad-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="text-xs text-slate-400">Genera reportes detallados con filtros y exporta a CSV.</p>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-slate-700">
          {['leads', 'conversion', 'activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-emerald-500 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'leads' ? 'Leads' : tab === 'conversion' ? 'Conversión' : 'Actividad'}
            </button>
          ))}
        </div>

        {/* TAB: LEADS */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <select
                    value={leadsFilters.businessUnitId}
                    onChange={(e) => setLeadsFilters({ ...leadsFilters, businessUnitId: e.target.value })}
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                  >
                    <option value="">Todas las unidades</option>
                    {businessUnits.map((bu) => (
                      <option key={bu._id} value={bu._id}>
                        {bu.code} — {bu.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={leadsFilters.ownerUserId}
                    onChange={(e) => setLeadsFilters({ ...leadsFilters, ownerUserId: e.target.value })}
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                  >
                    <option value="">Todos los ejecutivos</option>
                    {executives.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.fullName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={leadsFilters.status}
                    onChange={(e) => setLeadsFilters({ ...leadsFilters, status: e.target.value })}
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                  >
                    <option value="">Todos los estados</option>
                    {['NUEVO', 'CONTACTADO', 'INTERESADO', 'COTIZACION_ENVIADA', 'EN_SEGUIMIENTO', 'CERRADO_GANADO', 'CLIENTE', 'CERRADO_PERDIDO', 'NO_INTERESADO', 'DATO_ERRADO'].map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>

                  <select
                    value={leadsFilters.fuenteLead}
                    onChange={(e) => setLeadsFilters({ ...leadsFilters, fuenteLead: e.target.value })}
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                  >
                    <option value="">Todas las fuentes</option>
                    {(fuenteOptions.length > 0 ? fuenteOptions : ['Ads', 'Apolo', 'Referido', 'Otro', 'Base Equifax']).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>

                  <select
                    value={leadsFilters.productoCotizado}
                    onChange={(e) => setLeadsFilters({ ...leadsFilters, productoCotizado: e.target.value })}
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                  >
                    <option value="">Todos los productos</option>
                    {productOptions.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={leadsFilters.nextContactDateFrom}
                    onChange={(e) => setLeadsFilters({ ...leadsFilters, nextContactDateFrom: e.target.value })}
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                  />

                  <input
                    type="date"
                    value={leadsFilters.nextContactDateTo}
                    onChange={(e) => setLeadsFilters({ ...leadsFilters, nextContactDateTo: e.target.value })}
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                  />

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLeadsFilters({ businessUnitId: '', ownerUserId: '', status: '', nextContactDateFrom: '', nextContactDateTo: '', fuenteLead: '', productoCotizado: '' })}
                  >
                    Limpiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Listado de leads ({leadsData.length})</CardTitle>
                  <Button size="sm" onClick={handleExportLeads} disabled={leadsLoading || !leadsData.length || exportLeadsLoading}>
                    {exportLeadsLoading ? 'Exportando…' : '📥 Exportar CSV'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {leadsLoading ? (
                  <p className="text-sm text-slate-400">Cargando...</p>
                ) : leadsData.length === 0 ? (
                  <p className="text-sm text-slate-400">No hay leads con los filtros seleccionados.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700 text-left text-slate-400">
                            <th className="pb-2 pr-4">Razón Social</th>
                            <th className="pb-2 pr-4">Contacto</th>
                            <th className="pb-2 pr-4">Estado</th>
                            <th className="pb-2 pr-4">BU</th>
                            <th className="pb-2 pr-4">Ejecutivo</th>
                            <th className="pb-2 pr-4">Ingreso</th>
                            <th className="pb-2 pr-4">Fecha de cierre</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leadsData.map((lead) => (
                            <tr key={lead._id} className="border-b border-slate-800">
                              <td className="py-2 pr-4 text-xs">{lead.fields?.razonSocial || lead.razonSocial || '—'}</td>
                              <td className="py-2 pr-4 text-xs">{lead.fields?.nombreContacto || lead.fields?.contactName || lead.contactName || '—'}</td>
                              <td className="py-2 pr-4">
                                <span
                                  className="inline-block rounded px-2 py-0.5 text-xs font-medium"
                                  style={{
                                    backgroundColor: `${STATUS_COLORS[lead.status] || '#64748b'}33`,
                                    color: STATUS_COLORS[lead.status] || '#64748b',
                                  }}
                                >
                                  {lead.status || '—'}
                                </span>
                              </td>
                              <td className="py-2 pr-4 text-xs">
                                {businessUnits.find((b) => b._id === lead.businessUnitId)?.code || '—'}
                              </td>
                              <td className="py-2 pr-4 text-xs">
                                {executives.find((e) => e._id === lead.ownerUserId)?.fullName || '—'}
                              </td>
                              <td className="py-2 pr-4 text-xs text-slate-400">{formatDate(lead.createdAt)}</td>
                              <td className="py-2 pr-4 text-xs text-slate-400">{lead.closedAt ? formatDate(lead.closedAt) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {leadsData.length > 0 && (
                      <PaginationControls
                        currentPage={leadsPageination.currentPage}
                        totalPages={leadsPageination.totalPages}
                        limit={leadsPageination.limit}
                        totalDocs={leadsPageination.totalDocs}
                        hasNextPage={leadsPageination.hasNextPage}
                        hasPrevPage={leadsPageination.hasPrevPage}
                        onPageChange={leadsPageination.goToPage}
                        onLimitChange={leadsPageination.changeLimit}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB: CONVERSION */}
        {activeTab === 'conversion' && (
          <div className="space-y-4">
            {conversionLoading ? (
              <p className="text-sm text-slate-400">Cargando...</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
                      <p className="text-2xl font-bold text-slate-100">{conversionData?.conversion?.total || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Ganados</p>
                      <p className="text-2xl font-bold text-emerald-400">{conversionData?.conversion?.won || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Perdidos</p>
                      <p className="text-2xl font-bold text-rose-400">{conversionData?.conversion?.lost || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Conversión</p>
                      <p className="text-2xl font-bold text-violet-400">{(conversionData?.conversion?.conversionRatePct || 0).toFixed(1)}%</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Distribución por estado</CardTitle>
                      <Button size="sm" onClick={handleExportConversion}>
                        📥 Exportar CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700 text-left text-slate-400">
                            <th className="pb-2 pr-4">Estado</th>
                            <th className="pb-2 pr-4">Cantidad</th>
                            <th className="pb-2 pr-4">Porcentaje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(conversionData?.conversion?.byStatus || {}).map(([status, count]) => {
                            const pct = ((count / (conversionData?.conversion?.total || 1)) * 100).toFixed(1);
                            return (
                              <tr key={status} className="border-b border-slate-800">
                                <td className="py-2 pr-4">
                                  <span
                                    className="inline-block rounded px-2 py-0.5 text-xs font-medium"
                                    style={{
                                      backgroundColor: `${STATUS_COLORS[status] || '#64748b'}33`,
                                      color: STATUS_COLORS[status] || '#64748b',
                                    }}
                                  >
                                    {status}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 font-semibold">{count}</td>
                                <td className="py-2 pr-4 text-slate-400">{pct}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* TAB: ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <div className="flex gap-1">
                    {['today', 'week', 'month'].map((period) => (
                      <Button
                        key={period}
                        size="sm"
                        variant={activityPeriod === period ? 'default' : 'outline'}
                        onClick={() => setActivityPeriod(period)}
                      >
                        {period === 'today' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}
                      </Button>
                    ))}
                  </div>

                  <select
                    value={activityUserId}
                    onChange={(e) => setActivityUserId(e.target.value)}
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                  >
                    <option value="">Todos los ejecutivos</option>
                    {executives.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Actividad registrada</CardTitle>
                  <Button size="sm" onClick={handleExportActivity} disabled={activityLoading || !activityData}>
                    📥 Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <p className="text-sm text-slate-400">Cargando...</p>
                ) : !activityData ? (
                  <p className="text-sm text-slate-400">Sin datos disponibles.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-left text-slate-400">
                          <th className="pb-2 pr-4">Tipo de actividad</th>
                          <th className="pb-2 pr-4">Cantidad</th>
                          <th className="pb-2 pr-4">Porcentaje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(activityData.byType || {}).map(([type, count]) => {
                          const total = Object.values(activityData.byType || {}).reduce((a, b) => a + b, 0);
                          const pct = ((count / (total || 1)) * 100).toFixed(1);
                          return (
                            <tr key={type} className="border-b border-slate-800">
                              <td className="py-2 pr-4 font-medium capitalize">{type}</td>
                              <td className="py-2 pr-4">{count}</td>
                              <td className="py-2 pr-4 text-slate-400">{pct}%</td>
                            </tr>
                          );
                        })}
                        <tr className="border-b border-slate-700 font-semibold">
                          <td className="py-2 pr-4">Cierres realizados</td>
                          <td className="py-2 pr-4">{activityData.closures || 0}</td>
                          <td className="py-2 pr-4">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;

