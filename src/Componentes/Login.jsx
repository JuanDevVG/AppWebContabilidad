import { useState } from 'react';
import { Bird, LogIn, ShieldCheck } from 'lucide-react';
import { login as apiLogin } from '../utils/apiService';
import { AlertError, AlertSuccess, FieldInput, BtnPrimary } from '../ui/index.jsx';

export function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiLogin(email, password);
      const token = data.access_token || data.access || data.token;
      if (token) {
        sessionStorage.setItem('access_token', token);
        sessionStorage.setItem('access', token);
        sessionStorage.setItem('token', token);
      }
      if (data.refresh_token) sessionStorage.setItem('refresh_token', data.refresh_token);
      if (data.user) sessionStorage.setItem('user', JSON.stringify(data.user));
      setSuccess('Autenticación exitosa. Cargando...');
      setTimeout(() => onLogin(data), 500);
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8f8] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[400px] rounded-lg border border-[#e4ecec] p-8">

        {/* Branding */}
        <div className="flex flex-col items-center text-center mb-7 gap-3">
          <div className="w-12 h-12 bg-[#eef4f0] rounded-lg flex items-center justify-center">
            <Bird className="w-6 h-6 text-[#012d1d]" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-[#1a2e2e] tracking-tight">ContAve</h1>
            <p className="text-[13px] text-[#6b8f8f] mt-0.5">Gestion de Producción y Contabilidad</p>
          </div>
        </div>

        {error && <AlertError>{error}</AlertError>}
        {success && <AlertSuccess>{success}</AlertSuccess>}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
              Correo electrónico
            </label>
            <FieldInput
              type="email"
              placeholder="usuario@capipollo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              icon="mail"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
              Contraseña
            </label>
            <FieldInput
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              icon="lock"
              required
            />
          </div>

          <BtnPrimary
            type="submit"
            loading={loading}
            className="w-full mt-2 py-2.5"
            onClick={undefined}
          >
            {!loading && <LogIn className="w-4 h-4" />}
            {loading ? 'Verificando...' : 'Iniciar sesión'}
          </BtnPrimary>
        </form>

        <div className="mt-6 pt-5 border-t border-[#f0f5f5] flex items-center justify-center gap-2 text-[12px] text-[#aebfbf]">
          <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
          <span>Acceso exclusivo para personal autorizado</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
