import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import Auth from '../../services/Auth.js';
import { getDefaultPathForRole } from '../../config/navByRole.js';
import { FloatingAlert } from '../../components/ui/floating-alert.jsx';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const navigate = useNavigate();
  const logoSrc = theme === 'light' ? '/images/logo-dark.webp' : '/images/logo-white.webp';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    setErrorMsg('');

    if (!values.email || !values.password) {
      setErrorMsg('Ingresa correo y contraseña');
      return;
    }

    try {
      setLoading(true);
      const response = await Auth.login(values);

      if (response?.success) {
        localStorage.setItem('user', JSON.stringify(response.data));
        const roleName = response.data?.session?.roleName;
        navigate(getDefaultPathForRole(roleName));
      } else {
        setErrorMsg(response?.message || 'No se pudo iniciar sesión');
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message || error?.message || 'Error al iniciar sesión';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <FloatingAlert message={errorMsg} onDismiss={() => setErrorMsg('')} variant="error" />
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src={logoSrc} alt="AWNA CRM" className="h-16" />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-slate-50">Awna CRM</h1>
            <p className="text-xs text-slate-400">Accede a tu panel comercial</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium text-slate-300">
              Correo
            </label>
            <Input id="email" name="email" type="email" placeholder="tu@empresa.com" />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-medium text-slate-300">
              Contraseña
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;

