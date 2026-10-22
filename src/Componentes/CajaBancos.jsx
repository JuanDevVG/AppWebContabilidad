import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Search, Trash2, Paperclip, X, Pencil, AlertTriangle,
  Building2, Wallet, TrendingUp, TrendingDown, ChevronRight,
} from 'lucide-react';
import {
  BtnPrimary, BtnSecondary, BtnGhost, BtnIcon,
  Field, FieldInput, FieldSelect,
  AlertError, AlertSuccess,
  Th, Td, THead, TBody, EmptyRow, LoadingRows,
} from '../ui/index.jsx';
import {
  getCuentasCajaBanco, createCuentaCajaBanco, updateCuentaCajaBanco,
  getCuentasContables, mensajeError,
  getMovimientos, createMovimiento, deleteMovimiento,
} from '../utils/apiService.js';

// ── Constants ────────────────────────────────────────────────────────────────

const CATS_INGRESO = ['Ventas', 'Cobro de factura', 'Préstamo recibido', 'Depósito', 'Otro ingreso'];
const CATS_EGRESO  = ['Pago a proveedor', 'Nómina', 'Servicios públicos', 'Arriendo', 'Impuestos', 'Otro gasto'];

function fmt(n) {
  const v = parseFloat(n);
  if (isNaN(v)) return '0.00';
  return v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() {
  return new Date().toLocaleDateString('en-CA');
}

// Grupo PUC al que debe pertenecer la cuenta contable según el tipo.
const GRUPO_PUC = { CAJA: '1105', BANCO: '1110' };

function cuentasValidasPara(tipo, cuentasContables) {
  return cuentasContables.filter(
    (c) => c.codigo.startsWith(GRUPO_PUC[tipo]) && c.acepta_transacciones && c.activo,
  );
}

// ── Modal: Nuevo Movimiento ───────────────────────────────────────────────────

function ModalMovimiento({ cuentaId, onSaved, onClose }) {
  const [fecha, setFecha]     = useState(today());
  const [tipo, setTipo]       = useState('INGRESO');
  const [desc, setDesc]       = useState('');
  const [monto, setMonto]     = useState('');
  const [cat, setCat]         = useState('');
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const fileRef = useRef(null);

  const cats = tipo === 'INGRESO' ? CATS_INGRESO : CATS_EGRESO;

  async function handleSave() {
    if (!desc.trim() || !monto || parseFloat(monto) <= 0) {
      setError('Descripción y monto (mayor a cero) son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createMovimiento(
        { cuenta_id: cuentaId, fecha, tipo, descripcion: desc.trim(), monto, categoria: cat },
        archivo,
      );
      onSaved();
    } catch (e) {
      setError(e.message || 'Error al guardar.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e0ede8]">
          <h2 className="text-[15px] font-bold text-[#1a2e2e]">Nuevo Movimiento</h2>
          <BtnIcon onClick={onClose}><X className="w-4 h-4" /></BtnIcon>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && <AlertError>{error}</AlertError>}

          {/* Tipo toggle */}
          <div>
            <label className="block text-[12px] font-semibold text-[#1a4731] mb-1.5">Tipo</label>
            <div className="flex rounded-lg overflow-hidden border border-[#c8ddd6]">
              {[['INGRESO', 'Ingreso', TrendingUp], ['EGRESO', 'Egreso', TrendingDown]].map(([v, l, Icon]) => (
                <button
                  key={v}
                  onClick={() => { setTipo(v); setCat(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold transition-colors ${
                    tipo === v
                      ? v === 'INGRESO'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-500 text-white'
                      : 'text-[#6b8f8f] hover:bg-[#f0f7f4]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <FieldInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Field>
            <Field label="Monto">
              <FieldInput
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Descripción">
            <FieldInput
              placeholder="Descripción del movimiento"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </Field>

          <Field label="Categoría">
            <FieldSelect value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Sin categoría</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </FieldSelect>
          </Field>

          {/* Comprobante */}
          <div>
            <label className="block text-[12px] font-semibold text-[#1a4731] mb-1.5">Comprobante</label>
            <input
              type="file"
              ref={fileRef}
              className="hidden"
              accept="image/*,application/pdf"
              onChange={(e) => setArchivo(e.target.files[0] || null)}
            />
            {archivo ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#f0f7f4] rounded-lg border border-[#c8ddd6]">
                <Paperclip className="w-3.5 h-3.5 text-[#1a7a4a] flex-shrink-0" />
                <span className="flex-1 text-[12px] text-[#1a2e2e] truncate">{archivo.name}</span>
                <button onClick={() => setArchivo(null)} className="text-[#9db8b2] hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <BtnSecondary onClick={() => fileRef.current?.click()} className="w-full">
                <Paperclip className="w-4 h-4" />
                Adjuntar comprobante
              </BtnSecondary>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-[#e0ede8]">
          <BtnGhost onClick={onClose} className="flex-1">Cancelar</BtnGhost>
          <BtnPrimary onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Guardando…' : 'Guardar'}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Nueva / Editar Cuenta ─────────────────────────────────────────────

function ModalCuenta({ cuenta, cuentasContables, onSaved, onClose, onNavegar }) {
  const editando = Boolean(cuenta);
  const bloqueadaPorMovs = editando && cuenta.tiene_movimientos;
  const [nombre, setNombre] = useState(cuenta?.nombre ?? '');
  const [tipo, setTipo]     = useState(cuenta?.tipo ?? 'CAJA');
  const [banco, setBanco]   = useState(cuenta?.banco ?? '');
  const [numCta, setNumCta] = useState(cuenta?.numero_cuenta ?? '');
  const [saldo, setSaldo]   = useState(cuenta?.saldo_inicial ?? '0');
  const [fechaSaldo, setFechaSaldo] = useState(cuenta?.fecha_saldo_inicial ?? today());
  const [ctaContable, setCtaContable] = useState(
    cuenta?.cuenta_contable_id ? String(cuenta.cuenta_contable_id) : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const opciones = useMemo(
    () => cuentasValidasPara(tipo, cuentasContables),
    [tipo, cuentasContables],
  );
  // Con movimientos, una cuenta contable ya vinculada no se puede cambiar.
  const ctaContableBloqueada = bloqueadaPorMovs && Boolean(cuenta.cuenta_contable_id);

  // Si solo hay una cuenta válida para el tipo, queda preseleccionada.
  const ctaSeleccionada = ctaContable || (opciones.length === 1 ? String(opciones[0].id) : '');

  function cambiarTipo(v) {
    setTipo(v);
    setCtaContable('');
  }

  async function handleSave() {
    if (!nombre.trim()) { setError({ texto: 'El nombre es obligatorio.' }); return; }
    if (!ctaSeleccionada) { setError({ texto: 'Selecciona la cuenta contable.' }); return; }
    setSaving(true);
    setError(null);
    const payload = {
      nombre: nombre.trim(),
      banco: banco.trim(), numero_cuenta: numCta.trim(),
      cuenta_contable_id: Number(ctaSeleccionada),
    };
    if (!bloqueadaPorMovs) {
      payload.saldo_inicial = saldo || '0';
      payload.fecha_saldo_inicial = fechaSaldo;
    }
    try {
      if (editando) {
        await updateCuentaCajaBanco(cuenta.id, payload);
      } else {
        await createCuentaCajaBanco({ ...payload, tipo });
      }
      onSaved();
    } catch (e) {
      setError({
        texto: mensajeError(e, editando ? 'Error al guardar la cuenta.' : 'Error al crear la cuenta.'),
        codigo: e.data?.codigo,
      });
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e0ede8]">
          <h2 className="text-[15px] font-bold text-[#1a2e2e]">{editando ? 'Editar Cuenta' : 'Nueva Cuenta'}</h2>
          <BtnIcon onClick={onClose}><X className="w-4 h-4" /></BtnIcon>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto max-h-[75vh]">
          {error && (
            <AlertError>
              {error.texto}
              {error.codigo === 'SIN_CUENTA_PATRIMONIO' && onNavegar && (
                <button
                  type="button"
                  onClick={() => onNavegar('config_empresa')}
                  className="block mt-1.5 font-semibold underline"
                >
                  Ir a Configuración → Parámetros de Empresa
                </button>
              )}
            </AlertError>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[#1a4731] mb-1.5">Tipo</label>
            {editando ? (
              <p className="text-[13px] text-[#1a2e2e]">
                {tipo === 'BANCO' ? 'Banco' : 'Caja'}
                <span className="text-[11px] text-[#9db8b2]"> · no se puede cambiar después de crear</span>
              </p>
            ) : (
              <div className="flex rounded-lg overflow-hidden border border-[#c8ddd6]">
                {[['CAJA', 'Caja'], ['BANCO', 'Banco']].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => cambiarTipo(v)}
                    className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors ${
                      tipo === v ? 'bg-[#1a7a4a] text-white' : 'text-[#6b8f8f] hover:bg-[#f0f7f4]'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Field label="Nombre">
            <FieldInput
              placeholder={tipo === 'CAJA' ? 'Ej: Caja Principal' : 'Ej: Bancolombia Ahorros'}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Field>

          {tipo === 'BANCO' && (
            <>
              <Field label="Banco">
                <FieldInput placeholder="Nombre del banco" value={banco} onChange={(e) => setBanco(e.target.value)} />
              </Field>
              <Field label="Número de cuenta">
                <FieldInput placeholder="****-****" value={numCta} onChange={(e) => setNumCta(e.target.value)} />
              </Field>
            </>
          )}

          <Field label="Cuenta contable">
            <FieldSelect
              value={ctaSeleccionada}
              onChange={(e) => setCtaContable(e.target.value)}
              disabled={ctaContableBloqueada}
            >
              <option value="">— Seleccionar —</option>
              {opciones.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>
              ))}
            </FieldSelect>
          </Field>
          <p className="text-[11px] text-[#6b8f8f] -mt-1.5">
            {ctaContableBloqueada
              ? 'No se puede cambiar porque la cuenta ya tiene movimientos.'
              : opciones.length === 0
                ? `No hay cuentas del grupo ${GRUPO_PUC[tipo]} que acepten movimientos. Créala en el Plan de Cuentas.`
                : `Cuentas del grupo ${GRUPO_PUC[tipo]} (${tipo === 'BANCO' ? 'Bancos' : 'Caja'}).`}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Saldo inicial">
              <FieldInput
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={saldo}
                disabled={bloqueadaPorMovs}
                onChange={(e) => setSaldo(e.target.value)}
              />
            </Field>
            <Field label="Fecha del saldo">
              <FieldInput
                type="date"
                value={fechaSaldo}
                disabled={bloqueadaPorMovs}
                onChange={(e) => setFechaSaldo(e.target.value)}
              />
            </Field>
          </div>
          <p className="text-[11px] text-[#6b8f8f] -mt-1.5">
            {bloqueadaPorMovs
              ? 'El saldo inicial no se puede modificar porque la cuenta ya tiene movimientos.'
              : 'Se registra un asiento de apertura contra la cuenta de patrimonio configurada.'}
          </p>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-[#e0ede8]">
          <BtnGhost onClick={onClose} className="flex-1">Cancelar</BtnGhost>
          <BtnPrimary onClick={handleSave} disabled={saving} className="flex-1">
            {saving
              ? (editando ? 'Guardando…' : 'Creando…')
              : (editando ? 'Guardar cambios' : 'Crear cuenta')}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar item ──────────────────────────────────────────────────────────────

function SidebarItem({ cuenta, activo, onClick, onVincular }) {
  const saldo = parseFloat(cuenta.saldo_actual);
  const neg   = saldo < 0;
  const Icon  = cuenta.tipo === 'BANCO' ? Building2 : Wallet;
  return (
    <div
      className={`rounded-lg transition-all duration-150 ${
        activo ? 'bg-[#e8f5ef] ring-1 ring-[#1a7a4a]/25' : 'hover:bg-[#f5faf7]'
      }`}
    >
      <button onClick={onClick} className="w-full flex flex-col gap-0.5 px-3 pt-2.5 pb-2 text-left">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 flex-shrink-0 ${activo ? 'text-[#1a7a4a]' : 'text-[#9db8b2]'}`} />
          <span className="flex-1 text-[13px] font-semibold text-[#1a2e2e] truncate">{cuenta.nombre}</span>
          {activo && <ChevronRight className="w-3.5 h-3.5 text-[#1a7a4a] flex-shrink-0" />}
        </div>
        <span className={`ml-6 text-[12px] font-mono font-semibold ${neg ? 'text-red-500' : 'text-[#1a7a4a]'}`}>
          {neg ? '-' : ''}$ {fmt(Math.abs(saldo))}
        </span>
        {cuenta.tipo === 'BANCO' && cuenta.banco && (
          <span className="ml-6 text-[11px] text-[#9db8b2] truncate">{cuenta.banco}</span>
        )}
      </button>
      {!cuenta.cuenta_contable_id && (
        <button
          onClick={onVincular}
          title="Vincular cuenta contable"
          className="ml-9 mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200"
        >
          <AlertTriangle className="w-3 h-3" />
          Sin cuenta contable
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CajaBancos({ onNavegar }) {
  const [cuentas, setCuentas]             = useState([]);
  const [cuentasContables, setCuentasContables] = useState([]);
  const [cuentaEditando, setCuentaEditando]     = useState(null);
  const [cuentaActiva, setCuentaActiva]   = useState(null);
  const [movimientos, setMovimientos]     = useState([]);
  const [loadingCtas, setLoadingCtas]     = useState(false);
  const [loadingMovs, setLoadingMovs]     = useState(false);
  const [errorMovs, setErrorMovs]         = useState(null);
  const [fechaDesde, setFechaDesde]       = useState('');
  const [fechaHasta, setFechaHasta]       = useState('');
  const [busqueda, setBusqueda]           = useState('');
  const [showMovModal, setShowMovModal]   = useState(false);
  const [showCtaModal, setShowCtaModal]   = useState(false);
  const [successMsg, setSuccessMsg]       = useState('');

  function flash(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  }

  // Load accounts
  const cargarCuentas = useCallback(async (keepId) => {
    setLoadingCtas(true);
    try {
      const data = await getCuentasCajaBanco();
      const list = Array.isArray(data) ? data : [];
      setCuentas(list);
      setCuentaActiva((prev) => {
        const targetId = keepId ?? prev?.id;
        return list.find((c) => c.id === targetId) || list[0] || null;
      });
    } catch {
      setCuentas([]);
    } finally {
      setLoadingCtas(false);
    }
  }, []);

  // Load movements for active account
  const cargarMovimientos = useCallback(async () => {
    if (!cuentaActiva) { setMovimientos([]); return; }
    setLoadingMovs(true);
    setErrorMovs(null);
    try {
      const params = { cuenta_id: cuentaActiva.id };
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      const data = await getMovimientos(params);
      setMovimientos(Array.isArray(data) ? data : []);
    } catch (e) {
      setErrorMovs(e.message || 'Error al cargar movimientos.');
    } finally {
      setLoadingMovs(false);
    }
  }, [cuentaActiva, fechaDesde, fechaHasta]);

  useEffect(() => { cargarCuentas(); }, [cargarCuentas]);
  useEffect(() => {
    getCuentasContables()
      .then((data) => setCuentasContables(Array.isArray(data) ? data : []))
      .catch(() => setCuentasContables([]));
  }, []);
  useEffect(() => { cargarMovimientos(); }, [cargarMovimientos]);

  // Local text filter on current list
  const filtrado = useMemo(() => {
    if (!busqueda.trim()) return movimientos;
    const q = busqueda.toLowerCase();
    return movimientos.filter(
      (m) => m.descripcion.toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q),
    );
  }, [movimientos, busqueda]);

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar este movimiento?')) return;
    try {
      await deleteMovimiento(id);
      flash('Movimiento eliminado.');
      cargarMovimientos();
      cargarCuentas(cuentaActiva.id);
    } catch (e) {
      alert(e.message || 'Error al eliminar.');
    }
  }

  const cajas  = cuentas.filter((c) => c.tipo === 'CAJA');
  const bancos = cuentas.filter((c) => c.tipo === 'BANCO');

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex overflow-hidden bg-[#f5f8f8]">

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-[#e0ede8] flex flex-col">
        <div className="px-4 pt-5 pb-3 border-b border-[#e0ede8]">
          <h2 className="text-[12px] font-bold text-[#1a2e2e] tracking-widest uppercase">Caja y Bancos</h2>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-3 space-y-4">
          {loadingCtas ? (
            <p className="px-3 text-[12px] text-[#9db8b2] italic">Cargando…</p>
          ) : (
            <>
              {cajas.length > 0 && (
                <div>
                  <p className="px-3 mb-1 text-[10px] font-bold text-[#9db8b2] uppercase tracking-widest">Cajas</p>
                  <div className="space-y-0.5">
                    {cajas.map((c) => (
                      <SidebarItem
                        key={c.id}
                        cuenta={c}
                        activo={cuentaActiva?.id === c.id}
                        onClick={() => setCuentaActiva(c)}
                        onVincular={() => setCuentaEditando(c)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {bancos.length > 0 && (
                <div>
                  <p className="px-3 mb-1 text-[10px] font-bold text-[#9db8b2] uppercase tracking-widest">Cuentas Bancarias</p>
                  <div className="space-y-0.5">
                    {bancos.map((c) => (
                      <SidebarItem
                        key={c.id}
                        cuenta={c}
                        activo={cuentaActiva?.id === c.id}
                        onClick={() => setCuentaActiva(c)}
                        onVincular={() => setCuentaEditando(c)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {cuentas.length === 0 && (
                <p className="px-3 py-4 text-[12px] text-[#9db8b2] italic text-center">
                  No hay cuentas aún.<br />Agrega una para comenzar.
                </p>
              )}
            </>
          )}
        </div>

        <div className="px-3 py-3 border-t border-[#e0ede8]">
          <button
            onClick={() => setShowCtaModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-[#1a7a4a] hover:bg-[#f0f7f4] rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar cuenta
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {cuentaActiva ? (
          <>
            {/* Account header + toolbar */}
            <div className="bg-white border-b border-[#e0ede8] px-6 pt-5 pb-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                {/* Account info */}
                <div>
                  <div className="flex items-center gap-2.5">
                    {cuentaActiva.tipo === 'BANCO'
                      ? <Building2 className="w-5 h-5 text-[#1a7a4a]" />
                      : <Wallet className="w-5 h-5 text-[#1a7a4a]" />}
                    <h1 className="text-[17px] font-bold text-[#1a2e2e]">{cuentaActiva.nombre}</h1>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      cuentaActiva.tipo === 'BANCO'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {cuentaActiva.tipo === 'BANCO' ? 'Banco' : 'Caja'}
                    </span>
                    <BtnIcon onClick={() => setCuentaEditando(cuentaActiva)} title="Editar cuenta">
                      <Pencil className="w-3.5 h-3.5" />
                    </BtnIcon>
                  </div>
                  {cuentaActiva.banco && (
                    <p className="ml-[30px] text-[12px] text-[#6b8f8f] mt-0.5">
                      {cuentaActiva.banco}
                      {cuentaActiva.numero_cuenta && ` · ${cuentaActiva.numero_cuenta}`}
                    </p>
                  )}
                  {cuentaActiva.cuenta_contable_id ? (
                    <p className="ml-[30px] text-[12px] text-[#6b8f8f] mt-0.5">
                      Cuenta contable: <span className="font-mono">{cuentaActiva.cuenta_contable_codigo}</span>
                      {' · '}{cuentaActiva.cuenta_contable_nombre}
                    </p>
                  ) : (
                    <div className="ml-[30px] mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span className="text-[12px] text-amber-800">
                        Sin cuenta contable: no se pueden registrar pagos desde esta cuenta.
                      </span>
                      <button
                        onClick={() => setCuentaEditando(cuentaActiva)}
                        className="text-[12px] font-semibold text-amber-800 underline whitespace-nowrap"
                      >
                        Vincular ahora
                      </button>
                    </div>
                  )}
                </div>

                {/* Current balance */}
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] text-[#6b8f8f] font-medium">Saldo actual</p>
                  <p className={`text-[22px] font-bold font-mono leading-tight ${
                    parseFloat(cuentaActiva.saldo_actual) < 0 ? 'text-red-500' : 'text-[#1a4731]'
                  }`}>
                    $ {fmt(cuentaActiva.saldo_actual)}
                  </p>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="px-2.5 py-1.5 text-[12px] rounded-md border border-[#c8ddd6] bg-white focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]/25 text-[#1a2e2e]"
                />
                <span className="text-[12px] text-[#9db8b2]">—</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="px-2.5 py-1.5 text-[12px] rounded-md border border-[#c8ddd6] bg-white focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]/25 text-[#1a2e2e]"
                />
                {(fechaDesde || fechaHasta) && (
                  <button
                    onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                    className="p-1.5 rounded-md text-[#9db8b2] hover:bg-[#f0f7f4] hover:text-[#1a2e2e] transition-colors"
                    title="Limpiar fechas"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="relative ml-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9db8b2] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar…"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-[12px] rounded-md border border-[#c8ddd6] bg-white focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]/25 w-40 placeholder:text-[#9db8b2]"
                  />
                </div>

                <BtnPrimary onClick={() => setShowMovModal(true)} className="ml-auto">
                  <Plus className="w-4 h-4" />
                  Nuevo Movimiento
                </BtnPrimary>
              </div>
            </div>

            {/* Transaction table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {successMsg && (
                <div className="mx-5 mt-3">
                  <AlertSuccess>{successMsg}</AlertSuccess>
                </div>
              )}
              {errorMovs && (
                <div className="mx-5 mt-3">
                  <AlertError>{errorMovs}</AlertError>
                </div>
              )}

              <table className="w-full text-[13px]">
                <THead>
                  <Th>Fecha</Th>
                  <Th>Descripción</Th>
                  <Th>Categoría</Th>
                  <Th>Tipo</Th>
                  <Th className="text-right">Monto</Th>
                  <Th className="text-right">Saldo</Th>
                  <Th className="w-12 text-center">Doc.</Th>
                  <Th className="w-8" />
                </THead>
                <TBody>
                  {loadingMovs ? (
                    <LoadingRows cols={8} />
                  ) : filtrado.length === 0 ? (
                    <EmptyRow
                      cols={8}
                      message={
                        movimientos.length === 0
                          ? 'Sin movimientos. Usa "Nuevo Movimiento" para registrar el primer ingreso o egreso.'
                          : 'Sin resultados para la búsqueda.'
                      }
                    />
                  ) : (
                    [...filtrado].reverse().map((m) => {
                      const esIngreso = m.tipo === 'INGRESO';
                      const saldoVal  = parseFloat(m.saldo_despues);
                      const saldoNeg  = saldoVal < 0;
                      return (
                        <tr
                          key={m.id}
                          className="border-b border-[#eaf2ee] hover:bg-[#f5faf7] group transition-colors"
                        >
                          <Td className="whitespace-nowrap text-[12px] text-[#6b8f8f]">{m.fecha}</Td>
                          <Td>
                            <span
                              className="block max-w-[240px] truncate font-medium text-[#1a2e2e]"
                              title={m.descripcion}
                            >
                              {m.descripcion}
                            </span>
                          </Td>
                          <Td className="text-[12px] text-[#6b8f8f]">{m.categoria || '—'}</Td>
                          <Td>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${
                              esIngreso
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                : 'bg-red-50 text-red-600 ring-red-200'
                            }`}>
                              {esIngreso
                                ? <TrendingUp className="w-3 h-3" />
                                : <TrendingDown className="w-3 h-3" />}
                              {m.tipo_display}
                            </span>
                          </Td>
                          <Td className={`text-right font-mono font-semibold whitespace-nowrap ${
                            esIngreso ? 'text-emerald-700' : 'text-red-500'
                          }`}>
                            {esIngreso ? '+' : '-'} {fmt(m.monto)}
                          </Td>
                          <Td className={`text-right font-mono text-[12px] whitespace-nowrap ${
                            saldoNeg ? 'text-red-500' : 'text-[#1a4731]'
                          }`}>
                            {saldoNeg ? '-' : ''}$ {fmt(Math.abs(saldoVal))}
                          </Td>
                          <Td className="text-center">
                            {m.comprobante_url ? (
                              <a
                                href={m.comprobante_url}
                                target="_blank"
                                rel="noreferrer"
                                title={m.comprobante_nombre}
                                className="inline-flex items-center justify-center text-[#1a7a4a] hover:text-[#0f5c38]"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-[#d0ddd8]">—</span>
                            )}
                          </Td>
                          <Td>
                            <button
                              onClick={() => handleEliminar(m.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[#9db8b2] hover:text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Td>
                        </tr>
                      );
                    })
                  )}
                </TBody>
              </table>
            </div>
          </>
        ) : (
          /* Empty state when no account selected */
          <div className="flex-1 flex flex-col items-center justify-center text-[#9db8b2] gap-3 p-8">
            <Wallet className="w-14 h-14 opacity-25" />
            <p className="text-[14px] font-medium text-center">
              {cuentas.length === 0
                ? 'Agrega una caja o cuenta bancaria para comenzar'
                : 'Selecciona una cuenta del panel izquierdo'}
            </p>
            {cuentas.length === 0 && (
              <BtnPrimary onClick={() => setShowCtaModal(true)} className="mt-1">
                <Plus className="w-4 h-4" />
                Agregar primera cuenta
              </BtnPrimary>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showMovModal && cuentaActiva && (
        <ModalMovimiento
          cuentaId={cuentaActiva.id}
          onClose={() => setShowMovModal(false)}
          onSaved={() => {
            setShowMovModal(false);
            flash('Movimiento registrado correctamente.');
            cargarMovimientos();
            cargarCuentas(cuentaActiva.id);
          }}
        />
      )}

      {showCtaModal && (
        <ModalCuenta
          cuentasContables={cuentasContables}
          onNavegar={onNavegar}
          onClose={() => setShowCtaModal(false)}
          onSaved={() => {
            setShowCtaModal(false);
            flash('Cuenta creada correctamente.');
            cargarCuentas();
          }}
        />
      )}

      {cuentaEditando && (
        <ModalCuenta
          key={cuentaEditando.id}
          cuenta={cuentaEditando}
          cuentasContables={cuentasContables}
          onNavegar={onNavegar}
          onClose={() => setCuentaEditando(null)}
          onSaved={() => {
            const id = cuentaEditando.id;
            setCuentaEditando(null);
            flash('Cuenta actualizada correctamente.');
            cargarCuentas(id);
          }}
        />
      )}
    </div>
  );
}
