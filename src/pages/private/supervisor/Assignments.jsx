import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import UsersService from '../../../services/Users.js';
import LeadsService from '../../../services/Leads.js';
import { FloatingAlert } from '../../../components/ui/floating-alert.jsx';

const getField = (lead, key) => lead?.fields?.[key] ?? lead?.[key] ?? '—';

const Assignments = () => {
  const [tab, setTab] = useState('leads');

  // ── Lead assignment state ─────────────────────────────────────────────────
  const [unassigned, setUnassigned]   = useState([]);
  const [executives, setExecutives]   = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [targetExecId, setTargetExecId] = useState('');
  const [assigning, setAssigning]     = useState(false);

  // ── Create executive state ────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingUser, setCreatingUser]       = useState(false);
  const [createForm, setCreateForm]           = useState({ fullName: '', email: '', password: '', phone: '' });

  // ── Alerts ────────────────────────────────────────────────────────────────
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(null);

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000); };

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadLeads = async () => {
    setLoadingLeads(true);
    try {
      const [leadsRes, execsRes] = await Promise.all([
        LeadsService.getUnassigned(),
        UsersService.getExecutives(),
      ]);
      if (leadsRes?.success) setUnassigned(leadsRes.data || []);
      if (execsRes?.success) setExecutives(execsRes.data || []);
    } catch (e) {
      setError('Error al cargar datos');
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleAll = () => {
    if (selectedIds.size === unassigned.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unassigned.map((l) => l._id)));
    }
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Assign ────────────────────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!targetExecId) { setError('Selecciona un ejecutivo primero.'); return; }
    if (selectedIds.size === 0) { setError('Selecciona al menos un lead.'); return; }

    setAssigning(true);
    setError(null);
    try {
      const res = await LeadsService.bulkAssign({
        leadIds: [...selectedIds],
        ownerUserId: targetExecId,
      });
      if (res?.success) {
        showSuccess(`${selectedIds.size} lead(s) asignados correctamente.`);
        setSelectedIds(new Set());
        await loadLeads();
      } else {
        setError(res?.message || 'Error al asignar leads');
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Error al asignar leads');
    } finally {
      setAssigning(false);
    }
  };

  // ── Create executive ──────────────────────────────────────────────────────
  const handleCreateExecutive = async (e) => {
    e.preventDefault();
    if (!createForm.fullName?.trim() || !createForm.email?.trim() || !createForm.password) {
      setError('Nombre, email y contraseña son obligatorios.');
      return;
    }
    setCreatingUser(true);
    setError(null);
    try {
      const res = await UsersService.createExecutive({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        phone: createForm.phone?.trim() || undefined,
      });
      if (res?.success) {
        setShowCreateModal(false);
        setCreateForm({ fullName: '', email: '', password: '', phone: '' });
        showSuccess('Ejecutivo creado correctamente.');
        await loadLeads();
      } else {
        setError(res?.message || 'Error al crear ejecutivo');
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Error al crear ejecutivo');
    } finally {
      setCreatingUser(false);
    }
  };

  const execName = executives.find((e) => e._id === targetExecId)?.fullName || '';

  return (
    <div className="flex min-h-screen bg-(--app-bg) text-(--app-fg)">
      <FloatingAlert message={error}   onDismiss={() => setError(null)}   variant="error" />
      <FloatingAlert message={success} onDismiss={() => setSuccess(null)} variant="success" />
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Asignaciones</h1>
            <p className="text-xs text-slate-400">Distribuye leads entre tus ejecutivos.</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>+ Agregar ejecutivo</Button>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-slate-800">
          {[
            { key: 'leads', label: `Leads sin asignar (${unassigned.length})` },
            { key: 'team',  label: `Mi equipo (${executives.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Leads sin asignar ── */}
        {tab === 'leads' && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="flex-1">Leads sin asignar</CardTitle>
                {/* Executive picker + assign button */}
                <select
                  value={targetExecId}
                  onChange={(e) => setTargetExecId(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">Seleccionar ejecutivo…</option>
                  {executives.map((ex) => (
                    <option key={ex._id} value={ex._id}>{ex.fullName}</option>
                  ))}
                </select>
                <Button
                  disabled={assigning || selectedIds.size === 0 || !targetExecId}
                  onClick={handleAssign}
                  className="whitespace-nowrap"
                >
                  {assigning
                    ? 'Asignando…'
                    : selectedIds.size > 0
                      ? `Asignar ${selectedIds.size} a ${execName || '…'}`
                      : 'Asignar seleccionados'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingLeads ? (
                <p className="py-8 text-center text-sm text-slate-400">Cargando leads…</p>
              ) : unassigned.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No hay leads sin asignar.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-xs text-slate-400">
                        <th className="pb-2 pr-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === unassigned.length && unassigned.length > 0}
                            onChange={toggleAll}
                            className="accent-sky-500"
                          />
                        </th>
                        <th className="pb-2 pr-4">Razón Social / Nombre</th>
                        <th className="pb-2 pr-4">Contacto</th>
                        <th className="pb-2 pr-4">Teléfono</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassigned.map((lead) => {
                        const name    = getField(lead, 'razonSocial') !== '—'
                          ? getField(lead, 'razonSocial')
                          : getField(lead, 'nombre');
                        const contact = getField(lead, 'nombreContacto') !== '—'
                          ? getField(lead, 'nombreContacto')
                          : getField(lead, 'nombre');
                        const phone   = getField(lead, 'telefono');
                        const checked = selectedIds.has(lead._id);
                        return (
                          <tr
                            key={lead._id}
                            onClick={() => toggleOne(lead._id)}
                            className={`cursor-pointer border-b border-slate-800/60 transition-colors hover:bg-slate-800/40 ${checked ? 'bg-sky-500/10' : ''}`}
                          >
                            <td className="py-2.5 pr-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleOne(lead._id)}
                                onClick={(e) => e.stopPropagation()}
                                className="accent-sky-500"
                              />
                            </td>
                            <td className="py-2.5 pr-4 font-medium text-slate-100">{name}</td>
                            <td className="py-2.5 pr-4 text-slate-400">{contact}</td>
                            <td className="py-2.5 pr-4 text-slate-400">{phone}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Mi equipo ── */}
        {tab === 'team' && (
          <Card>
            <CardHeader><CardTitle>Ejecutivos en tu equipo</CardTitle></CardHeader>
            <CardContent>
              {executives.length === 0 ? (
                <p className="py-4 text-sm text-slate-400">No tienes ejecutivos asignados aún.</p>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {executives.map((ex) => (
                    <li key={ex._id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{ex.fullName}</p>
                        <p className="text-xs text-slate-400">{ex.email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Create Executive Modal ── */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h2 className="text-lg font-semibold">Nuevo ejecutivo</h2>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateForm({ fullName: '', email: '', password: '', phone: '' }); setError(null); }}
                  className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
                >×</button>
              </div>
              <form onSubmit={handleCreateExecutive} className="px-6 py-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Nombre completo *</label>
                  <Input value={createForm.fullName} onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Nombre completo" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Email *</label>
                  <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="usuario@empresa.com" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Teléfono</label>
                  <Input value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+56 9 1234 5678" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Contraseña *</label>
                  <Input type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Contraseña" required />
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded px-3 py-2 text-xs text-blue-300">
                  Este ejecutivo se asignará automáticamente a tu equipo y unidad de negocio.
                </div>
                <div className="flex gap-2 border-t border-slate-800 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); setCreateForm({ fullName: '', email: '', password: '', phone: '' }); setError(null); }} className="flex-1">Cancelar</Button>
                  <Button type="submit" disabled={creatingUser} className="flex-1">{creatingUser ? 'Creando…' : 'Crear ejecutivo'}</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Assignments;
