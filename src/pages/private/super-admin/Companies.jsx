import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import CompaniesService from '../../../services/Companies.js';
import { FloatingAlert } from '../../../components/ui/floating-alert.jsx';
import { usePagination } from '../../../hooks/usePagination.js';
import PaginationControls from '../../../components/PaginationControls.jsx';

const STATUS_BADGE = {
  ACTIVE:    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  SUSPENDED: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

const EMPTY_FORM = {
  name: '', rut: '',
  planName: '', userLimit: '', storageLimitGb: '',
  adminFullName: '', adminEmail: '', adminPassword: '',
};

const Companies = () => {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const pagination = usePagination(1, 20);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await CompaniesService.getAll({
        ...params,
        page: pagination.currentPage,
        limit: pagination.limit,
      });
      if (res?.success && Array.isArray(res.data)) {
        setList(res.data);
        pagination.updatePaginationData(res.pagination);
      } else {
        setError(res?.message || 'Error al cargar empresas');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message;
      setError(
        msg === 'Network Error' || e?.code === 'ERR_NETWORK'
          ? 'No se pudo conectar al servidor. Comprueba que el backend esté corriendo (puerto 5001).'
          : (msg || 'Error de conexión')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    pagination.reset();
  }, [statusFilter, search]);

  useEffect(() => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (search.trim()) params.search = search.trim();
    load(params);
  }, [statusFilter, search, pagination.currentPage, pagination.limit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.adminFullName?.trim() || !form.adminEmail?.trim() || !form.adminPassword) {
      setError('Nombre de empresa, nombre del admin, email y contraseña son obligatorios.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await CompaniesService.createWithAdmin({
        name: form.name.trim(),
        rut: form.rut?.trim() || undefined,
        plan: {
          name: form.planName?.trim() || undefined,
          userLimit: form.userLimit ? Number(form.userLimit) : undefined,
          storageLimitGb: form.storageLimitGb ? Number(form.storageLimitGb) : undefined,
        },
        adminFullName: form.adminFullName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
      });
      if (res?.success) {
        setShowModal(false);
        setForm(EMPTY_FORM);
        setSuccessMsg(`Empresa "${res.data?.company?.name}" creada con su administrador.`);
        setTimeout(() => setSuccessMsg(null), 5000);
        load({ status: statusFilter || undefined, search: search.trim() || undefined });
      } else {
        setError(res?.message || 'Error al crear empresa');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message;
      setError(msg === 'Network Error' || e?.code === 'ERR_NETWORK'
        ? 'No se pudo conectar al servidor.'
        : (msg || 'Error al crear'));
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = list.filter((c) => c.status === 'ACTIVE').length;
  const totalUsers  = list.reduce((s, c) => s + (c.userCount || 0), 0);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <FloatingAlert message={error} onDismiss={() => setError(null)} variant="error" />
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
            <p className="text-xs text-slate-400">Gestión de empresas cliente (SUPER_ADMIN).</p>
          </div>
          <Button onClick={() => setShowModal(true)}>+ Nueva empresa</Button>
        </header>

        {successMsg && (
          <div className="mb-4 rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300 border border-emerald-500/30">
            {successMsg}
          </div>
        )}

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase text-slate-400">Total empresas</p>
              <p className="text-2xl font-bold text-slate-100">{list.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase text-slate-400">Activas</p>
              <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase text-slate-400">Usuarios totales</p>
              <p className="text-2xl font-bold text-sky-400">{totalUsers}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o RUT…"
            className="w-64"
          />
          <select
            className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activa</option>
            <option value="SUSPENDED">Suspendida</option>
          </select>
          {(search || statusFilter) && (
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>
              Limpiar filtros
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Listado de empresas{' '}
              <span className="text-sm font-normal text-slate-400">({list.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Cargando…</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-slate-400">No hay empresas. Crea una con el botón superior.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="pb-2 pr-4">Nombre</th>
                      <th className="pb-2 pr-4">RUT</th>
                      <th className="pb-2 pr-4">Plan</th>
                      <th className="pb-2 pr-4">Usuarios</th>
                      <th className="pb-2 pr-4">Estado</th>
                      <th className="pb-2 pr-4">Creada</th>
                      <th className="pb-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((c) => (
                      <tr
                        key={c._id}
                        className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer"
                        onClick={() => navigate(`/companies/${c._id}`)}
                      >
                        <td className="py-2 pr-4 font-medium">{c.name}</td>
                        <td className="py-2 pr-4 text-slate-400">{c.rut || '—'}</td>
                        <td className="py-2 pr-4 text-slate-400 text-xs">{c.plan?.name || '—'}</td>
                        <td className="py-2 pr-4">
                          <span className="font-semibold text-sky-400">{c.userCount || 0}</span>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status] || 'bg-slate-600/30 text-slate-300'}`}>
                            {c.status === 'ACTIVE' ? 'Activa' : 'Suspendida'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-slate-400">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-CL') : '—'}
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/companies/${c._id}`);
                            }}
                          >
                            Ver detalle
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {list.length > 0 && (
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
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h2 className="text-lg font-semibold">Nueva empresa</h2>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setError(null); }}
                  className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[80vh] px-6 py-4 space-y-5">
                {/* Empresa */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Datos de la empresa</p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm text-slate-400">Nombre *</label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Nombre de la empresa"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-slate-400">RUT</label>
                      <Input
                        value={form.rut}
                        onChange={(e) => setForm((f) => ({ ...f, rut: e.target.value }))}
                        placeholder="76.123.456-7"
                      />
                    </div>
                  </div>
                </div>

                {/* Plan */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Plan (opcional)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Nombre del plan</label>
                      <Input
                        value={form.planName}
                        onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))}
                        placeholder="Básico"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Límite usuarios</label>
                      <Input
                        type="number"
                        min="1"
                        value={form.userLimit}
                        onChange={(e) => setForm((f) => ({ ...f, userLimit: e.target.value }))}
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Storage (GB)</label>
                      <Input
                        type="number"
                        min="1"
                        value={form.storageLimitGb}
                        onChange={(e) => setForm((f) => ({ ...f, storageLimitGb: e.target.value }))}
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>

                {/* Admin */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Administrador inicial</p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm text-slate-400">Nombre completo *</label>
                      <Input
                        value={form.adminFullName}
                        onChange={(e) => setForm((f) => ({ ...f, adminFullName: e.target.value }))}
                        placeholder="Juan Pérez"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-slate-400">Email *</label>
                      <Input
                        type="email"
                        value={form.adminEmail}
                        onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                        placeholder="admin@empresa.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-slate-400">Contraseña *</label>
                      <Input
                        type="password"
                        value={form.adminPassword}
                        onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                        placeholder="Contraseña de acceso"
                        required
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-300">{error}</p>
                )}

                <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setError(null); }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Creando…' : 'Crear empresa'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Companies;
