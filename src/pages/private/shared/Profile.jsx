import React, { useEffect, useState, useMemo } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import AuthService from '../../../services/Auth.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import CompaniesService from '../../../services/Companies.js';
import ChangePasswordCard from '../../../components/ChangePasswordCard.jsx';
import { FloatingAlert } from '../../../components/ui/floating-alert.jsx';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Administrador',
  COMPANY_ADMIN: 'Administrador de Empresa',
  SUPERVISOR: 'Supervisor',
  EXECUTIVE: 'Ejecutivo',
};

const Profile = () => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Edit profile state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const res = await AuthService.getMe();
        if (res?.success && res.data) {
          setProfile(res.data);
          setEditForm({
            fullName: res.data.user?.fullName || '',
            phone: res.data.user?.phone || '',
          });
        }
      } catch (e) {
        console.error('Error loading profile:', e);
        setError('Error al cargar el perfil');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const role = profile?.role;
        if (role === 'SUPER_ADMIN') return;

        const res = await CompaniesService.getCurrent();
        if (res?.success && res.data) {
          setCompany(res.data);
        }
      } catch (e) {
        console.error('Error loading company:', e);
      }
    };

    if (profile) {
      loadCompany();
    }
  }, [profile]);

  useEffect(() => {
    const loadBUs = async () => {
      try {
        const res = await BusinessUnitsService.getAll();
        if (res?.success && Array.isArray(res.data)) {
          setBusinessUnits(res.data);
        }
      } catch (e) {
        console.error('Error loading BUs:', e);
      }
    };

    if (profile && profile.role !== 'SUPER_ADMIN') {
      loadBUs();
    }
  }, [profile]);

  const userBUs = useMemo(() => {
    const ids = profile?.user?.businessUnitIds || [];
    return businessUnits.filter((bu) => ids.includes(bu._id));
  }, [profile, businessUnits]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editForm.fullName.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await AuthService.updateProfile({
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
      });

      if (res?.success) {
        setMessage('Perfil actualizado correctamente');
        setProfile((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            fullName: editForm.fullName.trim(),
            phone: editForm.phone.trim(),
          },
        }));
        setEditMode(false);
      } else {
        setError(res?.message || 'Error al actualizar perfil');
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };


  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const showBothToasts = Boolean(message) && Boolean(error);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <FloatingAlert message={message} onDismiss={() => setMessage(null)} variant="success" />
      <FloatingAlert
        message={error}
        onDismiss={() => setError(null)}
        variant="error"
        stackIndex={showBothToasts ? 1 : 0}
      />
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Mi Perfil</h1>
          <p className="text-xs text-slate-400">Datos de tu cuenta y preferencias.</p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando perfil…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Info Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Información personal</CardTitle>
                {!editMode && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditMode(true)}
                  >
                    Editar
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm text-slate-400">Nombre completo</label>
                      <Input
                        value={editForm.fullName}
                        onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                        placeholder="Tu nombre"
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
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" disabled={saving}>
                        {saving ? 'Guardando…' : 'Guardar cambios'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditMode(false);
                          setEditForm({
                            fullName: profile?.user?.fullName || '',
                            phone: profile?.user?.phone || '',
                          });
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-2xl font-bold text-emerald-400">
                        {profile?.user?.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-lg font-medium">{profile?.user?.fullName}</p>
                        <p className="text-sm text-slate-400">{profile?.user?.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                      <div>
                        <p className="text-xs text-slate-500">Teléfono</p>
                        <p className="text-sm">{profile?.user?.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Miembro desde</p>
                        <p className="text-sm">{formatDate(profile?.user?.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Role & Access Card */}
            <Card>
              <CardHeader>
                <CardTitle>Rol y accesos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500">Rol</p>
                  <span className="inline-block mt-1 rounded bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
                    {ROLE_LABELS[profile?.role] || profile?.role || '—'}
                  </span>
                </div>

                {company && (
                  <div>
                    <p className="text-xs text-slate-500">Empresa</p>
                    <p className="text-sm">{company.name}</p>
                  </div>
                )}

                {userBUs.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500">Unidades de negocio</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {userBUs.map((bu) => (
                        <span
                          key={bu._id}
                          className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                        >
                          {bu.name || bu.code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-slate-500">Estado</p>
                  <span
                    className={`inline-block mt-1 rounded px-2 py-0.5 text-xs font-medium ${
                      profile?.user?.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {profile?.user?.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Security Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Seguridad</CardTitle>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs text-slate-400">Tema</span>
                    <input
                      type="checkbox"
                      checked={theme === 'light'}
                      onChange={(e) => setTheme(e.target.checked ? 'light' : 'dark')}
                      className="h-4 w-8 accent-emerald-500 cursor-pointer"
                      aria-label="Cambiar tema"
                    />
                    <span className="text-xs text-slate-400">
                      {theme === 'light' ? 'Claro' : 'Oscuro'}
                    </span>
                  </label>

                  {!showPasswordForm && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPasswordForm(true)}
                    >
                      Cambiar contraseña
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {showPasswordForm ? (
                  <ChangePasswordCard onClose={() => setShowPasswordForm(false)} />
                ) : (
                  <p className="text-sm text-slate-400">
                    Haz clic en "Cambiar contraseña" para actualizar tu contraseña.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
