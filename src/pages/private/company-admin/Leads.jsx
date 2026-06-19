import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import UsersService from '../../../services/Users.js';
import AuthService from '../../../services/Auth.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import { LEAD_STATUSES, getStatusLabel } from '../../../lib/leadFormMappers.js';
import { exportCSV } from '../../../utils/exportCSV.js';
import { usePagination } from '../../../hooks/usePagination.js';
import PaginationControls from '../../../components/PaginationControls.jsx';
import LeadImportModal from '../../../components/LeadImportModal.jsx';

const getLeadField = (lead, key) => lead?.fields?.[key] ?? lead?.[key] ?? '—';

const STATUS_BADGE = {
  NUEVO: 'bg-sky-500/20 text-sky-300',
  DATO_ERRADO: 'bg-red-500/20 text-red-300',
  CONTACTADO: 'bg-blue-500/20 text-blue-300',
  INTERESADO: 'bg-violet-500/20 text-violet-300',
  COTIZACION_ENVIADA: 'bg-amber-500/20 text-amber-300',
  EN_SEGUIMIENTO: 'bg-orange-500/20 text-orange-300',
  CERRADO_GANADO: 'bg-emerald-500/20 text-emerald-300',
  CLIENTE: 'bg-green-600/20 text-green-300',
  CERRADO_PERDIDO: 'bg-rose-500/20 text-rose-300',
  NO_INTERESADO: 'bg-pink-500/20 text-pink-300',
};

