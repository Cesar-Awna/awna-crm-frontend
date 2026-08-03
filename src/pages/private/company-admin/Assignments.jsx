import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import UsersService from '../../../services/Users.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import { getStatusLabel } from '../../../lib/leadFormMappers.js';
import { getStoredSession } from '../../../lib/session.js';
import { Upload, Download } from 'lucide-react';

const FALLBACK_WON     = ['CERRADO_GANADO'];
const FALLBACK_LOST    = ['CERRADO_PERDIDO'];
const FALLBACK_CLOSED  = ['CERRADO_GANADO', 'CERRADO_PERDIDO', 'DATO_ERRADO'];

const getStageTypeSets = (businessUnits) => {
  const wonSet  = new Set(FALLBACK_WON);
  const lostSet = new Set(FALLBACK_LOST);
  const closedSet = new Set(FALLBACK_CLOSED);
  for (const bu of businessUnits) {
    if (!bu.pipelineStages?.length) continue;
    const hasTerminal = bu.pipelineStages.some((s) => s.stageType && s.stageType !== 'open');
    if (!hasTerminal) continue;
    for (const stage of bu.pipelineStages) {
      if (stage.stageType === 'won')     { wonSet.add(stage.key);  closedSet.add(stage.key); }
      if (stage.stageType === 'lost')    { lostSet.add(stage.key); closedSet.add(stage.key); }
      if (stage.stageType === 'invalid') { closedSet.add(stage.key); }
    }
  }
  return { wonSet, lostSet, closedSet };
};

/* ── CSV helpers ── */
function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVRow(lines[i]);
    if (values.every((v) => !v)) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    rows.push(row);
  }
  return { headers, rows };
}

function csvRowToFields(row, schema) {
  const fields = {};
  for (const field of schema) {
    const val = row[field.label] ?? row[field.key] ?? '';
    if (val !== '') fields[field.key] = val;
  }
  return fields;
}

