import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { registerUser } from '../utils/apiService';
import { AlertError, AlertSuccess, FieldInput, FieldLabel, BtnPrimary, BtnSecondary } from '../ui/index.jsx';

export function RegistroUsuario({ onRegister, onCancel }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (!nombre.trim() || !apellido.trim()) { setError('Nombre y apellido son obligatorios'); return; }

    const payload = {
      username: username.trim(),
      email: email.trim(),
      password,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
    };
    if (fotoPerfil.trim()) payload.foto_perfil = fotoPerfil.trim();

    setLoading(true);
    try {
      const data = await registerUser(payload);
      const token = data.access_token || data.access || data.token;
      if (token) {
        sessionStorage.setItem('access_token', token);
        sessionStorage.setItem('access', token);
        sessionStorage.setItem('token', token);
      }
      if (data.refresh_token) sessionStorage.setItem('refresh_token', data.refresh_token);
      if (data.user) sessionStorage.setItem('user', JSON.stringify(data.user));
      setSuccess('Cuenta creada correctamente. Bienvenido.');
      if (onRegister) onRegister(data);
    } catch (err) {
      setError(err.message || 'Error al registrar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8f8] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[520px] rounded-lg border border-[#e4ecec] p-8">

        {/* Branding */}
        <div className="flex flex-col items-center text-center mb-7 gap-3">
          <div className="w-12 h-12 bg-[#eef4f0] rounded-lg flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-[#012d1d]" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-[#1a2e2e] tracking-tight">Crear cuenta</h1>
            <p className="text-[13px] text-[#6b8f8f] mt-0.5">Capipollo · Nuevo usuario del sistema</p>
          </div>
        </div>

        {error && <AlertError>{error}</AlertError>}
        {success && <AlertSuccess>{success}</AlertSuccess>}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Nombre de usuario</FieldLabel>
              <FieldInput
                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="usuario123" disabled={loading} icon="person" required
              />
            </div>
            <div>
              <FieldLabel required>Correo electrónico</FieldLabel>
              <FieldInput
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@capipollo.com" disabled={loading} icon="mail" required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Nombre</FieldLabel>
              <FieldInput
                type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan" disabled={loading}
              />
            </div>
            <div>
              <FieldLabel required>Apellido</FieldLabel>
              <FieldInput
                type="text" value={apellido} onChange={(e) => setApellido(e.target.value)}
                placeholder="Pérez" disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Contraseña</FieldLabel>
              <FieldInput
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" disabled={loading} icon="lock" required
              />
            </div>
            <div>
              <FieldLabel required>Confirmar contraseña</FieldLabel>
              <FieldInput
                type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••" disabled={loading} icon="lock" required
              />
            </div>
          </div>

          <div>
            <FieldLabel>Foto de perfil</FieldLabel>
            <FieldInput
              type="text" value={fotoPerfil} onChange={(e) => setFotoPerfil(e.target.value)}
              placeholder="https://... (opcional)" disabled={loading} icon="image"
            />
          </div>

          <BtnPrimary type="submit" loading={loading} className="w-full py-2.5 mt-1">
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </BtnPrimary>
        </form>

        <div className="mt-5 text-center">
          <BtnGhost type="button" onClick={onCancel} className="text-[13px]">
            ¿Ya tienes cuenta? Iniciar sesión
          </BtnGhost>
        </div>
      </div>
    </div>
  );
}

function BtnGhost({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[#4a6060] font-medium rounded-md hover:bg-[#f0f5f5] transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default RegistroUsuario;
