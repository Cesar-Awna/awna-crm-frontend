import { useState } from 'react';
import UsersService from '../services/Users.js';

export const useChangePassword = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await UsersService.changePassword({
        currentPassword,
        newPassword,
      });

      if (res?.success) {
        setSuccess('Contraseña cambiada correctamente.');
        return { success: true };
      } else {
        setError(res?.message || 'Error al cambiar contraseña');
        return { success: false };
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Error de conexión';
      setError(msg);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    changePassword,
    loading,
    error,
    success,
    setError,
    setSuccess,
  };
};
