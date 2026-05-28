import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import UsersService from '../../../services/Users.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import { FloatingAlert } from '../../../components/ui/floating-alert.jsx';
import { usePagination } from '../../../hooks/usePagination.js';
import PaginationControls from '../../../components/PaginationControls.jsx';

const ROLE_COLORS = {
  COMPANY_ADMIN: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  SUPERVISOR:   'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  EXECUTIVE:    'bg-sky-500/20 text-sky-300 border border-sky-500/30',
};

const EMPTY_USER = {
  fullName: '', email: '', password: '', roleName: 'EXECUTIVE', phone: '', supervisorId: '',
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const pagination = usePagination(1, 20);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_USER);
  const [creatingUser, setCreatingUser] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_USER);
  const [editingId, setEditingId] = useState(false);

  const [pwdModal, setPwdModal] = useState({ open: false, userId: null });
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [changingPwd, setChangingPwd] = useState(false);

  const [buAssignModal, setBuAssignModal] = useState({ open: false, userId: null });
  const [selectedBUs, setSelectedBUs] = useState([]);
  const [assigningBUs, setAssigningBUs] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await UsersService.getAll({
        page: pagination.currentPage,
        limit: pagination.limit,
      });
      if (res?.success && Array.isArray(res.data)) {
        setUsers(res.data);
        pagination.updatePaginationData(res.pagination);
      } else {
        setError(res?.message || 'Error al cargar usuarios');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessUnits = async () => {
    try {
      const res = await BusinessUnitsService.getAll();
      if (res?.success && Array.isArray(res.data)) {
        setBusinessUnits(res.data);
      }
    } catch (e) {
      console.error('Error loading BUs:', e);
    }
  };

  const loadSupervisors = async () => {
    try {
      const res = await UsersService.getSupervisors({ page: 1, limit: 1000 });
      if (res?.success && Array.isArray(res.data)) {
        setSupervisors(res.data);
      }
    } catch (e) {
      console.error('Error loading supervisors:', e);
    }
  };

  useEffect(() => {
    loadUsers();
    loadBusinessUnits();
    loadSupervisors();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [pagination.currentPage, pagination.limit]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createForm.fullName?.trim() || !createForm.email?.trim() || !createForm.password) {
      setError('Nombre, email y contraseña son obligatorios.');
      return;
    }
    setCreatingUser(true);
    setError(null);
    try {
      const payload = {
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        roleName: createForm.roleName,
        phone: createForm.phone?.trim() || undefined,
      };
      if (createForm.roleName === 'EXECUTIVE' && createForm.supervisorId) {
        payload.supervisorId = createForm.supervisorId;
      }
      const res = await UsersService.create(payload);
      if (res?.success) {
        setShowCreateModal(false);
        setCreateForm(EMPTY_USER);
        setSuccessMsg('Usuario creado correctamente.');
        setTimeout(() => setSuccessMsg(null), 4000);
        loadUsers();
      } else {
        setError(res?.message || 'Error al crear usuario');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Error al crear usuario');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editForm.fullName?.trim() || !editForm.email?.trim()) {
      setError('Nombre y email son obligatorios.');
      return;
    }
    setEditingId(true);
    setError(null);
    try {
      const res = await UsersService.update(editingUser._id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim().toLowerCase(),
        phone: editForm.phone?.trim() || undefined,
      });
      if (res?.success) {
        setEditingUser(null);
        setSuccessMsg('Usuario actualizado correctamente.');
        setTimeout(() => setSuccessMsg(null), 4000);
        loadUsers();
      } else {
        setError(res?.message || 'Error al actualizar usuario');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Error al actualizar usuario');
    } finally {
      setEditingId(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('¿Confirmas eliminar este usuario?')) return;
    setError(null);
    try {
      const res = await UsersService.delete(userId);
      if (res?.success) {
        setSuccessMsg('Usuario eliminado correctamente.');
        setTimeout(() => setSuccessMsg(null), 4000);
        loadUsers();
      } else {
        setError(res?.message || 'Error al eliminar usuario');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Error al eliminar usuario');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwdForm.newPwd || pwdForm.newPwd !== pwdForm.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setChangingPwd(true);
    setError(null);
    try {
      const res = await UsersService.update(pwdModal.userId, {
        passwordHash: pwdForm.newPwd,
      });
      if (res?.success) {
        setPwdModal({ open: false, userId: null });
        setPwdForm({ current: '', newPwd: '', confirm: '' });
        setSuccessMsg('Contraseña actualizada correctamente.');
        setTimeout(() => setSuccessMsg(null), 4000);
        loadUsers();
      } else {
        setError(res?.message || 'Error al cambiar contraseña');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Error al cambiar contraseña');
    } finally {
      setChangingPwd(false);
    }
  };

  const handleAssignBUs = async () => {
    if (!buAssignModal.userId) return;
    setAssigningBUs(true);
    setError(null);
    try {
      const res = await UsersService.assignBusinessUnits(buAssignModal.userId, {
        businessUnitIds: selectedBUs,
      });
      if (res?.success) {
        setBuAssignModal({ open: false, userId: null });
        setSelectedBUs([]);
        setSuccessMsg('Unidades de negocio asignadas.');
        setTimeout(() => setSuccessMsg(null), 4000);
        loadUsers();
      } else {
        setError(res?.message || 'Error al asignar unidades');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Error al asignar unidades');
    } finally {
      setAssigningBUs(false);
    }
  };

  const openBuAssignModal = (user) => {
    setBuAssignModal({ open: true, userId: user._id });
    setSelectedBUs(user.businessUnitIds || []);
  };

  const toggleBU = (buId) => {
    setSelectedBUs((prev) =>
      prev.includes(buId) ? prev.filter((x) => x !== buId) : [...prev, buId]
    );
  };

  const adminCount = users.filter((u) => u.roleName === 'COMPANY_ADMIN').length;
  const supervisorCount = users.filter((u) => u.roleName === 'SUPERVISOR').length;
  const executiveCount = users.filter((u) => u.roleName === 'EXECUTIVE').length;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <FloatingAlert message={error} onDismiss={() => setError(null)} variant="error" />
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
            <p className="text-xs text-slate-400">Gestión de ejecutivos y supervisores de tu empresa.</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>+ Nuevo usuario</Button>
        </header>

        {successMsg && (
          <div className="mb-4 rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300 border border-emerald-500/30">
            {successMsg}
          </div>
        )}

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase text-slate-400">Total usuarios</p>
              <p className="text-2xl font-bold text-slate-100">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase text-slate-400">Administradores</p>
              <p className="text-2xl font-bold text-purple-400">{adminCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase text-slate-400">Supervisores</p>
              <p className="text-2xl font-bold text-blue-400">{supervisorCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase text-slate-400">Ejecutivos</p>
              <p className="text-2xl font-bold text-sky-400">{executiveCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Listado de usuarios{' '}
              <span className="text-sm font-normal text-slate-400">({users.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Cargando…</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-400">No hay usuarios. Crea uno con el botón superior.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="pb-2 pr-4">Nombre</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">Teléfono</th>
                      <th className="pb-2 pr-4">Rol</th>
                      <th className="pb-2 pr-4">Unidades</th>
                      <th className="pb-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b border-slate-800 hover:bg-slate-800/30">
                        <td className="py-2 pr-4 font-medium">{u.fullName}</td>
                        <td className="py-2 pr-4 text-slate-400">{u.email}</td>
                        <td className="py-2 pr-4 text-slate-400">{u.phone || '—'}</td>
                        <td className="py-2 pr-4">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.roleName] || 'bg-slate-600/30 text-slate-300'}`}>
                            {u.roleName}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-slate-400">
                          {Array.isArray(u.businessUnitIds) && u.businessUnitIds.length > 0
                            ? u.businessUnitIds.length
                            : '—'}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUser(u);
                                setEditForm({
                                  fullName: u.fullName,
                                  email: u.email,
                                  password: '',
                                  roleName: u.roleName,
                                  phone: u.phone || '',
                                });
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openBuAssignModal(u)}
                            >
                              BUs
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setPwdModal({ open: true, userId: u._id })}
                            >
                              Pwd
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-rose-400 border-rose-400 hover:bg-rose-500/10"
                              onClick={() => handleDeleteUser(u._id)}
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
            )}
            {users.length > 0 && (
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
          </CardContent>
        </Card>

        {/* Create modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h2 className="text-lg font-semibold">Nuevo usuario</h2>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateForm(EMPTY_USER); setError(null); }}
                  className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="px-6 py-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Nombre *</label>
                  <Input
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Email *</label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@empresa.com"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Teléfono</label>
                  <Input
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Contraseña *</label>
                  <Input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Contraseña"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Rol</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                    value={createForm.roleName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, roleName: e.target.value, supervisorId: '' }))}
                  >
                    <option value="EXECUTIVE">Ejecutivo</option>
                    <option value="SUPERVISOR">Supervisor</option>
                  </select>
                </div>
                {createForm.roleName === 'EXECUTIVE' && (
                  <div>
                    <label className="mb-1 block text-sm text-slate-400">Supervisor</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                      value={createForm.supervisorId}
                      onChange={(e) => setCreateForm((f) => ({ ...f, supervisorId: e.target.value }))}
                    >
                      <option value="">Seleccionar supervisor</option>
                      {supervisors.map((sup) => (
                        <option key={sup._id} value={sup._id}>{sup.fullName}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-2 border-t border-slate-800 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowCreateModal(false); setCreateForm(EMPTY_USER); setError(null); }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creatingUser} className="flex-1">
                    {creatingUser ? 'Creando…' : 'Crear usuario'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h2 className="text-lg font-semibold">Editar usuario</h2>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleEditUser} className="px-6 py-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Nombre *</label>
                  <Input
                    value={editForm.fullName}
                    onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Email *</label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@empresa.com"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Teléfono</label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div className="flex gap-2 border-t border-slate-800 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingUser(null)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={editingId} className="flex-1">
                    {editingId ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change password modal */}
        {pwdModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
                <button
                  type="button"
                  onClick={() => { setPwdModal({ open: false, userId: null }); setPwdForm({ current: '', newPwd: '', confirm: '' }); }}
                  className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleChangePassword} className="px-6 py-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Nueva contraseña *</label>
                  <Input
                    type="password"
                    value={pwdForm.newPwd}
                    onChange={(e) => setPwdForm((f) => ({ ...f, newPwd: e.target.value }))}
                    placeholder="Nueva contraseña"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Confirmar contraseña *</label>
                  <Input
                    type="password"
                    value={pwdForm.confirm}
                    onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                    placeholder="Confirmar contraseña"
                    required
                  />
                </div>
                <div className="flex gap-2 border-t border-slate-800 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setPwdModal({ open: false, userId: null }); setPwdForm({ current: '', newPwd: '', confirm: '' }); }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={changingPwd} className="flex-1">
                    {changingPwd ? 'Cambiando…' : 'Cambiar contraseña'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Business Units modal */}
        {buAssignModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h2 className="text-lg font-semibold">Asignar unidades de negocio</h2>
                <button
                  type="button"
                  onClick={() => { setBuAssignModal({ open: false, userId: null }); setSelectedBUs([]); }}
                  className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                {businessUnits.length === 0 ? (
                  <p className="text-sm text-slate-400">No hay unidades de negocio creadas.</p>
                ) : (
                  <>
                    {(editingUser?.roleName === 'SUPERVISOR' || editingUser?.roleName === 'EXECUTIVE') && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded px-3 py-2 text-xs text-blue-300">
                        {editingUser?.roleName === 'SUPERVISOR' ? 'Un supervisor solo puede tener 1 unidad de negocio' : 'Un ejecutivo solo puede tener 1 unidad de negocio'}
                      </div>
                    )}
                    <div className="space-y-2">
                      {businessUnits.map((bu) => {
                        const isSingleRole = editingUser?.roleName === 'SUPERVISOR' || editingUser?.roleName === 'EXECUTIVE';
                        return isSingleRole ? (
                          <label key={bu._id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-800/50 p-2 rounded">
                            <input
                              type="radio"
                              name="businessUnit"
                              checked={selectedBUs.includes(bu._id)}
                              onChange={() => setSelectedBUs([bu._id])}
                              className="rounded border-slate-600 bg-slate-900"
                            />
                            <span>{bu.code} — {bu.name}</span>
                          </label>
                        ) : (
                          <label key={bu._id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-800/50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={selectedBUs.includes(bu._id)}
                              onChange={() => toggleBU(bu._id)}
                              className="rounded border-slate-600 bg-slate-900"
                            />
                            <span>{bu.code} — {bu.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
                <div className="flex gap-2 border-t border-slate-800 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setBuAssignModal({ open: false, userId: null }); setSelectedBUs([]); }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={assigningBUs}
                    onClick={handleAssignBUs}
                    className="flex-1"
                  >
                    {assigningBUs ? 'Asignando…' : 'Asignar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Users;
