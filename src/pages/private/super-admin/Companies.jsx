import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import CompaniesService from '../../../services/Companies.js';
import { FloatingAlert } from '../../../components/ui/floating-alert.jsx';

const Companies = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', rut: '', status: 'ACTIVE' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await CompaniesService.getAll();
      if (res?.success && Array.isArray(res.data)) {
        setList(res.data);
      } else {
        setError(res?.message || 'Error al cargar empresas');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message;
      const isNetwork = msg === 'Network Error' || e?.code === 'ERR_NETWORK';
      setError(isNetwork
        ? 'No se pudo conectar al servidor. Comprueba que el backend esté corriendo (puerto 5001).'
        : (msg || 'Error de conexión'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await CompaniesService.create({
        name: form.name.trim(),
        rut: form.rut?.trim() || undefined,
        status: form.status,
      });
      if (res?.success) {
        setShowForm(false);
        setForm({ name: '', rut: '', status: 'ACTIVE' });
        load();
      } else {
        setError(res?.message || 'Error al crear empresa');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message;
      const isNetwork = msg === 'Network Error' || e?.code === 'ERR_NETWORK';
      setError(isNetwork
        ? 'No se pudo conectar al servidor. Comprueba que el backend esté corriendo (puerto 5001).'
        : (msg || 'Error al crear'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <FloatingAlert message={error} onDismiss={() => setError(null)} variant="error" />
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
            <p className="text-xs text-slate-400">Paso 1: crear y listar empresas (SUPER_ADMIN).</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Crear empresa'}
          </Button>
        </header>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Nueva empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
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
                    placeholder="RUT (opcional)"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Estado</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">Activa</option>
                    <option value="SUSPENDED">Suspendida</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Creando…' : 'Crear empresa'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Listado de empresas</CardTitle>
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
                      <th className="pb-2 pr-4">Estado</th>
                      <th className="pb-2 pr-4">ID</th>
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
                        <td className="py-2 pr-4">{c.name}</td>
                        <td className="py-2 pr-4">{c.rut || '—'}</td>
                        <td className="py-2 pr-4">{c.status}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-slate-500">{c._id}</td>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Companies;
