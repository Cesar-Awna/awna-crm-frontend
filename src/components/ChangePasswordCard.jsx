import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { useChangePassword } from '../hooks/useChangePassword.js';

const ChangePasswordCard = ({ onClose }) => {
  const { changePassword, loading, error, success, setError, setSuccess } = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('La nueva contraseña no puede ser igual a la actual.');
      return;
    }

    const result = await changePassword(currentPassword, newPassword);

    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 4000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
      </CardHeader>
      <CardContent className="max-w-md space-y-4">
        {error && (
          <div className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-300 border border-red-500/30">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm text-emerald-300 border border-emerald-500/30">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Contraseña actual *</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Tu contraseña actual"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Nueva contraseña *</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Confirmar nueva contraseña *</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar nueva contraseña"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 border-t border-slate-800 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setError(null);
                if (onClose) onClose();
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Cambiando…' : 'Cambiar contraseña'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
