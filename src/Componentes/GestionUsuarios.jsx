import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser } from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, BtnIcon, Badge, Toggle,
  Field, FieldInput, FieldSelect, FieldError, FieldHint,
  AlertError, PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
  Drawer, DrawerHeader, DrawerBody, DrawerFooter,
} from '../ui/index.jsx';

const ROLES = ['Administrador', 'Contabilidad', 'Almacén', 'Producción', 'Solo Lectura'];

const DESCRIPCION_ROLES = {
  Administrador: 'Acceso total al sistema: usuarios, configuración, reportes y todas las operaciones.',
  Contabilidad:  'Registra y edita transacciones, facturas e informes financieros.',
  Almacén:       'Gestiona inventario, recepciones y movimientos de mercancía.',
  Producción:    'Consulta existencias y registra consumos de insumos de producción.',
  'Solo Lectura':'Acceso de solo lectura. No puede crear, editar ni eliminar registros.',
};

const ROL_VARIANT = {
  Administrador: 'violet',
  Contabilidad:  'sky',
  Almacén:       'amber',
  Producción:    'green',
  'Solo Lectura':'slate',
};

const FORM_VACIO = {
  username: '', nombre: '', apellido: '', email: '',
  foto_perfil: '', password: '', confirmPassword: '', rol: 'Solo Lectura', activo: true,
};

