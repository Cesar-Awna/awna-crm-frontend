import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import CompaniesService from '../../../services/Companies.js';
import UsersService from '../../../services/Users.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import { FloatingAlert } from '../../../components/ui/floating-alert.jsx';

const TABS = ['empresa', 'usuarios', 'unidades'];

const CompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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
    roleName: 'COMPANY_ADMIN',
  });
  const [creatingUser, setCreatingUser] = useState(false);

  const [businessUnits, setBusinessUnits] = useState([]);
  const [loadingBUs, setLoadingBUs] = useState(false);
  const [buMessage, setBuMessage] = useState(null);
  const [creatingBU, setCreatingBU] = useState(false);
  const [newBUCode, setNewBUCode] = useState('');
  const [newBUName, setNewBUName] = useState('');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedBUIds, setSelectedBUIds] = useState([]);
  const [assigningBUs, setAssigningBUs] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [companyMsg, setCompanyMsg] = useState(null);

  const currentUser = useMemo(
    () => users.find((u) => u._id === selectedUserId),
    [users, selectedUserId]
  );

  useEffect(() => {
    if (!id) return;
    const loadCompany = async () => {
      setLoadingCompany(true);
      setError(null);
      try {
        const res = await CompaniesService.getById(id);
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
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await UsersService.getAll({ companyId: id });
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
  }, [id, selectedUserId]);

  useEffect(() => {
    if (!id) return;
    const loadBUs = async () => {
      setLoadingBUs(true);
      try {
        const res = await BusinessUnitsService.getAll({ companyId: id });
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
  }, [id]);

  useEffect(() => {
    if (currentUser?.businessUnitIds?.length) {
      setSelectedBUIds(currentUser.businessUnitIds);
    } else {
      setSelectedBUIds([]);
    }
  }, [currentUser?._id]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!id || !userForm.fullName.trim() || !userForm.email.trim() || !userForm.password) {
      setUserMessage('Completa nombre, email y contraseña.');
      return;
    }
    setCreatingUser(true);
    setUserMessage(null);
    try {
      const res = await UsersService.create({
        companyId: id,
        fullName: userForm.fullName.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        roleName: userForm.roleName,
      });
      if (res?.success) {
        setUserMessage('Usuario creado correctamente.');
        setUserForm({ fullName: '', email: '', password: '', roleName: 'COMPANY_ADMIN' });
        const refreshed = await UsersService.getAll({ companyId: id });
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

  const handleCreateBU = async (e) => {
    e.preventDefault();
    if (!id || !newBUCode.trim() || !newBUName.trim()) return;
    setCreatingBU(true);
    setBuMessage(null);
    try {
      const res = await BusinessUnitsService.create({
        companyId: id,
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
    if (!id || !selectedUserId) {
      setBuMessage('Selecciona un usuario.');
      return;
    }
    setAssigningBUs(true);
    setBuMessage(null);
    try {
      const res = await UsersService.assignBusinessUnits(selectedUserId, {
        companyId: id,
        businessUnitIds: selectedBUIds,
      });
      if (res?.success) {
        setBuMessage('Unidades de negocio asignadas correctamente.');
        const refreshed = await UsersService.getAll({ companyId: id });
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

  const handleToggleStatus = async () => {
    if (!id || !company) return;
    setStatusChanging(true);
    setCompanyMsg(null);
    try {
      const fn = company.status === 'ACTIVE' ? CompaniesService.suspend : CompaniesService.reactivate;
      const res = await fn(id);
      if (res?.success) {
        setCompany((prev) => ({ ...prev, status: res.data.status }));
        setCompanyMsg(res.message || 'Estado actualizado.');
        setTimeout(() => setCompanyMsg(null), 4000);
      } else {
        setCompanyMsg(res?.message || 'Error al cambiar estado');
      }
    } catch (e) {
      setCompanyMsg(e?.response?.data?.message || e?.message || 'Error al cambiar estado');
    } finally {
      setStatusChanging(false);
    }
  };

  const renderTabs = () => (
    <div className="mb-4 flex gap-2 border-b border-slate-800">
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        const labels = {
          empresa: 'Empresa',
          usuarios: 'Usuarios',
          unidades: 'Unidades de negocio',
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
    <div className="space-y-4">
      {companyMsg && (
        <div className={`rounded-md px-4 py-2 text-sm border ${
          companyMsg.toLowerCase().includes('error')
            ? 'bg-red-500/20 text-red-300 border-red-500/30'
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        }`}>
          {companyMsg}
        </div>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Resumen de la empresa</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={statusChanging}
            onClick={handleToggleStatus}
            className={company?.status === 'ACTIVE'
              ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
              : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
            }
          >
            {statusChanging
              ? 'Cambiando…'
              : company?.status === 'ACTIVE' ? 'Suspender empresa' : 'Reactivar empresa'
            }
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Nombre</p>
              <p className="font-medium">{company?.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">RUT</p>
              <p>{company?.rut || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Estado</p>
              <span className={`inline-block mt-0.5 rounded px-2 py-0.5 text-xs font-medium ${
                company?.status === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {company?.status === 'ACTIVE' ? 'Activa' : 'Suspendida'}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500">Usuarios</p>
              <p className="font-semibold text-sky-400">{company?.userCount ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fecha de creación</p>
              <p>{company?.createdAt ? new Date(company.createdAt).toLocaleDateString('es-CL') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">ID</p>
              <p className="font-mono text-xs text-slate-500">{company?._id}</p>
            </div>
          </div>

          {(company?.plan?.name || company?.plan?.userLimit || company?.plan?.storageLimitGb) && (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Plan</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Nombre</p>
                  <p>{company.plan.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Límite usuarios</p>
                  <p>{company.plan.userLimit ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Storage</p>
                  <p>{company.plan.storageLimitGb != null ? `${company.plan.storageLimitGb} GB` : '—'}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
                <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="EXECUTIVE">EXECUTIVE</option>
              </select>
            </div>
            {userMessage && <p className="text-sm text-emerald-400">{userMessage}</p>}
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
                    <th className="pb-2">Unidades</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-slate-800">
                      <td className="py-2 pr-4">{u.fullName}</td>
                      <td className="py-2 pr-4">{u.email}</td>
                      <td className="py-2 pr-4">{u.roleName}</td>
                      <td className="py-2 text-xs text-slate-400">
                        {Array.isArray(u.businessUnitIds) && u.businessUnitIds.length > 0
                          ? u.businessUnitIds.join(', ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
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
            <p className="text-sm text-slate-400">
              No hay unidades creadas todavía.
            </p>
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
                No hay unidades. Crea una abajo y vuelve a asignar.
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

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <FloatingAlert message={error} onDismiss={() => setError(null)} variant="error" />
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-4 flex items-center gap-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => navigate('/companies')}
            aria-label="Volver al listado de empresas"
          >
            ←
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {company?.name || 'Detalle de empresa'}
            </h1>
            <p className="text-xs text-slate-400">
              Configuración de empresa, usuarios y unidades de negocio.
            </p>
          </div>
        </header>

        {loadingCompany ? (
          <p className="text-sm text-slate-400">Cargando empresa…</p>
        ) : !company ? (
          <p className="text-sm text-slate-400">No se encontró la empresa.</p>
        ) : (
          <>
            {renderTabs()}
            {activeTab === 'empresa' && renderEmpresa()}
            {activeTab === 'usuarios' && renderUsuarios()}
            {activeTab === 'unidades' && renderUnidades()}
          </>
        )}
      </main>
    </div>
  );
};

export default CompanyDetail;

