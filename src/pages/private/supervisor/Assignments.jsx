import React, { useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import UsersService from '../../../services/Users.js';
import { FloatingAlert } from '../../../components/ui/floating-alert.jsx';

const Assignments = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });

  const handleCreateExecutive = async (e) => {
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
        phone: createForm.phone?.trim() || undefined,
      };

      const res = await UsersService.createExecutive(payload);

      if (res?.success) {
        setShowCreateModal(false);
        setCreateForm({ fullName: '', email: '', password: '', phone: '' });
        setSuccess('Ejecutivo creado correctamente.');
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res?.message || 'Error al crear ejecutivo');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Error al crear ejecutivo');
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <FloatingAlert message={error} onDismiss={() => setError(null)} variant="error" />
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Asignaciones</h1>
            <p className="text-xs text-slate-400">Gestión de ejecutivos en tu equipo.</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>+ Agregar ejecutivo</Button>
        </header>

        {success && (
          <div className="mb-4 rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300 border border-emerald-500/30">
            {success}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ejecutivos en tu equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">Los ejecutivos que agregues aquí se asignarán automáticamente a tu equipo.</p>
          </CardContent>
        </Card>

        {/* Create Executive Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h2 className="text-lg font-semibold">Nuevo ejecutivo</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({ fullName: '', email: '', password: '', phone: '' });
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateExecutive} className="px-6 py-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Nombre completo *</label>
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
                <div className="bg-blue-500/10 border border-blue-500/30 rounded px-3 py-2 text-xs text-blue-300">
                  Este ejecutivo se asignará automáticamente a tu equipo y unidad de negocio.
                </div>
                <div className="flex gap-2 border-t border-slate-800 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateForm({ fullName: '', email: '', password: '', phone: '' });
                      setError(null);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creatingUser} className="flex-1">
                    {creatingUser ? 'Creando…' : 'Crear ejecutivo'}
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

export default Assignments;