function normalizarUsuario(u) {
  return {
    id: u.id_usuario ?? u.id,
    username: u.username ?? '',
    nombre: u.nombre ?? u.first_name ?? '',
    apellido: u.apellido ?? u.last_name ?? '',
    email: u.email ?? '',
    foto_perfil: u.foto_perfil ?? '',
    rol: u.rol ?? '',
    activo: u.is_active ?? u.activo ?? true,
    ultimoAcceso: u.last_login
      ? new Date(u.last_login).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
      : '—',
  };
}

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [panelAbierto, setPanelAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);

  useEffect(() => { cargarUsuarios(); }, []);

  const cargarUsuarios = async () => {
    setCargando(true);
    setErrorCarga('');
    try {
      const data = await getUsers();
      const lista = Array.isArray(data) ? data : (data.results ?? []);
      setUsuarios(lista.map(normalizarUsuario));
    } catch (err) {
      setErrorCarga(err.message || 'Error al cargar usuarios');
    } finally {
      setCargando(false);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    return (
      `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q)
    );
  });

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErrores({});
    setErrorGuardar('');
    setMostrarPassword(false);
    setMostrarConfirm(false);
    setPanelAbierto(true);
  };

  const abrirEditar = (usuario) => {
    setEditandoId(usuario.id);
    setForm({
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      foto_perfil: usuario.foto_perfil,
      password: '',
      confirmPassword: '',
      rol: usuario.rol,
      activo: usuario.activo,
    });
    setErrores({});
    setErrorGuardar('');
    setMostrarPassword(false);
    setMostrarConfirm(false);
    setPanelAbierto(true);
  };

  const cerrarPanel = () => { if (!guardando) setPanelAbierto(false); };

  const cambioForm = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => { const e = { ...prev }; delete e[campo]; return e; });
  };

  const validar = () => {
    const e = {};
    if (!form.username.trim())  e.username = 'Requerido';
    if (!form.nombre.trim())    e.nombre = 'Requerido';
    if (!form.apellido.trim())  e.apellido = 'Requerido';
    if (!form.email.trim())     e.email = 'Requerido';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Formato inválido';
    if (!form.rol)              e.rol = 'Seleccione un rol';
    if (!editandoId) {
      if (!form.password)             e.password = 'Requerido';
      else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
      if (!form.confirmPassword)      e.confirmPassword = 'Requerido';
      else if (form.password !== form.confirmPassword) e.confirmPassword = 'No coinciden';
    } else if (form.password) {
      if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'No coinciden';
    }
    return e;
  };

  const guardar = async (e) => {
    e?.preventDefault();
    const e2 = validar();
    if (Object.keys(e2).length > 0) { setErrores(e2); return; }
    setGuardando(true);
    setErrorGuardar('');
    try {
      const payload = {
        username: form.username.trim(),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        rol: form.rol,
        is_active: form.activo,
      };
      if (form.foto_perfil.trim()) payload.foto_perfil = form.foto_perfil.trim();
      if (form.password) payload.password = form.password;

      if (editandoId !== null) {
        const data = await updateUser(editandoId, payload);
        setUsuarios((prev) => prev.map((u) => u.id === editandoId ? normalizarUsuario({ ...u, ...data }) : u));
      } else {
        const data = await createUser(payload);
        setUsuarios((prev) => [...prev, normalizarUsuario(data)]);
      }
      setPanelAbierto(false);
    } catch (err) {
      setErrorGuardar(err.message || 'Error al guardar el usuario');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (usuario) => {
    setTogglingId(usuario.id);
    try {
      const data = await updateUser(usuario.id, { is_active: !usuario.activo });
      setUsuarios((prev) => prev.map((u) => u.id === usuario.id ? normalizarUsuario({ ...u, ...data }) : u));
    } catch { /* estado no se modifica si falla */ }
    finally { setTogglingId(null); }
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

        <PageHeader
          title="Gestión de Usuarios"
          subtitle="Administra los usuarios, roles y permisos del sistema"
        />

        {errorCarga && <AlertError onRetry={cargarUsuarios}>{errorCarga}</AlertError>}

        <ContentCard>
          {/* Barra de herramientas */}
          <div className="px-4 py-3 border-b border-[#e4ecec] flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#aebfbf] text-[17px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-[#f5f8f8] border border-transparent rounded-md pl-9 pr-3 py-[6px] text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#dde8e8] focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <BtnIcon onClick={cargarUsuarios} disabled={cargando} title="Recargar">
                <span className={`material-symbols-outlined text-[18px] ${cargando ? 'animate-spin' : ''}`}>refresh</span>
              </BtnIcon>
              <BtnPrimary onClick={abrirNuevo}>
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                Agregar usuario
              </BtnPrimary>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <THead>
                <Th>Usuario</Th>
                <Th>Correo</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
                <Th>Último acceso</Th>
                <Th center>Acciones</Th>
              </THead>
              <TBody>
                {cargando ? (
                  <LoadingRows cols={6} rows={4} />
                ) : usuariosFiltrados.length === 0 ? (
                  <EmptyRow
                    cols={6}
                    title={busqueda ? 'Sin resultados para esa búsqueda' : 'No hay usuarios registrados'}
                  />
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <FilaUsuario
                      key={usuario.id}
                      usuario={usuario}
                      toggling={togglingId === usuario.id}
                      onEditar={() => abrirEditar(usuario)}
                      onToggle={() => toggleActivo(usuario)}
                    />
                  ))
                )}
              </TBody>
            </table>
          </div>

          {/* Pie */}
          {!cargando && (
            <div className="px-4 py-2.5 border-t border-[#f0f5f5] flex items-center justify-between text-[12px] text-[#6b8f8f]">
              <span>
                {usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''}
                {busqueda && ' encontrados'}
              </span>
              <span>
                {usuarios.filter((u) => u.activo).length} activos ·{' '}
                {usuarios.filter((u) => !u.activo).length} inactivos
              </span>
            </div>
          )}
        </ContentCard>
      </div>

      {/* Panel lateral */}
      <Drawer open={panelAbierto} onClose={cerrarPanel}>
        <DrawerHeader
          title={editandoId ? 'Editar Usuario' : 'Nuevo Usuario'}
          subtitle={editandoId ? 'Modifica los datos del usuario' : 'Completa los datos del nuevo usuario'}
          icon={editandoId ? 'manage_accounts' : 'person_add'}
          onClose={cerrarPanel}
          disabled={guardando}
        />

        <DrawerBody>
          {errorGuardar && <AlertError>{errorGuardar}</AlertError>}

          <form id="usuario-form" onSubmit={guardar} autoComplete="off" className="space-y-4">
            <Field label="Nombre de usuario" required error={errores.username}>
              <FieldInput
                type="text" placeholder="usuario123" icon="person"
                value={form.username} disabled={guardando}
                onChange={(e) => cambioForm('username', e.target.value)}
                error={errores.username}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" required error={errores.nombre}>
                <FieldInput
                  type="text" placeholder="María"
                  value={form.nombre} disabled={guardando}
                  onChange={(e) => cambioForm('nombre', e.target.value)}
                  error={errores.nombre}
                />
              </Field>
              <Field label="Apellido" required error={errores.apellido}>
                <FieldInput
                  type="text" placeholder="García"
                  value={form.apellido} disabled={guardando}
                  onChange={(e) => cambioForm('apellido', e.target.value)}
                  error={errores.apellido}
                />
              </Field>
            </div>

            <Field label="Correo electrónico" required error={errores.email}>
              <FieldInput
                type="email" placeholder="correo@capipollo.com" icon="mail"
                autoComplete="off"
                value={form.email} disabled={guardando}
                onChange={(e) => cambioForm('email', e.target.value)}
                error={errores.email}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={editandoId ? 'Nueva contraseña' : 'Contraseña'}
                required={!editandoId}
                error={errores.password}
                hint={editandoId ? 'Vacío = sin cambios' : ''}
              >
                <div className="relative">
                  <FieldInput
                    type={mostrarPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={form.password} disabled={guardando}
                    onChange={(e) => cambioForm('password', e.target.value)}
                    error={errores.password}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#aebfbf] hover:text-[#6b8f8f] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {mostrarPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </Field>
              <Field label="Confirmar contraseña" required={!editandoId} error={errores.confirmPassword}>
                <div className="relative">
                  <FieldInput
                    type={mostrarConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={form.confirmPassword} disabled={guardando}
                    onChange={(e) => cambioForm('confirmPassword', e.target.value)}
                    error={errores.confirmPassword}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirm((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#aebfbf] hover:text-[#6b8f8f] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {mostrarConfirm ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </Field>
            </div>

            <Field label="Rol" required error={errores.rol}>
              <FieldSelect
                value={form.rol} disabled={guardando}
                onChange={(e) => cambioForm('rol', e.target.value)}
                error={errores.rol}
              >
                <option value="">Seleccionar rol...</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </FieldSelect>
            </Field>

            {form.rol && (
              <div className="bg-[#f5f8f8] border border-[#e4ecec] rounded-md px-4 py-3">
                <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-1">
                  Permisos del rol
                </p>
                <p className="text-[12px] text-[#374040]">{DESCRIPCION_ROLES[form.rol]}</p>
              </div>
            )}

            <Field label="URL foto de perfil" hint="Opcional">
              <FieldInput
                type="text" icon="image"
                placeholder="https://ejemplo.com/foto.jpg"
                value={form.foto_perfil} disabled={guardando}
                onChange={(e) => cambioForm('foto_perfil', e.target.value)}
              />
            </Field>

            {form.foto_perfil.trim() && (
              <div className="flex items-center gap-3 p-3 bg-[#f5f8f8] border border-[#e4ecec] rounded-md">
                <img
                  src={form.foto_perfil} alt="Vista previa"
                  className="w-9 h-9 rounded-full object-cover border border-[#dde8e8] flex-shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span className="text-[12px] text-[#6b8f8f]">Vista previa</span>
              </div>
            )}

            {/* Estado cuenta */}
            <div className="bg-[#f5f8f8] border border-[#e4ecec] rounded-md px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-[#1a2e2e]">Estado de la cuenta</p>
                <p className="text-[12px] text-[#6b8f8f] mt-0.5">
                  {form.activo ? 'El usuario puede iniciar sesión' : 'Acceso suspendido al sistema'}
                </p>
              </div>
              <Toggle
                checked={form.activo}
                onChange={() => cambioForm('activo', !form.activo)}
                disabled={guardando}
              />
            </div>
          </form>
        </DrawerBody>

        <DrawerFooter
          form="usuario-form"
          saving={guardando}
          onCancel={cerrarPanel}
          saveLabel={editandoId ? 'Guardar cambios' : 'Crear usuario'}
          saveIcon={editandoId ? 'save' : 'person_add'}
        />
      </Drawer>
    </main>
  );
}

// ─── Fila de usuario ──────────────────────────────────────────────────────────

function FilaUsuario({ usuario, onEditar, onToggle, toggling }) {
  const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.trim() || usuario.username;
  const iniciales = nombreCompleto
    .split(' ').slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '').join('');

  return (
    <tr className="hover:bg-[#fafcfc] transition-colors group">
      <Td>
        <div className="flex items-center gap-2.5">
          {usuario.foto_perfil ? (
            <img
              src={usuario.foto_perfil} alt={nombreCompleto}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-[#e4ecec]"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#eef3f3] border border-[#dde8e8] flex items-center justify-center flex-shrink-0">
              <span className="text-[#4a6060] text-[10px] font-bold">{iniciales}</span>
            </div>
          )}
          <div>
            <p className="font-semibold text-[13px] text-[#1a2e2e]">{nombreCompleto}</p>
            <p className="text-[11px] text-[#6b8f8f]">@{usuario.username}</p>
          </div>
        </div>
      </Td>
      <Td muted>{usuario.email}</Td>
      <Td>
        {usuario.rol ? (
          <Badge variant={ROL_VARIANT[usuario.rol] ?? 'neutral'}>{usuario.rol}</Badge>
        ) : (
          <span className="text-[11px] text-[#aebfbf] italic">Sin rol</span>
        )}
      </Td>
      <Td>
        <Badge variant={usuario.activo ? 'active' : 'inactive'} dot>
          {usuario.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </Td>
      <Td muted className="text-[12px]">{usuario.ultimoAcceso}</Td>
      <Td center>
        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <BtnIcon onClick={onEditar} title="Editar usuario">
            <span className="material-symbols-outlined text-[17px]">edit</span>
          </BtnIcon>
          <BtnIcon
            onClick={onToggle}
            disabled={toggling}
            title={usuario.activo ? 'Desactivar' : 'Activar'}
            className={usuario.activo ? 'hover:text-red-500 hover:bg-red-50' : 'hover:text-emerald-600 hover:bg-emerald-50'}
          >
            <span className={`material-symbols-outlined text-[17px] ${toggling ? 'animate-spin' : ''}`}>
              {toggling ? 'progress_activity' : usuario.activo ? 'person_off' : 'how_to_reg'}
            </span>
          </BtnIcon>
        </div>
      </Td>
    </tr>
  );
}

export default GestionUsuarios;
