import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import UsersService from '../../../services/Users.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import FunnelStagesService from '../../../services/FunnelStages.js';

const AdminAssignments = () => {
  const [workload, setWorkload] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [users, setUsers] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [funnelStages, setFunnelStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Bulk assign state
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [assignToUserId, setAssignToUserId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Transfer modal state
  const [transferModal, setTransferModal] = useState({ open: false, fromUserId: null });
  const [transferToUserId, setTransferToUserId] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
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
    loadInitialData();
  }, []);

  const loadWorkloadData = async () => {
    setLoading(true);
    try {
      const [workloadRes, unassignedRes] = await Promise.all([
        LeadsService.getWorkload(),
        LeadsService.getUnassigned(),
      ]);

      if (workloadRes?.success) setWorkload(workloadRes.data || []);
      if (unassignedRes?.success) setUnassigned(unassignedRes.data || []);
    } catch (e) {
      console.error('Error loading workload:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkloadData();
  }, []);

  const executives = useMemo(() => users.filter((u) => u.roleName === 'EXECUTIVE'), [users]);

  const getUserName = (userId) => {
    const user = users.find((u) => u._id === userId);
    return user?.fullName || 'Sin asignar';
  };

  const getBUName = (buId) => {
    const bu = businessUnits.find((b) => b._id === buId);
    return bu?.name || bu?.code || '—';
  };

  const getStageName = (stageId) => {
    const stage = funnelStages.find((s) => s._id === stageId);
    return stage?.name || '—';
  };

  const totalExecutives = executives.length;
  const totalOpenLeads = workload.reduce((sum, w) => sum + (w.openLeads || 0), 0);
  const avgPerExecutive = totalExecutives > 0 ? Math.round(totalOpenLeads / totalExecutives) : 0;
  const threshold = avgPerExecutive * 1.5;
  const overloadedCount = workload.filter((w) => w.openLeads > threshold).length;

  const maxOpenLeads = useMemo(() => {
    return Math.max(...workload.map((w) => w.openLeads || 0), 1);
  }, [workload]);

  const handleBulkAssign = async () => {
    if (selectedLeads.length === 0 || !assignToUserId) {
      setMessage('Selecciona leads y un ejecutivo destino.');
      return;
    }
    setAssigning(true);
    setMessage(null);
    try {
      const res = await LeadsService.bulkAssign({
        leadIds: selectedLeads,
        ownerUserId: assignToUserId,
      });
      if (res?.success) {
        setMessage(`${res.data?.modifiedCount || selectedLeads.length} leads asignados correctamente.`);
        setSelectedLeads([]);
        setAssignToUserId('');
        await loadWorkloadData();
      } else {
        setMessage(res?.message || 'Error al asignar leads');
      }
    } catch (e) {
      setMessage(e?.response?.data?.message || 'Error al asignar leads');
    } finally {
      setAssigning(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferModal.fromUserId || !transferToUserId) {
      setMessage('Selecciona ejecutivo destino.');
      return;
    }

    setTransferring(true);
    setMessage(null);
    try {
      // Get all open leads from source user
      const leadsRes = await LeadsService.getAll({ ownerUserId: transferModal.fromUserId, status: 'OPEN' });
      if (!leadsRes?.success || !leadsRes.data?.length) {
        setMessage('No hay leads para transferir.');
        setTransferring(false);
        return;
      }

      const leadIds = leadsRes.data.map((l) => l._id);
      const res = await LeadsService.bulkAssign({
        leadIds,
        ownerUserId: transferToUserId,
      });

      if (res?.success) {
        setMessage(`${res.data?.modifiedCount || leadIds.length} leads transferidos correctamente.`);
        setTransferModal({ open: false, fromUserId: null });
        setTransferToUserId('');
        await loadWorkloadData();
      } else {
        setMessage(res?.message || 'Error al transferir leads');
      }
    } catch (e) {
      setMessage(e?.response?.data?.message || 'Error al transferir leads');
    } finally {
      setTransferring(false);
    }
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const selectAllUnassigned = () => {
    if (selectedLeads.length === unassigned.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(unassigned.map((l) => l._id));
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Asignaciones</h1>
          <p className="text-xs text-slate-400">
            Gestión de carga de trabajo y asignación de leads.
          </p>
        </header>

        {message && (
          <div className="mb-4 rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Cargando datos…</p>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Ejecutivos</p>
                  <p className="text-2xl font-bold text-slate-100">{totalExecutives}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Sin asignar</p>
                  <p className="text-2xl font-bold text-amber-400">{unassigned.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Promedio/ejec.</p>
                  <p className="text-2xl font-bold text-blue-400">{avgPerExecutive}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Sobrecargados</p>
                  <p className="text-2xl font-bold text-red-400">{overloadedCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Workload by executive */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Carga de trabajo por ejecutivo</CardTitle>
              </CardHeader>
              <CardContent>
                {workload.length === 0 ? (
                  <p className="text-sm text-slate-400">No hay datos de carga de trabajo.</p>
                ) : (
                  <div className="space-y-4">
                    {workload.map((w) => {
                      const isOverloaded = w.openLeads > threshold;
                      const pct = Math.round((w.openLeads / maxOpenLeads) * 100);
                      return (
                        <div key={w._id || 'unassigned'} className="flex items-center gap-4">
                          <div className="w-40 truncate">
                            <p className="font-medium text-sm">{getUserName(w._id)}</p>
                          </div>
                          <div className="flex-1">
                            <div className="h-6 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isOverloaded ? 'bg-red-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-24 text-right text-sm">
                            <span className={isOverloaded ? 'text-red-400' : 'text-slate-300'}>
                              {w.openLeads} abiertos
                            </span>
                          </div>
                          <div className="w-20 text-right text-xs text-slate-500">
                            {w.wonLeads}W / {w.lostLeads}L
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setTransferModal({ open: true, fromUserId: w._id });
                              setTransferToUserId('');
                            }}
                            disabled={!w._id || w.openLeads === 0}
                          >
                            Transferir
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unassigned leads */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Leads sin asignar
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    ({unassigned.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unassigned.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-lg text-slate-300">✅ Todos los leads están asignados</p>
                  </div>
                ) : (
                  <>
                    {/* Bulk assign controls */}
                    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-800/50 p-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={selectAllUnassigned}
                      >
                        {selectedLeads.length === unassigned.length
                          ? 'Deseleccionar todos'
                          : 'Seleccionar todos'}
                      </Button>
                      <span className="text-sm text-slate-400">
                        {selectedLeads.length} seleccionados
                      </span>
                      <select
                        className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                        value={assignToUserId}
                        onChange={(e) => setAssignToUserId(e.target.value)}
                      >
                        <option value="">Asignar a...</option>
                        {executives.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.fullName}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleBulkAssign}
                        disabled={assigning || selectedLeads.length === 0 || !assignToUserId}
                      >
                        {assigning ? 'Asignando…' : 'Asignar seleccionados'}
                      </Button>
                    </div>

                    {/* Unassigned leads table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700 text-left text-slate-400">
                            <th className="pb-2 pr-4 w-10">
                              <input
                                type="checkbox"
                                checked={selectedLeads.length === unassigned.length}
                                onChange={selectAllUnassigned}
                                className="rounded border-slate-600 bg-slate-900"
                              />
                            </th>
                            <th className="pb-2 pr-4">Unidad</th>
                            <th className="pb-2 pr-4">Etapa</th>
                            <th className="pb-2 pr-4">Creado</th>
                            <th className="pb-2 pr-4">Monto est.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unassigned.map((lead) => (
                            <tr key={lead._id} className="border-b border-slate-800">
                              <td className="py-2 pr-4">
                                <input
                                  type="checkbox"
                                  checked={selectedLeads.includes(lead._id)}
                                  onChange={() => toggleLeadSelection(lead._id)}
                                  className="rounded border-slate-600 bg-slate-900"
                                />
                              </td>
                              <td className="py-2 pr-4 text-xs">{getBUName(lead.businessUnitId)}</td>
                              <td className="py-2 pr-4">{getStageName(lead.currentStageId)}</td>
                              <td className="py-2 pr-4 text-xs text-slate-400">
                                {new Date(lead.createdAt).toLocaleDateString('es-CL')}
                              </td>
                              <td className="py-2 pr-4 text-right font-mono text-xs">
                                {lead.estimatedAmount
                                  ? `$${lead.estimatedAmount.toLocaleString('es-CL')}`
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Transfer Modal */}
        {transferModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Transferir leads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-400">
                  Transferir todos los leads abiertos de{' '}
                  <strong>{getUserName(transferModal.fromUserId)}</strong> a otro ejecutivo:
                </p>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                  value={transferToUserId}
                  onChange={(e) => setTransferToUserId(e.target.value)}
                >
                  <option value="">Selecciona ejecutivo destino</option>
                  {executives
                    .filter((u) => u._id !== transferModal.fromUserId)
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.fullName}
                      </option>
                    ))}
                </select>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setTransferModal({ open: false, fromUserId: null });
                      setTransferToUserId('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleTransfer}
                    disabled={transferring || !transferToUserId}
                  >
                    {transferring ? 'Transfiriendo…' : 'Confirmar transferencia'}
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

export default AdminAssignments;
