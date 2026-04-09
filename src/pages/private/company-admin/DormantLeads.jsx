import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import FunnelStagesService from '../../../services/FunnelStages.js';
import UsersService from '../../../services/Users.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';

const AdminDormantLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [funnelStages, setFunnelStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [reassignModal, setReassignModal] = useState({ open: false, leadId: null });
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [message, setMessage] = useState(null);

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
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadDormant = async () => {
      setLoading(true);
      try {
        const res = await LeadsService.getDormant();
        if (res?.success && Array.isArray(res.data)) {
          setLeads(res.data);
        } else {
          setLeads([]);
        }
      } catch (e) {
        console.error('Error loading dormant leads:', e);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };
    loadDormant();
  }, []);

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
        const refreshed = await LeadsService.getDormant();
        if (refreshed?.success) setLeads(refreshed.data || []);
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

  const daysSince = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const executives = useMemo(() => users.filter((u) => u.roleName === 'EXECUTIVE'), [users]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Leads Dormidos</h1>
          <p className="text-xs text-slate-400">
            Leads sin actividad reciente que requieren atención.
          </p>
        </header>

        {/* Summary Card */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                <span className="text-2xl">😴</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{leads.length}</p>
                <p className="text-xs text-slate-400">leads dormidos en la empresa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de leads dormidos</CardTitle>
          </CardHeader>
          <CardContent>
            {message && (
              <div className="mb-4 rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
                {message}
              </div>
            )}
            {loading ? (
              <p className="text-sm text-slate-400">Cargando leads dormidos…</p>
            ) : leads.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-lg text-slate-300">🎉 No hay leads dormidos</p>
                <p className="text-sm text-slate-500">Todos los leads tienen actividad reciente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="pb-2 pr-4">Unidad</th>
                      <th className="pb-2 pr-4">Ejecutivo</th>
                      <th className="pb-2 pr-4">Etapa</th>
                      <th className="pb-2 pr-4">Última actividad</th>
                      <th className="pb-2 pr-4">Días sin actividad</th>
                      <th className="pb-2 pr-4">Monto est.</th>
                      <th className="pb-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead._id} className="border-b border-slate-800">
                        <td className="py-2 pr-4 text-xs">{getBUName(lead.businessUnitId)}</td>
                        <td className="py-2 pr-4">{getUserName(lead.ownerUserId)}</td>
                        <td className="py-2 pr-4">{getStageName(lead.currentStageId)}</td>
                        <td className="py-2 pr-4 text-xs text-slate-400">
                          {formatDate(lead.lastActivityAt)}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="inline-block rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                            {daysSince(lead.lastActivityAt)} días
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-xs">
                          {lead.estimatedAmount
                            ? `$${lead.estimatedAmount.toLocaleString('es-CL')}`
                            : '—'}
                        </td>
                        <td className="py-2 whitespace-nowrap">
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
                <CardTitle>Reasignar Lead Dormido</CardTitle>
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

export default AdminDormantLeads;
