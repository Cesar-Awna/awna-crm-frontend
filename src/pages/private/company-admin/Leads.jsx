import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useBU } from '../../../contexts/BUContext.jsx';
import { getStoredSession } from '../../../lib/session.js';

const FIELD_ALIASES = {
  rutEmpresa:     ['rut'],
  nombreContacto: ['nombre', 'contactName'],
  razonSocial:    ['nombreEmpresa', 'empresa'],
  telefono:       ['contactPhone', 'celular'],
};
const getLeadField = (lead, key) => {
  const direct = lead?.fields?.[key] ?? lead?.[key];
  if (direct !== undefined && direct !== null && direct !== '') return direct;
  for (const alias of (FIELD_ALIASES[key] || [])) {
    const v = lead?.fields?.[alias] ?? lead?.[alias];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return '—';
};

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

const STORAGE_KEY = 'admin-leads-state';
const loadSavedState = () => {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(s);
  } catch { return null; }
};

const AdminLeads = () => {
  const navigate = useNavigate();
  const { activeBuId } = useBU();
  const [searchParams] = useSearchParams();
  const _session = getStoredSession();
  const isSupervisor = _session?.roleName?.toUpperCase() === 'SUPERVISOR';
  const currentUserId = _session?.userId || null;
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadStats, setLeadStats] = useState({ total: 0, byStatus: {} });
  const [users, setUsers] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);

  // Restore filters from sessionStorage when coming back from a lead detail
  const _saved = useRef(loadSavedState());
  const saved = _saved.current;
  const _ownerMe = searchParams.get('owner') === 'me' && currentUserId ? currentUserId : '';
  const [leadFilters, setLeadFilters] = useState(saved?.filters || {
    businessUnitId: '',
    ownerUserId: _ownerMe,
    status: '',
    fuenteLead: '',
    productoCotizado: '',
    createdAtFrom: '',
    createdAtTo: '',
    closedAtFrom: '',
    closedAtTo: '',
    q: '',
  });
  const skipPageResetRef = useRef(!!saved);
  const scrollRestoreRef = useRef(saved?.scroll ?? null);

  const [reassignModal, setReassignModal] = useState({ open: false, leadId: null });
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, leadId: null });
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeBuSchema, setActiveBuSchema] = useState([]);
  const [activeBuStages, setActiveBuStages] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const pagination = usePagination(saved?.page || 1, 100);

  // Unassigned tab state
  const [unassignedLeads, setUnassignedLeads] = useState([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [bulkAssignUserId, setBulkAssignUserId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, busRes, meRes] = await Promise.all([
          UsersService.getExecutives({ limit: 1000 }),
          BusinessUnitsService.getAll(),
          AuthService.getMe(),
        ]);
        const execList = usersRes?.success ? (usersRes.data || []) : [];
        const me = meRes?.success ? meRes.data : null;
        // include the current supervisor so their own leads show their name
        const meUser = me?.user;
        const alreadyIn = meUser ? execList.some((u) => u._id === String(meUser._id)) : true;
        setUsers(alreadyIn || !meUser ? execList : [{ _id: String(meUser._id), fullName: meUser.fullName }, ...execList]);
        if (busRes?.success) {
          const allBus = busRes.data || [];
          const session = getStoredSession();
          const role = session?.roleName?.toUpperCase();
          const isAdmin = role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN';
          if (isAdmin) {
            setBusinessUnits(allBus);
          } else {
            const userBuIds = (session?.businessUnitIds || []).map(String);
            setBusinessUnits(allBus.filter((bu) => userBuIds.includes(String(bu._id))));
          }
        }
      } catch (e) {
        console.error('Error loading initial data:', e);
      }
    };
    loadData();
  }, [activeBuId]);

  // Reset to page 1 whenever filters change — skipped once when restoring saved state
  useEffect(() => {
    if (skipPageResetRef.current) { skipPageResetRef.current = false; return; }
    pagination.resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    leadFilters.businessUnitId, leadFilters.ownerUserId, leadFilters.status,
    leadFilters.fuenteLead, leadFilters.productoCotizado,
    leadFilters.createdAtFrom, leadFilters.createdAtTo,
    leadFilters.closedAtFrom, leadFilters.closedAtTo,
    leadFilters.q,
  ]);

  useEffect(() => {
    const buId = leadFilters.businessUnitId;
    if (!buId) {
      setActiveBuSchema([]);
      setActiveBuStages([]);
      return;
    }
    BusinessUnitsService.getSchema(buId)
      .then((res) => {
        if (res?.success && res.data) {
          setActiveBuSchema(res.data.leadSchema || []);
          setActiveBuStages(res.data.pipelineStages || []);
        } else {
          setActiveBuSchema([]);
          setActiveBuStages([]);
        }
      })
      .catch(() => { setActiveBuSchema([]); setActiveBuStages([]); });
  }, [leadFilters.businessUnitId, businessUnits]);

  useEffect(() => {
    const loadLeadsData = async () => {
      setLoadingLeads(true);
      try {
        const params = {
          page: pagination.currentPage,
          limit: pagination.limit,
          assigned: 'true',
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
        if (leadFilters.q) params.q = leadFilters.q;

        const statsParams = {};
        if (leadFilters.businessUnitId) statsParams.businessUnitId = leadFilters.businessUnitId;

        const [leadsResult, statsResult] = await Promise.allSettled([
          LeadsService.getAll(params),
          LeadsService.getStats(statsParams),
        ]);

        const leadsRes = leadsResult.status === 'fulfilled' ? leadsResult.value : null;
        const statsRes = statsResult.status === 'fulfilled' ? statsResult.value : null;

        if (leadsRes?.success && Array.isArray(leadsRes.data)) {
          setLeads(leadsRes.data);
          pagination.updatePaginationData(leadsRes.pagination);
          if (scrollRestoreRef.current !== null) {
            const y = scrollRestoreRef.current;
            scrollRestoreRef.current = null;
            requestAnimationFrame(() => window.scrollTo(0, y));
          }
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
  }, [
    leadFilters.businessUnitId, leadFilters.ownerUserId, leadFilters.status,
    leadFilters.fuenteLead, leadFilters.productoCotizado,
    leadFilters.createdAtFrom, leadFilters.createdAtTo,
    leadFilters.closedAtFrom, leadFilters.closedAtTo,
    leadFilters.q,
    pagination.currentPage, pagination.limit,
  ]);

  const openLead = (leadId) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      filters: leadFilters,
      page: pagination.currentPage,
      scroll: window.scrollY,
    }));
    navigate(`/leads/${leadId}`);
  };

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

  const loadUnassigned = async () => {
    setLoadingUnassigned(true);
    try {
      const res = await LeadsService.getUnassigned();
      if (res?.success && Array.isArray(res.data)) {
        setUnassignedLeads(res.data);
      } else {
        setUnassignedLeads([]);
      }
    } catch {
      setUnassignedLeads([]);
    } finally {
      setLoadingUnassigned(false);
    }
  };

  useEffect(() => {
    loadUnassigned();
  }, []);

  useEffect(() => {
    if (activeTab === 'unassigned') loadUnassigned();
  }, [activeTab]);

  const handleToggleSelect = (id) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.size === unassignedLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(unassignedLeads.map((l) => l._id)));
    }
  };

  const handleDeleteUnassigned = async (leadId) => {
    try {
      const res = await LeadsService.deleteLead(leadId);
      if (res?.success) {
        setUnassignedLeads((prev) => prev.filter((l) => l._id !== leadId));
        setSelectedLeadIds((prev) => { const next = new Set(prev); next.delete(leadId); return next; });
      } else {
        setMessage(res?.message || 'Error al eliminar.');
      }
    } catch {
      setMessage('Error al eliminar.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    setBulkAssigning(true);
    try {
      await Promise.all(Array.from(selectedLeadIds).map((id) => LeadsService.deleteLead(id)));
      setUnassignedLeads((prev) => prev.filter((l) => !selectedLeadIds.has(l._id)));
      setSelectedLeadIds(new Set());
      setMessage(`${selectedLeadIds.size} leads eliminados.`);
    } catch {
      setMessage('Error al eliminar leads.');
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignUserId || selectedLeadIds.size === 0) return;
    setBulkAssigning(true);
    try {
      const res = await LeadsService.bulkAssign({
        leadIds: Array.from(selectedLeadIds),
        ownerUserId: bulkAssignUserId,
      });
      if (res?.success) {
        setMessage(`${res.data?.modifiedCount || selectedLeadIds.size} leads asignados correctamente.`);
        setSelectedLeadIds(new Set());
        setBulkAssignUserId('');
        await loadUnassigned();
      } else {
        setMessage(res?.message || 'Error al asignar leads.');
      }
    } catch {
      setMessage('Error al asignar leads.');
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleImportSuccess = async () => {
    if (activeTab === 'unassigned') {
      setMessage('Leads importados. Ya puedes asignarlos.');
      await loadUnassigned();
    } else {
      setMessage('Leads importados correctamente.');
      const leadsRes = await LeadsService.getAll(leadFilters);
      if (leadsRes?.success && Array.isArray(leadsRes.data)) {
        setLeads(leadsRes.data);
        pagination.updatePaginationData(leadsRes.pagination);
      }
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

  const executives = leadFilters.businessUnitId
    ? users.filter((u) => {
        const buIds = (u.businessUnitIds?.length ? u.businessUnitIds : [u.businessUnitId]).filter(Boolean).map(String);
        return buIds.includes(leadFilters.businessUnitId);
      })
    : users;
  const dynCols = activeBuSchema.filter((f) => f.type !== 'textarea').slice(0, 4);

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      let allLeads = [];
      let page = 1;
      while (true) {
        const params = { page, limit: 100, assigned: 'true' };
        if (leadFilters.businessUnitId) params.businessUnitId = leadFilters.businessUnitId;
        if (leadFilters.ownerUserId)    params.ownerUserId    = leadFilters.ownerUserId;
        if (leadFilters.status)         params.status         = leadFilters.status;
        if (leadFilters.fuenteLead)     params.fuenteLead     = leadFilters.fuenteLead;
        if (leadFilters.productoCotizado) params.productoCotizado = leadFilters.productoCotizado;
        if (leadFilters.createdAtFrom)  params.createdAtFrom  = leadFilters.createdAtFrom;
        if (leadFilters.createdAtTo)    params.createdAtTo    = leadFilters.createdAtTo;
        if (leadFilters.closedAtFrom)   params.closedAtFrom   = leadFilters.closedAtFrom;
        if (leadFilters.closedAtTo)     params.closedAtTo     = leadFilters.closedAtTo;
        if (leadFilters.q)              params.q              = leadFilters.q;
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
        row['Valor esperado']  = lead.fields?.valorEsperado || '—';
        row['Moneda']          = lead.fields?.monedaValorEsperado || '—';
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
            {activeTab === 'leads' && (
              <Button type="button" onClick={() => navigate('/leads/new')}>
                + Nuevo lead
              </Button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'leads'
                ? 'border-b-2 border-sky-400 text-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Leads
          </button>
          <button
            onClick={() => setActiveTab('unassigned')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'unassigned'
                ? 'border-b-2 border-sky-400 text-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sin asignar
            {unassignedLeads.length > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-slate-900">
                {unassignedLeads.length}
              </span>
            )}
          </button>
        </div>

        {/* Unassigned tab view */}
        {activeTab === 'unassigned' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Sin asignar{' '}
                  <span className="text-sm font-normal text-slate-400">({unassignedLeads.length})</span>
                </CardTitle>
                {unassignedLeads.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Seleccionar</span>
                    <select
                      className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-50"
                      value=""
                      onChange={(e) => {
                        const n = parseInt(e.target.value);
                        if (!n) return;
                        setSelectedLeadIds(new Set(unassignedLeads.slice(0, n).map((l) => l._id)));
                      }}
                    >
                      <option value="">— cantidad —</option>
                      {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550].map((n) => (
                        <option key={n} value={n}>{n} leads</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {message && typeof message === 'string' && (
                <div className="mb-4 rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
                  {message}
                </div>
              )}
              {loadingUnassigned ? (
                <p className="text-sm text-slate-400">Cargando…</p>
              ) : unassignedLeads.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-400">No hay leads sin asignar.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Usa el botón "Importar Excel" para cargar leads y asignarlos después.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-slate-400">
                        <th className="pb-2 pr-3">
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.size === unassignedLeads.length && unassignedLeads.length > 0}
                            onChange={handleSelectAll}
                            className="accent-sky-400"
                          />
                        </th>
                        <th className="pb-2 pr-3 text-slate-500">#</th>
                        <th className="pb-2 pr-4">Razón Social</th>
                        <th className="pb-2 pr-4">RUT</th>
                        <th className="pb-2 pr-4">Contacto</th>
                        <th className="pb-2 pr-4">Teléfono</th>
                        <th className="pb-2 pr-4">Ingreso</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassignedLeads.map((lead, idx) => (
                        <tr
                          key={lead._id}
                          className={`border-b border-slate-800 cursor-pointer transition-colors ${
                            selectedLeadIds.has(lead._id) ? 'bg-sky-500/10' : 'hover:bg-slate-800/50'
                          }`}
                          onClick={() => handleToggleSelect(lead._id)}
                        >
                          <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.has(lead._id)}
                              onChange={() => handleToggleSelect(lead._id)}
                              className="accent-sky-400"
                            />
                          </td>
                          <td className="py-2 pr-3 text-xs text-slate-500">{idx + 1}</td>
                          <td className="max-w-40 truncate py-2 pr-4 text-xs">{getLeadField(lead, 'razonSocial')}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{getLeadField(lead, 'rutEmpresa')}</td>
                          <td className="py-2 pr-4 text-xs">{getLeadField(lead, 'nombreContacto')}</td>
                          <td className="py-2 pr-4 text-xs">{getLeadField(lead, 'telefono')}</td>
                          <td className="py-2 pr-4 text-xs text-slate-400">{formatDate(lead.createdAt)}</td>
                          <td className="py-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteUnassigned(lead._id)}
                              className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Floating action bar for bulk assign */}
        {activeTab === 'unassigned' && selectedLeadIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border border-slate-600 bg-slate-800 px-5 py-3 shadow-2xl">
            <span className="text-sm font-medium text-slate-200">
              {selectedLeadIds.size} {selectedLeadIds.size === 1 ? 'lead seleccionado' : 'leads seleccionados'}
            </span>
            <select
              className="h-9 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-50"
              value={bulkAssignUserId}
              onChange={(e) => setBulkAssignUserId(e.target.value)}
            >
              <option value="">Asignar a...</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.fullName}</option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={!bulkAssignUserId || bulkAssigning}
              onClick={handleBulkAssign}
            >
              {bulkAssigning ? 'Asignando…' : 'Confirmar'}
            </Button>
            <div className="w-px h-6 bg-slate-600" />
            <button
              onClick={handleBulkDelete}
              disabled={bulkAssigning}
              className="text-sm text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
            >
              Eliminar seleccionados
            </button>
            <button
              onClick={() => { setSelectedLeadIds(new Set()); setBulkAssignUserId(''); }}
              className="text-slate-400 hover:text-slate-200 text-sm"
            >
              Cancelar
            </button>
          </div>
        )}

        {activeTab === 'leads' && (loadingLeads ? (
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
        ))}

        {activeTab === 'leads' && <><Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filtros</CardTitle>
              {isSupervisor && currentUserId && (
                <Button
                  type="button"
                  size="sm"
                  variant={leadFilters.ownerUserId === currentUserId ? 'default' : 'outline'}
                  onClick={() => setLeadFilters((f) => ({
                    ...f,
                    ownerUserId: f.ownerUserId === currentUserId ? '' : currentUserId,
                  }))}
                >
                  {leadFilters.ownerUserId === currentUserId ? 'Mis Leads ✓' : 'Mis Leads'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Buscador por nombre */}
            <input
              type="text"
              placeholder="Buscar por RUT o nombre de empresa..."
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 placeholder:text-slate-500"
              value={leadFilters.q}
              onChange={(e) => setLeadFilters((f) => ({ ...f, q: e.target.value }))}
            />
            {/* Fila 1: dropdowns en grid fijo */}
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
              <select
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                value={leadFilters.businessUnitId}
                onChange={(e) => setLeadFilters((f) => ({ ...f, businessUnitId: e.target.value, ownerUserId: '' }))}
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
                {(activeBuStages.length > 0 ? activeBuStages : LEAD_STATUSES.map(s => ({ key: s.value, label: s.label }))).map((s) => (
                  <option key={s.key ?? s.value} value={s.key ?? s.value}>{s.label}</option>
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
                  setLeadFilters({ businessUnitId: '', ownerUserId: '', status: '', fuenteLead: '', productoCotizado: '', createdAtFrom: '', createdAtTo: '', closedAtFrom: '', closedAtTo: '', q: '' })
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
                        <th className="pb-2 pr-4">Fecha de cierre</th>
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
                          <td className="py-2 pr-4 text-xs text-slate-400">
                            {lead.closedAt ? formatDate(lead.closedAt) : '—'}
                          </td>
                          <td className="py-2 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openLead(lead._id)}
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
        </Card></>}

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
          skipAssign={activeTab === 'unassigned'}
        />
      </main>
    </div>
  );
};

export default AdminLeads;