const AdminAssignments = () => {
  const [unassigned, setUnassigned]       = useState([]);
  const [allLeads, setAllLeads]           = useState([]);
  const [users, setUsers]                 = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [schema, setSchema]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [message, setMessage]             = useState(null);

  const [selectedLeads, setSelectedLeads]     = useState([]);
  const [assignToUserId, setAssignToUserId]   = useState('');
  const [assigning, setAssigning]             = useState(false);

  const [transferModal, setTransferModal]     = useState({ open: false, fromUserId: null });
  const [transferToUserId, setTransferToUserId] = useState('');
  const [transferring, setTransferring]       = useState(false);

  const [importPreview, setImportPreview]     = useState([]);
  const [importModal, setImportModal]         = useState(false);
  const [importing, setImporting]             = useState(false);
  const fileInputRef                          = useRef(null);

  /* ── initial load ── */
  useEffect(() => {
    const session = getStoredSession();
    const buId = session?.businessUnitIds?.[0];

    const loadInitialData = async () => {
      try {
        const [usersRes, busRes] = await Promise.all([
          UsersService.getExecutives({ limit: 1000 }),
          BusinessUnitsService.getAll(),
        ]);
        if (usersRes?.success) setUsers(usersRes.data || []);
        if (busRes?.success)   setBusinessUnits(busRes.data || []);
      } catch (e) {
        console.error('Error loading initial data:', e);
      }
    };

    const loadSchema = async () => {
      if (!buId) return;
      try {
        const res = await BusinessUnitsService.getSchema(buId);
        if (res?.success) setSchema(res.data.leadSchema || []);
      } catch { /* schema stays empty */ }
    };

    loadInitialData();
    loadSchema();
  }, []);

  const loadWorkloadData = async () => {
    setLoading(true);
    try {
      const [unassignedRes, allRes] = await Promise.all([
        LeadsService.getUnassigned(),
        LeadsService.getAll(),
      ]);
      if (unassignedRes?.success) setUnassigned(unassignedRes.data || []);
      if (allRes?.success)        setAllLeads(allRes.data || []);
    } catch (e) {
      console.error('Error loading workload:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWorkloadData(); }, []);

  const executives = users;

  const getUserName  = (uid) => users.find((u) => u._id === uid)?.fullName || 'Sin asignar';
  const getBUName    = (buId) => { const bu = businessUnits.find((b) => b._id === buId); return bu?.name || bu?.code || '—'; };
  const getLeadField = (lead, key) => lead.fields?.[key] ?? lead[key] ?? '—';

  /* ── workload aggregation ── */
  const workload = useMemo(() => {
    const { wonSet, lostSet, closedSet } = getStageTypeSets(businessUnits);
    const map = new Map();
    for (const lead of allLeads) {
      const uid = lead.ownerUserId;
      if (!uid) continue;
      if (!map.has(uid)) map.set(uid, { _id: uid, openLeads: 0, wonLeads: 0, lostLeads: 0 });
      const agg = map.get(uid);
      if (!closedSet.has(lead.status)) agg.openLeads += 1;
      if (wonSet.has(lead.status))     agg.wonLeads  += 1;
      if (lostSet.has(lead.status))    agg.lostLeads += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.openLeads - a.openLeads);
  }, [allLeads, businessUnits]);

  const totalExecutives  = executives.length;
  const totalOpenLeads   = workload.reduce((s, w) => s + w.openLeads, 0);
  const avgPerExecutive  = totalExecutives > 0 ? Math.round(totalOpenLeads / totalExecutives) : 0;
  const threshold        = avgPerExecutive * 1.5;
  const overloadedCount  = workload.filter((w) => w.openLeads > threshold).length;
  const maxOpenLeads     = Math.max(...workload.map((w) => w.openLeads), 1);

  /* ── bulk assign ── */
  const handleBulkAssign = async () => {
    if (!selectedLeads.length || !assignToUserId) {
      setMessage('Selecciona leads y un ejecutivo destino.');
      return;
    }
    setAssigning(true);
    setMessage(null);
    try {
      const res = await LeadsService.bulkAssign({ leadIds: selectedLeads, ownerUserId: assignToUserId });
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

  /* ── transfer ── */
  const handleTransfer = async () => {
    if (!transferModal.fromUserId || !transferToUserId) { setMessage('Selecciona ejecutivo destino.'); return; }
    setTransferring(true);
    setMessage(null);
    try {
      const { closedSet: transferClosedSet } = getStageTypeSets(businessUnits);
      const leadsToTransfer = allLeads.filter(
        (l) => l.ownerUserId === transferModal.fromUserId && !transferClosedSet.has(l.status)
      );
      if (!leadsToTransfer.length) {
        setMessage('No hay leads en gestión para transferir.');
        setTransferring(false);
        return;
      }
      const res = await LeadsService.bulkAssign({
        leadIds: leadsToTransfer.map((l) => l._id),
        ownerUserId: transferToUserId,
      });
      if (res?.success) {
        setMessage(`${res.data?.modifiedCount || leadsToTransfer.length} leads transferidos correctamente.`);
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

  /* ── CSV import ── */
  const downloadTemplate = () => {
    if (!schema.length) return;
    const headers = schema.map((f) => f.label).join(',');
    const blob = new Blob([headers + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'plantilla_leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows } = parseCSV(ev.target.result);
      const mapped = rows
        .map((row) => ({ fields: csvRowToFields(row, schema) }))
        .filter((l) => Object.keys(l.fields).length > 0);
      setImportPreview(mapped);
      setImportModal(true);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!importPreview.length) return;
    setImporting(true);
    setMessage(null);
    try {
      const res = await LeadsService.bulkImport({ leads: importPreview });
      if (res?.success) {
        setMessage(`${res.data?.count || importPreview.length} leads importados correctamente.`);
        setImportModal(false);
        setImportPreview([]);
        await loadWorkloadData();
      } else {
        setMessage(res?.message || 'Error al importar.');
      }
    } catch {
      setMessage('Error inesperado al importar.');
    } finally {
      setImporting(false);
    }
  };

  /* ── selection helpers ── */
  const toggleLeadSelection = (leadId) =>
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );

  const selectAllUnassigned = () =>
    setSelectedLeads(selectedLeads.length === unassigned.length ? [] : unassigned.map((l) => l._id));

  /* ── preview table columns (schema labels, max 4) ── */
  const previewCols = schema.filter((f) => f.type !== 'textarea').slice(0, 4);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">

        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Asignaciones</h1>
            <p className="text-xs text-slate-400">Gestión de carga de trabajo y asignación de leads.</p>
          </div>
          {schema.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
                <Download size={14} /> Descargar plantilla
              </Button>
              <Button size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                <Upload size={14} /> Importar CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </header>

        {message && (
          <div className="mb-4 rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
            {typeof message === 'string' ? message : JSON.stringify(message)}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Cargando datos…</p>
        ) : (
          <>
            {/* ── KPIs ── */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card><CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Ejecutivos</p>
                <p className="text-2xl font-bold text-slate-100">{totalExecutives}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Sin asignar</p>
                <p className="text-2xl font-bold text-amber-400">{unassigned.length}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Promedio/ejec.</p>
                <p className="text-2xl font-bold text-sky-400">{avgPerExecutive}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Sobrecargados</p>
                <p className="text-2xl font-bold text-rose-400">{overloadedCount}</p>
              </CardContent></Card>
            </div>

            {/* ── Workload bars ── */}
            <Card className="mb-6">
              <CardHeader><CardTitle>Carga de trabajo por ejecutivo</CardTitle></CardHeader>
              <CardContent>
                {workload.length === 0 ? (
                  <p className="text-sm text-slate-400">No hay datos de carga de trabajo.</p>
                ) : (
                  <div className="space-y-4">
                    {workload.map((w) => {
                      const isOverloaded = w.openLeads > threshold;
                      const pct = Math.round((w.openLeads / maxOpenLeads) * 100);
                      return (
                        <div key={w._id} className="flex items-center gap-4">
                          <div className="w-40 truncate">
                            <p className="text-sm font-medium">{getUserName(w._id)}</p>
                          </div>
                          <div className="flex-1">
                            <div className="h-6 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className={`h-full rounded-full transition-all ${isOverloaded ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-28 text-right text-sm">
                            <span className={isOverloaded ? 'text-rose-400' : 'text-slate-300'}>
                              {w.openLeads} en gestión
                            </span>
                          </div>
                          <div className="w-20 text-right text-xs text-slate-500">
                            {w.wonLeads}G / {w.lostLeads}P
                          </div>
                          <Button
                            type="button" size="sm" variant="outline"
                            onClick={() => { setTransferModal({ open: true, fromUserId: w._id }); setTransferToUserId(''); }}
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

            {/* ── Unassigned leads ── */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Leads sin asignar
                  <span className="ml-2 text-sm font-normal text-slate-400">({unassigned.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unassigned.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-lg text-slate-300">✅ Todos los leads están asignados</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-800/50 p-3">
                      <Button type="button" size="sm" variant="outline" onClick={selectAllUnassigned}>
                        {selectedLeads.length === unassigned.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </Button>
                      <span className="text-sm text-slate-400">{selectedLeads.length} seleccionados</span>
                      <select
                        className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
                        value={assignToUserId}
                        onChange={(e) => setAssignToUserId(e.target.value)}
                      >
                        <option value="">Asignar a...</option>
                        {executives.map((u) => (
                          <option key={u._id} value={u._id}>{u.fullName}</option>
                        ))}
                      </select>
                      <Button
                        type="button" size="sm" onClick={handleBulkAssign}
                        disabled={assigning || !selectedLeads.length || !assignToUserId}
                      >
                        {assigning ? 'Asignando…' : 'Asignar seleccionados'}
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700 text-left text-slate-400">
                            <th className="w-10 pb-2 pr-4">
                              <input
                                type="checkbox"
                                checked={selectedLeads.length === unassigned.length}
                                onChange={selectAllUnassigned}
                                className="rounded border-slate-600 bg-slate-900"
                              />
                            </th>
                            {previewCols.length > 0
                              ? previewCols.map((f) => <th key={f.key} className="pb-2 pr-4">{f.label}</th>)
                              : <>
                                  <th className="pb-2 pr-4">Razón Social</th>
                                  <th className="pb-2 pr-4">RUT</th>
                                  <th className="pb-2 pr-4">Contacto</th>
                                </>
                            }
                            <th className="pb-2 pr-4">Unidad</th>
                            <th className="pb-2 pr-4">Estado</th>
                            <th className="pb-2 pr-4">Creado</th>
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
                              {previewCols.length > 0
                                ? previewCols.map((f) => (
                                    <td key={f.key} className="py-2 pr-4 text-xs">{getLeadField(lead, f.key)}</td>
                                  ))
                                : <>
                                    <td className="py-2 pr-4 text-xs">{lead.razonSocial || '—'}</td>
                                    <td className="py-2 pr-4 font-mono text-xs">{lead.rutEmpresa || '—'}</td>
                                    <td className="py-2 pr-4 text-xs">{lead.contactName || '—'}</td>
                                  </>
                              }
                              <td className="py-2 pr-4 text-xs">{getBUName(lead.businessUnitId)}</td>
                              <td className="py-2 pr-4 text-xs">{getStatusLabel(lead.status)}</td>
                              <td className="py-2 pr-4 text-xs text-slate-400">
                                {new Date(lead.createdAt).toLocaleDateString('es-CL')}
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

        {/* ── Transfer modal ── */}
        {transferModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <Card className="w-full max-w-md">
              <CardHeader><CardTitle>Transferir leads</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-400">
                  Transferir todos los leads en gestión de{' '}
                  <strong>{getUserName(transferModal.fromUserId)}</strong> a otro ejecutivo:
                </p>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                  value={transferToUserId}
                  onChange={(e) => setTransferToUserId(e.target.value)}
                >
                  <option value="">Selecciona ejecutivo destino</option>
                  {executives.filter((u) => u._id !== transferModal.fromUserId).map((u) => (
                    <option key={u._id} value={u._id}>{u.fullName}</option>
                  ))}
                </select>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline"
                    onClick={() => { setTransferModal({ open: false, fromUserId: null }); setTransferToUserId(''); }}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleTransfer} disabled={transferring || !transferToUserId}>
                    {transferring ? 'Transfiriendo…' : 'Confirmar transferencia'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── CSV import preview modal ── */}
        {importModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <Card className="flex max-h-[80vh] w-full max-w-3xl flex-col">
              <CardHeader>
                <CardTitle>Vista previa de importación</CardTitle>
                <p className="text-sm text-slate-400">
                  Se importarán <strong className="text-slate-200">{importPreview.length}</strong> leads
                  como sin asignar. Revisa los primeros registros:
                </p>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {previewCols.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-left text-slate-400">
                          {previewCols.map((f) => (
                            <th key={f.key} className="pb-2 pr-4">{f.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.slice(0, 8).map((lead, idx) => (
                          <tr key={idx} className="border-b border-slate-800">
                            {previewCols.map((f) => (
                              <td key={f.key} className="py-2 pr-4 text-xs text-slate-300">
                                {lead.fields[f.key] || <span className="text-slate-600">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.length > 8 && (
                      <p className="mt-2 text-xs text-slate-500">
                        …y {importPreview.length - 8} registros más.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">{importPreview.length} filas detectadas.</p>
                )}
              </CardContent>
              <div className="flex justify-end gap-2 border-t border-slate-800 p-4">
                <Button variant="outline" onClick={() => { setImportModal(false); setImportPreview([]); }}>
                  Cancelar
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? 'Importando…' : `Importar ${importPreview.length} leads`}
                </Button>
              </div>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminAssignments;
