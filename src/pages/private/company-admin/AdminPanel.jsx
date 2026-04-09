import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import CompaniesService from '../../../services/Companies.js';
import UsersService from '../../../services/Users.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import LeadsService from '../../../services/Leads.js';
import FunnelStagesService from '../../../services/FunnelStages.js';
import { FloatingAlert } from '../../../components/ui/floating-alert.jsx';

const TABS = ['empresa', 'usuarios', 'unidades', 'leads'];

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('empresa');
  const [company, setCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [error, setError] = useState(null);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userMessage, setUserMessage] = useState(null);
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    roleName: 'SUPERVISOR',
    businessUnitIds: [],
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    roleName: '',
    businessUnitIds: [],
  });
  const [savingUser, setSavingUser] = useState(false);

  const [businessUnits, setBusinessUnits] = useState([]);
  const [loadingBUs, setLoadingBUs] = useState(false);
  const [buMessage, setBuMessage] = useState(null);
  const [creatingBU, setCreatingBU] = useState(false);
  const [newBUCode, setNewBUCode] = useState('');
  const [newBUName, setNewBUName] = useState('');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedBUIds, setSelectedBUIds] = useState([]);
  const [assigningBUs, setAssigningBUs] = useState(false);

  // Leads tab state
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadStats, setLeadStats] = useState({ open: 0, wonThisMonth: 0, lostThisMonth: 0, atRisk: 0 });
  const [funnelStages, setFunnelStages] = useState([]);
  const [leadFilters, setLeadFilters] = useState({
    businessUnitId: '',
    ownerUserId: '',
    stageId: '',
    status: '',
  });
  const [reassignModal, setReassignModal] = useState({ open: false, leadId: null });
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [leadMessage, setLeadMessage] = useState(null);

  const session = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.data?.session || parsed?.session || null;
    } catch {
      return null;
    }
  }, []);

  const currentUser = useMemo(
    () => users.find((u) => u._id === selectedUserId),
    [users, selectedUserId]
  );

  useEffect(() => {
    const loadCompany = async () => {
      setLoadingCompany(true);
      setError(null);
      try {
        const res = await CompaniesService.getCurrent();
        if (res?.success) {
          setCompany(res.data);
        } else {
          setError(res?.message || 'No se pudo cargar la empresa');
        }
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Error al cargar empresa');
      } finally {
        setLoadingCompany(false);
      }
    };
    loadCompany();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await UsersService.getAll();
        if (res?.success && Array.isArray(res.data)) {
          setUsers(res.data);
          if (!selectedUserId && res.data[0]) {
            setSelectedUserId(res.data[0]._id);
          }
        } else {
          setUsers([]);
        }
      } catch {
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, [selectedUserId]);

  useEffect(() => {
    const loadBUs = async () => {
      setLoadingBUs(true);
      try {
        const res = await BusinessUnitsService.getAll();
        if (res?.success && Array.isArray(res.data)) {
          setBusinessUnits(res.data);
        } else {
          setBusinessUnits([]);
        }
      } catch {
        setBusinessUnits([]);
      } finally {
        setLoadingBUs(false);
      }
    };
    loadBUs();
  }, []);

  useEffect(() => {
    if (currentUser?.businessUnitIds?.length) {
      setSelectedBUIds(currentUser.businessUnitIds);
    } else {
      setSelectedBUIds([]);
    }
  }, [currentUser?._id]);

  // Load leads and stats
  useEffect(() => {
    if (activeTab !== 'leads') return;

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
  }, [activeTab, leadFilters]);

  // Load funnel stages
  useEffect(() => {
    if (activeTab !== 'leads') return;

    const loadStages = async () => {
      try {
        const res = await FunnelStagesService.getAll();
        if (res?.success && Array.isArray(res.data)) {
          setFunnelStages(res.data);
        }
      } catch {
        setFunnelStages([]);
      }
    };
    loadStages();
  }, [activeTab]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userForm.fullName.trim() || !userForm.email.trim() || !userForm.password) {
      setUserMessage('Completa nombre, email y contraseña.');
      return;
    }
    if ((userForm.roleName === 'EXECUTIVE' || userForm.roleName === 'SUPERVISOR') && userForm.businessUnitIds.length === 0) {
      setUserMessage('Selecciona al menos una unidad de negocio para este rol.');
      return;
    }
    setCreatingUser(true);
    setUserMessage(null);
    try {
      const res = await UsersService.create({
        fullName: userForm.fullName.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        roleName: userForm.roleName,
        businessUnitIds: userForm.businessUnitIds,
      });
      if (res?.success) {
        setUserMessage('Usuario creado correctamente.');
        setUserForm({ fullName: '', email: '', password: '', roleName: 'SUPERVISOR', businessUnitIds: [] });
        const refreshed = await UsersService.getAll();
        if (refreshed?.success && Array.isArray(refreshed.data)) {
          setUsers(refreshed.data);
        }
      } else {
        setUserMessage(res?.message || 'Error al crear usuario');
      }
    } catch (e) {
      setUserMessage(e?.response?.data?.message || e?.message || 'Error al crear usuario');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      roleName: user.roleName || 'EXECUTIVE',
      businessUnitIds: user.businessUnitIds || [],
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    setUserMessage(null);
    try {
      const res = await UsersService.update(editingUser._id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim().toLowerCase(),
        roleName: editForm.roleName,
        businessUnitIds: editForm.businessUnitIds,
      });
      if (res?.success) {
        setUserMessage('Usuario actualizado correctamente.');
        setEditingUser(null);
        const refreshed = await UsersService.getAll();
        if (refreshed?.success && Array.isArray(refreshed.data)) {
          setUsers(refreshed.data);
        }
      } else {
        setUserMessage(res?.message || 'Error al actualizar usuario');
      }
    } catch (e) {
      setUserMessage(e?.response?.data?.message || e?.message || 'Error al actualizar usuario');
    } finally {
      setSavingUser(false);
    }
  };

  const toggleUserFormBU = (buId) => {
    setUserForm((f) => ({
      ...f,
      businessUnitIds: f.businessUnitIds.includes(buId)
        ? f.businessUnitIds.filter((id) => id !== buId)
        : [...f.businessUnitIds, buId],
    }));
  };

  const toggleEditFormBU = (buId) => {
    setEditForm((f) => ({
      ...f,
      businessUnitIds: f.businessUnitIds.includes(buId)
        ? f.businessUnitIds.filter((id) => id !== buId)
        : [...f.businessUnitIds, buId],
    }));
  };

  const handleCreateBU = async (e) => {
    e.preventDefault();
    if (!newBUCode.trim() || !newBUName.trim()) return;
    setCreatingBU(true);
    setBuMessage(null);
    try {
      const res = await BusinessUnitsService.create({
        code: newBUCode.trim(),
        name: newBUName.trim(),
      });
      if (res?.success && res.data) {
        setBusinessUnits((prev) => [...prev, res.data]);
        setNewBUCode('');
        setNewBUName('');
        setBuMessage('Unidad de negocio creada.');
      } else {
        setBuMessage(res?.message || 'Error al crear unidad de negocio');
      }
    } catch (e) {
      setBuMessage(e?.response?.data?.message || e?.message || 'Error al crear unidad de negocio');
    } finally {
      setCreatingBU(false);
    }
  };

  const toggleBU = (buId) => {
    setSelectedBUIds((prev) =>
      prev.includes(buId) ? prev.filter((x) => x !== buId) : [...prev, buId]
    );
  };

  const handleAssignBUs = async () => {
    if (!selectedUserId) {
      setBuMessage('Selecciona un usuario.');
      return;
    }
    setAssigningBUs(true);
    setBuMessage(null);
    try {
      const res = await UsersService.assignBusinessUnits(selectedUserId, {
        businessUnitIds: selectedBUIds,
      });
      if (res?.success) {
        setBuMessage('Unidades de negocio asignadas correctamente.');
        const refreshed = await UsersService.getAll();
        if (refreshed?.success && Array.isArray(refreshed.data)) {
          setUsers(refreshed.data);
        }
      } else {
        setBuMessage(res?.message || 'Error al asignar unidades de negocio');
      }
    } catch (e) {
      setBuMessage(e?.response?.data?.message || e?.message || 'Error al asignar unidades');
    } finally {
      setAssigningBUs(false);
    }
  };

  const handleReassignLead = async () => {
    if (!reassignModal.leadId || !reassignUserId) {
      setLeadMessage('Selecciona un ejecutivo para reasignar.');
      return;
    }
    setReassigning(true);
    setLeadMessage(null);
    try {
      const res = await LeadsService.assign(reassignModal.leadId, { ownerUserId: reassignUserId });
      if (res?.success) {
        setLeadMessage('Lead reasignado correctamente.');
        setReassignModal({ open: false, leadId: null });
        setReassignUserId('');
        // Refresh leads
        const leadsRes = await LeadsService.getAll(leadFilters);
        if (leadsRes?.success && Array.isArray(leadsRes.data)) {
          setLeads(leadsRes.data);
        }
      } else {
        setLeadMessage(res?.message || 'Error al reasignar lead');
      }
    } catch (e) {
      setLeadMessage(e?.response?.data?.message || e?.message || 'Error al reasignar');
    } finally {
      setReassigning(false);
    }
  };

  const getUserName = (userId) => {
    const user = users.find((u) => u._id === userId);
    return user?.fullName || userId || '—';
  };

  const getBUName = (buId) => {
    const bu = businessUnits.find((b) => b._id === buId);
    return bu?.name || bu?.code || buId || '—';
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

  const renderTabs = () => (
    <div className="mb-4 flex gap-2 border-b border-slate-800">
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        const labels = {
          empresa: 'Empresa',
          usuarios: 'Usuarios',
          unidades: 'Unidades de negocio',
          leads: 'Leads',
        };
        return (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm border-b-2 ${
              isActive
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {labels[tab]}
          </button>
        );
      })}
    </div>
  );

  const renderEmpresa = () => (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de la empresa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-slate-400">Nombre:</span> {company?.name || '—'}
        </p>
        <p>
          <span className="text-slate-400">RUT:</span> {company?.rut || '—'}
        </p>
        <p>
          <span className="text-slate-400">Estado:</span> {company?.status || '—'}
        </p>
        <p className="text-xs text-slate-500">
          <span className="text-slate-400">ID:</span> {company?._id || session?.companyId || '—'}
        </p>
      </CardContent>
    </Card>
  );

  const renderUsuarios = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear nuevo usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="flex flex-col gap-4 max-w-md">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Nombre completo *</label>
              <Input
                value={userForm.fullName}
                onChange={(e) => setUserForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Nombre"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Email *</label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@empresa.com"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Contraseña *</label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Contraseña"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Rol</label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                value={userForm.roleName}
                onChange={(e) => setUserForm((f) => ({ ...f, roleName: e.target.value }))}
              >
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="EXECUTIVE">EXECUTIVE</option>
                <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
              </select>
            </div>
            {(userForm.roleName === 'EXECUTIVE' || userForm.roleName === 'SUPERVISOR') && (
              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Unidades de negocio *
                </label>
                {businessUnits.length === 0 ? (
                  <p className="text-xs text-amber-400">
                    No hay unidades de negocio. Crea una primero en la pestaña "Unidades de negocio".
                  </p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto rounded border border-slate-700 p-2">
                    {businessUnits.map((bu) => (
                      <label key={bu._id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={userForm.businessUnitIds.includes(bu._id)}
                          onChange={() => toggleUserFormBU(bu._id)}
                          className="rounded border-slate-600"
                        />
                        <span className="text-sm">{bu.code} — {bu.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            {userMessage && (
              <p className={`text-sm ${userMessage.includes('Error') || userMessage.includes('Selecciona') ? 'text-red-400' : 'text-emerald-400'}`}>
                {userMessage}
              </p>
            )}
            <Button type="submit" disabled={creatingUser}>
              {creatingUser ? 'Creando…' : 'Crear usuario'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios de la empresa</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <p className="text-sm text-slate-400">Cargando usuarios…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-400">No hay usuarios creados todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="pb-2 pr-4">Nombre</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Rol</th>
                    <th className="pb-2 pr-4">Unidades</th>
                    <th className="pb-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-slate-800">
                      <td className="py-2 pr-4">{u.fullName}</td>
                      <td className="py-2 pr-4">{u.email}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs ${
                          u.roleName === 'COMPANY_ADMIN' ? 'bg-purple-500/20 text-purple-300' :
                          u.roleName === 'SUPERVISOR' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-slate-600/30 text-slate-300'
                        }`}>
                          {u.roleName}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-400">
                        {Array.isArray(u.businessUnitIds) && u.businessUnitIds.length > 0
                          ? u.businessUnitIds.map((id) => getBUName(id)).join(', ')
                          : '—'}
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditUser(u)}
                        >
                          Editar
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Editar usuario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Nombre completo</label>
                <Input
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Email</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Rol</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                  value={editForm.roleName}
                  onChange={(e) => setEditForm((f) => ({ ...f, roleName: e.target.value }))}
                >
                  <option value="SUPERVISOR">SUPERVISOR</option>
                  <option value="EXECUTIVE">EXECUTIVE</option>
                  <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Unidades de negocio</label>
                <div className="space-y-1 max-h-32 overflow-y-auto rounded border border-slate-700 p-2">
                  {businessUnits.map((bu) => (
                    <label key={bu._id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={editForm.businessUnitIds.includes(bu._id)}
                        onChange={() => toggleEditFormBU(bu._id)}
                        className="rounded border-slate-600"
                      />
                      <span className="text-sm">{bu.code} — {bu.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveUser}
                  disabled={savingUser}
                >
                  {savingUser ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderUnidades = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear nueva unidad de negocio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateBU} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Código</label>
              <Input
                value={newBUCode}
                onChange={(e) => setNewBUCode(e.target.value)}
                placeholder="BU01"
                className="w-28"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Nombre</label>
              <Input
                value={newBUName}
                onChange={(e) => setNewBUName(e.target.value)}
                placeholder="Unidad Norte"
                className="w-40"
              />
            </div>
            <Button type="submit" disabled={creatingBU}>
              {creatingBU ? 'Creando…' : 'Crear unidad'}
            </Button>
          </form>
          {buMessage && <p className="text-sm text-emerald-400">{buMessage}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unidades de negocio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingBUs ? (
            <p className="text-sm text-slate-400">Cargando unidades…</p>
          ) : businessUnits.length === 0 ? (
            <p className="text-sm text-slate-400">No hay unidades creadas todavía.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {businessUnits.map((bu) => (
                <li key={bu._id}>
                  <span className="text-slate-100">{bu.code}</span>{' '}
                  <span className="text-slate-400">— {bu.name}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Asignar unidades de negocio a usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Usuario</label>
              <select
                className="flex h-10 min-w-[220px] rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers}
              >
                <option value="">Selecciona usuario</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.fullName} ({u.email}) — {u.roleName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-400">
              Marca las unidades de negocio que quieres asignar al usuario seleccionado:
            </p>
            {loadingBUs ? (
              <p className="text-sm text-slate-500">Cargando…</p>
            ) : businessUnits.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay unidades. Crea una arriba y vuelve a asignar.
              </p>
            ) : (
              <ul className="space-y-1">
                {businessUnits.map((bu) => (
                  <li key={bu._id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBUIds.includes(bu._id)}
                      onChange={() => toggleBU(bu._id)}
                      className="rounded border-slate-600 bg-slate-900"
                    />
                    <span className="text-sm">
                      {bu.code} — {bu.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button onClick={handleAssignBUs} disabled={assigningBUs || !selectedUserId}>
            {assigningBUs ? 'Asignando…' : 'Asignar unidades de negocio'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderLeads = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <Card>
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
              {users
                .filter((u) => u.roleName === 'EXECUTIVE')
                .map((u) => (
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
            Leads de la empresa{' '}
            <span className="text-sm font-normal text-slate-400">({leads.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leadMessage && (
            <div className="mb-4 rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
              {leadMessage}
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
                          {lead.status}
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
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mr-1"
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
                {users
                  .filter((u) => u.roleName === 'EXECUTIVE')
                  .map((u) => (
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
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <FloatingAlert message={error} onDismiss={() => setError(null)} variant="error" />
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {company?.name || 'Panel de administración'}
          </h1>
          <p className="text-xs text-slate-400">
            Configuración de tu empresa: usuarios y unidades de negocio.
          </p>
        </header>

        {loadingCompany ? (
          <p className="text-sm text-slate-400">Cargando empresa…</p>
        ) : (
          <>
            {renderTabs()}
            {activeTab === 'empresa' && renderEmpresa()}
            {activeTab === 'usuarios' && renderUsuarios()}
            {activeTab === 'unidades' && renderUnidades()}
            {activeTab === 'leads' && renderLeads()}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;

