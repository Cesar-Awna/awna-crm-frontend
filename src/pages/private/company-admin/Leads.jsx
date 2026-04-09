import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import FunnelStagesService from '../../../services/FunnelStages.js';
import UsersService from '../../../services/Users.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';

const AdminLeads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadStats, setLeadStats] = useState({ open: 0, wonThisMonth: 0, lostThisMonth: 0, atRisk: 0 });
  const [funnelStages, setFunnelStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [leadFilters, setLeadFilters] = useState({
    businessUnitId: '',
    ownerUserId: '',
    stageId: '',
    status: '',
  });
  const [reassignModal, setReassignModal] = useState({ open: false, leadId: null });
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [message, setMessage] = useState(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, busRes, stagesRes] = await Promise.all([
          UsersService.getAll(),
          BusinessUnitsService.getAll(),
          FunnelStagesService.getAll(),
        ]);
        if (usersRes?.success) setUsers(usersRes.data || []);
        if (busRes?.success) setBusinessUnits(busRes.data || []);
        if (stagesRes?.success) setFunnelStages(stagesRes.data || []);
      } catch (e) {
        console.error('Error loading initial data:', e);
      }
    };
    loadData();
  }, []);

  // Load leads and stats
  useEffect(() => {
    const loadLeadsData = async () => {
      setLoadingLeads(true);
      try {
        const params = {};
        if (leadFilters.businessUnitId) params.businessUnitId = leadFilters.businessUnitId;
        if (leadFilters.ownerUserId) params.ownerUserId = leadFilters.ownerUserId;
        if (leadFilters.stageId) params.stageId = leadFilters.stageId;
        if (leadFilters.status) params.status = leadFilters.status;

        const [leadsRes, statsRes] = await Promise.all([
          LeadsService.getAll(params),
          LeadsService.getStats(),
        ]);

        if (leadsRes?.success && Array.isArray(leadsRes.data)) {
          setLeads(leadsRes.data);
        } else {
          setLeads([]);
        }

        if (statsRes?.success && statsRes.data) {
          setLeadStats(statsRes.data);
        }
      } catch (e) {
        console.error('Error loading leads:', e);
        setLeads([]);
      } finally {
        setLoadingLeads(false);
      }
    };

    loadLeadsData();
  }, [leadFilters]);

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
        // Refresh leads
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

  const getUserName = (userId) => {
    const user = users.find((u) => u._id === userId);
    return user?.fullName || '—';
  };

  const getBUName = (buId) => {
    const bu = businessUnits.find((b) => b._id === buId);
    return bu?.name || bu?.code || '—';
  };

  const getStageName = (stageId) => {
    const stage = funnelStages.find((s) => s._id === stageId);
    return stage?.name || '—';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const executives = useMemo(() => users.filter((u) => u.roleName === 'EXECUTIVE'), [users]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Leads de la empresa</h1>
          <p className="text-xs text-slate-400">
            Vista administrativa: todos los leads, filtros y reasignaciones.
          </p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Abiertos</p>
              <p className="text-2xl font-bold text-emerald-400">{leadStats.open}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Ganados (mes)</p>
              <p className="text-2xl font-bold text-green-400">{leadStats.wonThisMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Perdidos (mes)</p>
              <p className="text-2xl font-bold text-red-400">{leadStats.lostThisMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">En riesgo</p>
              <p className="text-2xl font-bold text-amber-400">{leadStats.atRisk}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <select
                className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                value={leadFilters.businessUnitId}
                onChange={(e) => setLeadFilters((f) => ({ ...f, businessUnitId: e.target.value }))}
              >
                <option value="">Todas las unidades</option>
                {businessUnits.map((bu) => (
                  <option key={bu._id} value={bu._id}>
                    {bu.code} — {bu.name}
                  </option>
                ))}
              </select>

              <select
                className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                value={leadFilters.ownerUserId}
                onChange={(e) => setLeadFilters((f) => ({ ...f, ownerUserId: e.target.value }))}
              >
                <option value="">Todos los ejecutivos</option>
                {executives.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.fullName}
                  </option>
                ))}
              </select>

              <select
                className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                value={leadFilters.stageId}
                onChange={(e) => setLeadFilters((f) => ({ ...f, stageId: e.target.value }))}
              >
                <option value="">Todas las etapas</option>
                {funnelStages.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                value={leadFilters.status}
                onChange={(e) => setLeadFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">Todos los estados</option>
                <option value="OPEN">Abierto</option>
                <option value="WON">Ganado</option>
                <option value="LOST">Perdido</option>
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLeadFilters({ businessUnitId: '', ownerUserId: '', stageId: '', status: '' })
                }
              >
                Limpiar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Listado de leads{' '}
              <span className="text-sm font-normal text-slate-400">({leads.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {message && (
              <div className="mb-4 rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
                {message}
              </div>
            )}
            {loadingLeads ? (
              <p className="text-sm text-slate-400">Cargando leads…</p>
            ) : leads.length === 0 ? (
              <p className="text-sm text-slate-400">No se encontraron leads con los filtros actuales.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="pb-2 pr-4">Cliente</th>
                      <th className="pb-2 pr-4">Unidad</th>
                      <th className="pb-2 pr-4">Ejecutivo</th>
                      <th className="pb-2 pr-4">Etapa</th>
                      <th className="pb-2 pr-4">Estado</th>
                      <th className="pb-2 pr-4">Monto est.</th>
                      <th className="pb-2 pr-4">Última act.</th>
                      <th className="pb-2 pr-4">Alertas</th>
                      <th className="pb-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead._id} className="border-b border-slate-800">
                        <td className="py-2 pr-4 text-xs max-w-[160px] truncate">
                          {lead.clientName?.trim() || `…${String(lead._id).slice(-6)}`}
                        </td>
                        <td className="py-2 pr-4 text-xs">{getBUName(lead.businessUnitId)}</td>
                        <td className="py-2 pr-4">{getUserName(lead.ownerUserId)}</td>
                        <td className="py-2 pr-4">{getStageName(lead.currentStageId)}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                              lead.status === 'WON'
                                ? 'bg-green-500/20 text-green-400'
                                : lead.status === 'LOST'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-slate-600/30 text-slate-300'
                            }`}
                          >
                            {lead.status === 'OPEN' ? 'Abierto' : lead.status === 'WON' ? 'Ganado' : 'Perdido'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-xs">
                          {lead.estimatedAmount
                            ? `$${lead.estimatedAmount.toLocaleString('es-CL')}`
                            : '—'}
                        </td>
                        <td className="py-2 pr-4 text-xs text-slate-400">
                          {formatDate(lead.lastActivityAt)}
                        </td>
                        <td className="py-2 pr-4">
                          {lead.isDormant && (
                            <span className="mr-1 inline-block rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                              Dormido
                            </span>
                          )}
                          {lead.stagnationLevel && (
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-xs ${
                                lead.stagnationLevel === 'CRITICAL'
                                  ? 'bg-red-500/20 text-red-400'
                                  : lead.stagnationLevel === 'OVERDUE'
                                  ? 'bg-orange-500/20 text-orange-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {lead.stagnationLevel}
                            </span>
                          )}
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reassign Modal */}
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
      </main>
    </div>
  );
};

export default AdminLeads;