const AdminLeads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadStats, setLeadStats] = useState({ total: 0, byStatus: {} });
  const [users, setUsers] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [leadFilters, setLeadFilters] = useState({
    businessUnitId: '',
    ownerUserId: '',
    status: '',
    fuenteLead: '',
    productoCotizado: '',
    createdAtFrom: '',
    createdAtTo: '',
    closedAtFrom: '',
    closedAtTo: '',
  });
  const [reassignModal, setReassignModal] = useState({ open: false, leadId: null });
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, leadId: null });
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeBuSchema, setActiveBuSchema] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const pagination = usePagination(1, 20);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, busRes, meRes] = await Promise.all([
          UsersService.getExecutives(),
          BusinessUnitsService.getAll(),
          AuthService.getMe(),
        ]);
        const execList = usersRes?.success ? (usersRes.data || []) : [];
        const me = meRes?.success ? meRes.data : null;
        // include the current supervisor so their own leads show their name
        const meUser = me?.user;
        const alreadyIn = meUser ? execList.some((u) => u._id === String(meUser._id)) : true;
        setUsers(alreadyIn || !meUser ? execList : [{ _id: String(meUser._id), fullName: meUser.fullName }, ...execList]);
        if (busRes?.success) setBusinessUnits(busRes.data || []);
      } catch (e) {
        console.error('Error loading initial data:', e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    pagination.reset();
  }, [leadFilters.businessUnitId, leadFilters.ownerUserId, leadFilters.status]);

  useEffect(() => {
    const buId = leadFilters.businessUnitId || businessUnits[0]?._id;
    if (!buId) {
      setActiveBuSchema([]);
      return;
    }
    BusinessUnitsService.getSchema(buId)
      .then((res) => {
        if (res?.success && res.data) setActiveBuSchema(res.data.leadSchema || []);
        else setActiveBuSchema([]);
      })
      .catch(() => setActiveBuSchema([]));
  }, [leadFilters.businessUnitId, businessUnits]);

  useEffect(() => {
    const loadLeadsData = async () => {
      setLoadingLeads(true);
      try {
        const params = {
          page: pagination.currentPage,
          limit: pagination.limit,
        };
        if (leadFilters.businessUnitId) params.businessUnitId = leadFilters.businessUnitId;
        if (leadFilters.ownerUserId) params.ownerUserId = leadFilters.ownerUserId;
        if (leadFilters.status) params.status = leadFilters.status;
        if (leadFilters.fuenteLead) params.fuenteLead = leadFilters.fuenteLead;
        if (leadFilters.productoCotizado) params.productoCotizado = leadFilters.productoCotizado;
        if (leadFilters.createdAtFrom) params.createdAtFrom = leadFilters.createdAtFrom;
        if (leadFilters.createdAtTo) params.createdAtTo = leadFilters.createdAtTo;
        if (leadFilters.closedAtFrom) params.closedAtFrom = leadFilters.closedAtFrom;
        if (leadFilters.closedAtTo) params.closedAtTo = leadFilters.closedAtTo;

        const statsParams = {};
        if (leadFilters.businessUnitId) statsParams.businessUnitId = leadFilters.businessUnitId;

        const [leadsRes, statsRes] = await Promise.all([
          LeadsService.getAll(params),
          LeadsService.getStats(statsParams),
        ]);

        if (leadsRes?.success && Array.isArray(leadsRes.data)) {
          setLeads(leadsRes.data);
          pagination.updatePaginationData(leadsRes.pagination);
        } else {
          setLeads([]);
        }

        if (statsRes?.success && statsRes.data) {
          const stats = statsRes.data;
          setLeadStats({
            total: stats.total || 0,
            openCount: stats.openCount || 0,
            wonCount: stats.wonCount || 0,
            lostCount: stats.lostCount || 0,
            invalidCount: stats.invalidCount || 0,
            byStatus: stats.byStatus || {},
          });
        }
      } catch (e) {
        console.error('Error loading leads:', e);
        setLeads([]);
      } finally {
        setLoadingLeads(false);
      }
    };

    loadLeadsData();
  }, [leadFilters, pagination.currentPage, pagination.limit]);

  const handleReassignLead = async () => {
    if (!reassignModal.leadId || !reassignUserId) {
      setMessage('Selecciona un ejecutivo para reasignar.');
      return;
    }
    setReassigning(true);
    setMessage(null);
    try {
      const res = await LeadsService.assign(reassignModal.leadId, { ownerUserId: reassignUserId });
      if (res?.success) {
        setMessage('Lead reasignado correctamente.');
        setReassignModal({ open: false, leadId: null });
        setReassignUserId('');
        const leadsRes = await LeadsService.getAll(leadFilters);
        if (leadsRes?.success && Array.isArray(leadsRes.data)) {
          setLeads(leadsRes.data);
        }
      } else {
        setMessage(res?.message || 'Error al reasignar lead');
      }
    } catch (e) {
      setMessage(e?.response?.data?.message || e?.message || 'Error al reasignar');
    } finally {
      setReassigning(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!deleteModal.leadId) return;
    setDeleting(true);
    try {
      const res = await LeadsService.deleteLead(deleteModal.leadId);
      if (res?.success) {
        setMessage('Lead eliminado correctamente.');
        setDeleteModal({ open: false, leadId: null });
        setLeads((prev) => prev.filter((l) => l._id !== deleteModal.leadId));
      } else {
        setMessage(res?.message || 'Error al eliminar el lead.');
      }
    } catch (e) {
      setMessage(e?.response?.data?.message || 'Error al eliminar el lead.');
    } finally {
      setDeleting(false);
    }
  };

  const handleImportSuccess = async () => {
    setMessage('Leads importados correctamente.');
    const leadsRes = await LeadsService.getAll(leadFilters);
    if (leadsRes?.success && Array.isArray(leadsRes.data)) {
      setLeads(leadsRes.data);
      pagination.updatePaginationData(leadsRes.pagination);
    }
  };

  const getUserName = (userId) => {
    const user = users.find((u) => u._id === userId);
    return user?.fullName || '—';
  };

  const getBUName = (buId) => {
    const bu = businessUnits.find((b) => b._id === buId);
    return bu?.name || bu?.code || '—';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const executives = users;
  const dynCols = activeBuSchema.filter((f) => f.type !== 'textarea').slice(0, 4);

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      let allLeads = [];
      let page = 1;
      while (true) {
        const params = { page, limit: 100 };
        if (leadFilters.businessUnitId) params.businessUnitId = leadFilters.businessUnitId;
        if (leadFilters.ownerUserId)    params.ownerUserId    = leadFilters.ownerUserId;
        if (leadFilters.status)         params.status         = leadFilters.status;
        if (leadFilters.fuenteLead)     params.fuenteLead     = leadFilters.fuenteLead;
        if (leadFilters.productoCotizado) params.productoCotizado = leadFilters.productoCotizado;
        if (leadFilters.createdAtFrom)  params.createdAtFrom  = leadFilters.createdAtFrom;
        if (leadFilters.createdAtTo)    params.createdAtTo    = leadFilters.createdAtTo;
        if (leadFilters.closedAtFrom)   params.closedAtFrom   = leadFilters.closedAtFrom;
        if (leadFilters.closedAtTo)     params.closedAtTo     = leadFilters.closedAtTo;
        const res = await LeadsService.getAll(params);
        if (!res?.success || !Array.isArray(res.data) || res.data.length === 0) break;
        allLeads = [...allLeads, ...res.data];
        if (res.data.length < 100) break;
        page++;
      }

      const allCols = activeBuSchema.filter((f) => f.type !== 'textarea').length > 0
        ? activeBuSchema.filter((f) => f.type !== 'textarea')
        : [
            { key: 'razonSocial',    label: 'Razón Social' },
            { key: 'rutEmpresa',     label: 'RUT' },
            { key: 'nombreContacto', label: 'Contacto' },
            { key: 'telefono',       label: 'Teléfono' },
            { key: 'correo',         label: 'Correo' },
          ];
      const csvData = allLeads.map((lead) => {
        const row = {};
        allCols.forEach((col) => { row[col.label] = getLeadField(lead, col.key); });
        row['Unidad']          = getBUName(lead.businessUnitId);
        row['Ejecutivo']       = getUserName(lead.ownerUserId);
        row['Estado']          = getStatusLabel(lead.status) || lead.status || '—';
        row['Ingreso']         = formatDate(lead.createdAt);
        row['Fecha de cierre'] = lead.closedAt ? formatDate(lead.closedAt) : '—';
        return row;
      });
      exportCSV(csvData, `leads-${new Date().toISOString().split('T')[0]}.csv`);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Leads de la empresa</h1>
            <p className="text-xs text-slate-400">
              Vista administrativa: todos los leads, filtros y reasignaciones.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setImportModalOpen(true)}>
              ⬆ Importar Excel
            </Button>
            <Button type="button" onClick={() => navigate('/leads/new')}>
              + Nuevo lead
            </Button>
          </div>
        </header>

        {loadingLeads ? (
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">En gestión</p>
                <div className="h-8 bg-slate-800 rounded animate-pulse mt-2"></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Ganados</p>
                <div className="h-8 bg-slate-800 rounded animate-pulse mt-2"></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Perdidos</p>
                <div className="h-8 bg-slate-800 rounded animate-pulse mt-2"></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">No válidos</p>
                <div className="h-8 bg-slate-800 rounded animate-pulse mt-2"></div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">En gestión</p>
                <p className="text-2xl font-bold text-sky-400">{leadStats.openCount || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Ganados</p>
                <p className="text-2xl font-bold text-emerald-400">{leadStats.wonCount || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Perdidos</p>
                <p className="text-2xl font-bold text-rose-400">{leadStats.lostCount || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">No válidos</p>
                <p className="text-2xl font-bold text-red-400">{leadStats.invalidCount || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Fila 1: dropdowns en grid fijo */}
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
              <select
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                value={leadFilters.businessUnitId}
                onChange={(e) => setLeadFilters((f) => ({ ...f, businessUnitId: e.target.value }))}
              >
                <option value="">Todas las unidades</option>
                {businessUnits.map((bu) => (
                  <option key={bu._id} value={bu._id}>{bu.code} — {bu.name}</option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                value={leadFilters.ownerUserId}
                onChange={(e) => setLeadFilters((f) => ({ ...f, ownerUserId: e.target.value }))}
              >
                <option value="">Todos los ejecutivos</option>
                {executives.map((u) => (
                  <option key={u._id} value={u._id}>{u.fullName}</option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                value={leadFilters.status}
                onChange={(e) => setLeadFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">Todos los estados</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                value={leadFilters.fuenteLead}
                onChange={(e) => setLeadFilters((f) => ({ ...f, fuenteLead: e.target.value }))}
              >
                <option value="">Todas las fuentes</option>
                {['Ads', 'Apolo', 'Referido', 'Otro'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                value={leadFilters.productoCotizado}
                onChange={(e) => setLeadFilters((f) => ({ ...f, productoCotizado: e.target.value }))}
              >
                <option value="">Todos los productos</option>
                {['Mora Control', 'Reporte Interactivo'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10"
                onClick={() =>
                  setLeadFilters({ businessUnitId: '', ownerUserId: '', status: '', fuenteLead: '', productoCotizado: '', createdAtFrom: '', createdAtTo: '', closedAtFrom: '', closedAtTo: '' })
                }
              >
                Limpiar filtros
              </Button>
            </div>

            {/* Fila 2: filtros de fecha */}
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Ingreso desde / hasta</span>
                <div className="flex gap-2">
                  <input type="date" className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                    value={leadFilters.createdAtFrom} onChange={(e) => setLeadFilters((f) => ({ ...f, createdAtFrom: e.target.value }))} />
                  <input type="date" className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                    value={leadFilters.createdAtTo} onChange={(e) => setLeadFilters((f) => ({ ...f, createdAtTo: e.target.value }))} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Cierre desde / hasta</span>
                <div className="flex gap-2">
                  <input type="date" className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                    value={leadFilters.closedAtFrom} onChange={(e) => setLeadFilters((f) => ({ ...f, closedAtFrom: e.target.value }))} />
                  <input type="date" className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                    value={leadFilters.closedAtTo} onChange={(e) => setLeadFilters((f) => ({ ...f, closedAtTo: e.target.value }))} />
                </div>
              </div>
            </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Listado de leads{' '}
                <span className="text-sm font-normal text-slate-400">({leads.length})</span>
              </CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                disabled={leads.length === 0 || exportLoading}
              >
                {exportLoading ? 'Exportando…' : '📥 Exportar CSV'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {message && typeof message === 'string' && (
              <div className="mb-4 rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
                {message}
              </div>
            )}
            {loadingLeads ? (
              <p className="text-sm text-slate-400">Cargando leads…</p>
            ) : leads.length === 0 ? (
              <p className="text-sm text-slate-400">
                No se encontraron leads con los filtros actuales.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-slate-400">
                        {dynCols.length > 0
                          ? dynCols.map((col) => (
                              <th key={col.key} className="pb-2 pr-4">{col.label}</th>
                            ))
                          : (
                            <>
                              <th className="pb-2 pr-4">Razón Social</th>
                              <th className="pb-2 pr-4">RUT</th>
                              <th className="pb-2 pr-4">Contacto</th>
                              <th className="pb-2 pr-4">Teléfono</th>
                            </>
                          )}
                        <th className="pb-2 pr-4">Unidad</th>
                        <th className="pb-2 pr-4">Ejecutivo</th>
                        <th className="pb-2 pr-4">Estado</th>
                        <th className="pb-2 pr-4">Ingreso</th>
                        <th className="pb-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead._id} className="border-b border-slate-800">
                          {dynCols.length > 0
                            ? dynCols.map((col) => (
                                <td key={col.key} className="max-w-40 truncate py-2 pr-4 text-xs">
                                  {getLeadField(lead, col.key)}
                                </td>
                              ))
                            : (
                              <>
                                <td className="max-w-40 truncate py-2 pr-4 text-xs">{getLeadField(lead, 'razonSocial')}</td>
                                <td className="py-2 pr-4 font-mono text-xs">{getLeadField(lead, 'rutEmpresa')}</td>
                                <td className="py-2 pr-4 text-xs">{getLeadField(lead, 'nombreContacto')}</td>
                                <td className="py-2 pr-4 text-xs">{getLeadField(lead, 'telefono')}</td>
                              </>
                            )}
                          <td className="py-2 pr-4 text-xs">{getBUName(lead.businessUnitId)}</td>
                          <td className="py-2 pr-4 text-xs">{getUserName(lead.ownerUserId)}</td>
                          <td className="py-2 pr-4">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                                STATUS_BADGE[lead.status] || 'bg-slate-600/30 text-slate-300'
                              }`}
                            >
                              {getStatusLabel(lead.status)}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-xs text-slate-400">
                            {formatDate(lead.createdAt)}
                          </td>
                          <td className="py-2 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/leads/${lead._id}`)}
                              >
                                Abrir
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReassignModal({ open: true, leadId: lead._id });
                                  setReassignUserId(lead.ownerUserId || '');
                                }}
                              >
                                Reasignar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-rose-400 hover:text-rose-300 border-rose-500/30"
                                onClick={() => setDeleteModal({ open: true, leadId: lead._id })}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {leads.length > 0 && (
                  <PaginationControls
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    limit={pagination.limit}
                    totalDocs={pagination.totalDocs}
                    hasNextPage={pagination.hasNextPage}
                    hasPrevPage={pagination.hasPrevPage}
                    onPageChange={pagination.goToPage}
                    onLimitChange={pagination.changeLimit}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {reassignModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Reasignar Lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-400">
                  Selecciona el ejecutivo al que deseas reasignar este lead:
                </p>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                  value={reassignUserId}
                  onChange={(e) => setReassignUserId(e.target.value)}
                >
                  <option value="">Selecciona ejecutivo</option>
                  {executives.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setReassignModal({ open: false, leadId: null });
                      setReassignUserId('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleReassignLead}
                    disabled={reassigning || !reassignUserId}
                  >
                    {reassigning ? 'Reasignando…' : 'Confirmar reasignación'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {deleteModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle className="text-rose-400">Eliminar lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-400">
                  ¿Estás seguro? Esta acción eliminará el lead y todo su historial de actividad. No se puede deshacer.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteModal({ open: false, leadId: null })}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={handleDeleteLead}
                    disabled={deleting}
                  >
                    {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <LeadImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onSuccess={handleImportSuccess}
        />
      </main>
    </div>
  );
};

export default AdminLeads;
