import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Paperclip, X, Plus } from 'lucide-react';
import {
  getAjustesInventario, createAjuste,
  getProductos, getGalpones,
} from '../utils/apiService';
import {
  BtnPrimary, BtnGhost, Badge,
  AlertError, AlertSuccess,
  PageHeader, ContentCard, CardHeader, CardTitle,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
} from '../ui/index.jsx';

function fmt(n, decimals = 2) {
  return Number(n).toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const TIPO_OPTIONS = [
  { value: 'AJUSTE_POSITIVO', label: 'Entrada (Ajuste positivo)' },
  { value: 'AJUSTE_NEGATIVO', label: 'Salida (Ajuste negativo)' },
];

const RAZON_OPTIONS = [
  { value: 'DANO',       label: 'Daño de mercancía' },
  { value: 'CORRECCION', label: 'Corrección de conteo' },
  { value: 'VENCIMIENTO', label: 'Vencimiento' },
  { value: 'OTRO',       label: 'Otro' },
];

const TIPO_LABEL = {
  AJUSTE_POSITIVO: 'Aj. Positivo',
  AJUSTE_NEGATIVO: 'Aj. Negativo',
};

const inputCls =
  'w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors disabled:opacity-50 disabled:bg-[#f5f8f8]';
const inputErrCls =
  'w-full px-3 py-[7px] bg-white border border-red-400 rounded-md text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300/30 transition-colors';
const labelCls =
  'block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5';

function FieldWrap({ label, required, error, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="text-red-400 ml-0.5 normal-case font-normal"> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

const FORM_INIT = {
  fecha: new Date().toISOString().split('T')[0],
  producto_id: '',
  galpon: '',
  tipo: 'AJUSTE_POSITIVO',
  cantidad: '',
  costo_unitario: '',
  razon: '',
  responsable: '',
  notas: '',
  archivo: null,
};

export function AjustesInventario() {
  const [form, setForm] = useState(FORM_INIT);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorForm, setErrorForm] = useState('');

  const [productos, setProductos] = useState([]);
  const [galpones, setGalpones] = useState([]);
  const [log, setLog] = useState([]);
  const [cargandoLog, setCargandoLog] = useState(true);
  const [searchLog, setSearchLog] = useState('');

  const fileRef = useRef(null);

  useEffect(() => {
    cargarLog();
    getProductos({ activo: true, page_size: 500 })
      .then((res) => setProductos((res.results ?? res).filter((p) => p.activo)))
      .catch((_err) => {});
    getGalpones()
      .then((res) => setGalpones((res.results ?? res).filter((g) => g.activo)))
      .catch((_err) => {});
  }, []);

  async function cargarLog() {
    setCargandoLog(true);
    try {
      const res = await getAjustesInventario();
      setLog(res.items);
    } catch (_err) {
      // non-blocking: log failure doesn't block the form
    } finally {
      setCargandoLog(false);
    }
  }

  // Product grouped by category for the <select>
  const productosPorCategoria = useMemo(() => {
    const groups = {};
    for (const p of productos) {
      const cat = p.categoria_nombre || 'Sin categoría';
      (groups[cat] = groups[cat] || []).push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [productos]);

  const productoSeleccionado = useMemo(
    () => productos.find((p) => String(p.id) === String(form.producto_id)),
    [productos, form.producto_id],
  );

  // Log filtered
  const logFiltrado = useMemo(() => {
    if (!searchLog) return log;
    const q = searchLog.toLowerCase();
    return log.filter(
      (r) =>
        r.producto.toLowerCase().includes(q) ||
        r.numero_documento.toLowerCase().includes(q) ||
        r.tipo_documento.toLowerCase().includes(q),
    );
  }, [log, searchLog]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
    if (savedMsg) setSavedMsg('');
  }

  function validate() {
    const e = {};
    if (!form.fecha) e.fecha = 'Requerido';
    if (!form.producto_id) e.producto_id = 'Requerido';
    if (!form.tipo) e.tipo = 'Requerido';
    if (!form.cantidad || Number(form.cantidad) <= 0) e.cantidad = 'Debe ser > 0';
    if (!form.razon) e.razon = 'Requerido';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length > 0) {
      setErrors(e2);
      return;
    }
    setGuardando(true);
    setErrorForm('');
    setSavedMsg('');
    try {
      const res = await createAjuste({
        fecha: form.fecha,
        producto_id: Number(form.producto_id),
        tipo: form.tipo,
        cantidad: form.cantidad,
        costo_unitario: form.costo_unitario || '0',
        razon: form.razon,
        notas: form.notas,
        galpon: form.galpon,
        responsable: form.responsable || undefined,
        archivo_nombre: form.archivo?.name || '',
      });
      setSavedMsg(`Ajuste registrado con documento ${res.numero_documento}.`);
      setForm(FORM_INIT);
      setErrors({});
      await cargarLog();
    } catch (err) {
      setErrorForm(err.message || 'Error al guardar el ajuste');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <PageHeader
          title="Ajustes de Inventario"
          subtitle="Registra entradas o salidas manuales por daño, corrección u otros motivos"
        />

        {/* ── Formulario ── */}
        <ContentCard className="mb-4">
          <CardHeader>
            <CardTitle>Nuevo ajuste</CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit} noValidate>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Fila 1: Fecha | Tipo */}
              <FieldWrap label="Fecha" required error={errors.fecha}>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setField('fecha', e.target.value)}
                  className={errors.fecha ? inputErrCls : inputCls}
                />
              </FieldWrap>

              <FieldWrap label="Tipo de ajuste" required error={errors.tipo}>
                <select
                  value={form.tipo}
                  onChange={(e) => setField('tipo', e.target.value)}
                  className={errors.tipo ? inputErrCls : inputCls}
                >
                  {TIPO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FieldWrap>

              {/* Fila 2: Producto (full width) */}
              <div className="sm:col-span-2">
                <FieldWrap label="Producto" required error={errors.producto_id}>
                  <select
                    value={form.producto_id}
                    onChange={(e) => setField('producto_id', e.target.value)}
                    className={errors.producto_id ? inputErrCls : inputCls}
                  >
                    <option value="">— Selecciona un producto —</option>
                    {productosPorCategoria.map(([cat, items]) => (
                      <optgroup key={cat} label={cat}>
                        {items.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.codigo})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </FieldWrap>
              </div>

              {/* Fila 3: Galpón | Responsable */}
              <FieldWrap label="Galpón / Ubicación">
                <select
                  value={form.galpon}
                  onChange={(e) => setField('galpon', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Todos / General</option>
                  {galpones.map((g) => (
                    <option key={g.id} value={g.nombre}>{g.nombre}</option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Responsable">
                <input
                  type="text"
                  placeholder="Nombre de quien realiza el ajuste"
                  value={form.responsable}
                  onChange={(e) => setField('responsable', e.target.value)}
                  className={inputCls}
                />
              </FieldWrap>

              {/* Fila 4: Motivo (full width) */}
              <div className="sm:col-span-2">
                <FieldWrap label="Motivo" required error={errors.razon}>
                  <select
                    value={form.razon}
                    onChange={(e) => setField('razon', e.target.value)}
                    className={errors.razon ? inputErrCls : inputCls}
                  >
                    <option value="">— Selecciona un motivo —</option>
                    {RAZON_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </FieldWrap>
              </div>

              {/* Fila 4: Cantidad | Costo Unitario */}
              <FieldWrap
                label={`Cantidad${productoSeleccionado ? ` (${productoSeleccionado.unidad_abreviatura})` : ''}`}
                required
                error={errors.cantidad}
              >
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  placeholder="0.00"
                  value={form.cantidad}
                  onChange={(e) => setField('cantidad', e.target.value)}
                  className={errors.cantidad ? inputErrCls : inputCls}
                />
              </FieldWrap>

              <FieldWrap label="Costo unitario ($)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.costo_unitario}
                  onChange={(e) => setField('costo_unitario', e.target.value)}
                  className={inputCls}
                />
              </FieldWrap>

              {/* Fila 5: Notas (full width) */}
              <div className="sm:col-span-2">
                <FieldWrap label="Notas adicionales">
                  <textarea
                    rows={2}
                    placeholder="Descripción detallada del ajuste (opcional)"
                    value={form.notas}
                    onChange={(e) => setField('notas', e.target.value)}
                    className={`${inputCls} resize-none`}
                  />
                </FieldWrap>
              </div>

              {/* Fila 6: Archivo adjunto (full width) */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Archivo adjunto</label>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setField('archivo', e.target.files?.[0] ?? null)}
                />
                {form.archivo ? (
                  <div className="flex items-center gap-2 px-3 py-[7px] bg-[#f0f5f5] border border-[#dde8e8] rounded-md">
                    <Paperclip className="w-3.5 h-3.5 text-[#6b8f8f] flex-shrink-0" />
                    <span className="text-[13px] text-[#1a2e2e] flex-1 truncate">
                      {form.archivo.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setField('archivo', null); fileRef.current.value = ''; }}
                      className="p-0.5 rounded text-[#aebfbf] hover:text-[#1a2e2e] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-[7px] w-full bg-white border border-dashed border-[#dde8e8] rounded-md text-[13px] text-[#aebfbf] hover:border-[#012d1d] hover:text-[#6b8f8f] transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    Adjuntar archivo...
                  </button>
                )}
                <p className="mt-1 text-[11px] text-[#aebfbf]">
                  El nombre del archivo quedará registrado en las observaciones del movimiento.
                </p>
              </div>
            </div>

            {/* Footer del formulario */}
            <div className="px-5 py-3 border-t border-[#f0f5f5] flex items-center justify-between gap-3">
              <div className="flex-1">
                {savedMsg && <AlertSuccess>{savedMsg}</AlertSuccess>}
                {errorForm && <AlertError>{errorForm}</AlertError>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <BtnGhost
                  type="button"
                  onClick={() => { setForm(FORM_INIT); setErrors({}); setErrorForm(''); setSavedMsg(''); }}
                >
                  Limpiar
                </BtnGhost>
                <BtnPrimary type="submit" loading={guardando}>
                  <Plus className="w-3.5 h-3.5" />
                  Registrar ajuste
                </BtnPrimary>
              </div>
            </div>
          </form>
        </ContentCard>

        {/* ── Log de ajustes recientes ── */}
        <ContentCard>
          <CardHeader>
            <CardTitle>Ajustes recientes</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                className="bg-white border border-[#dde8e8] rounded-md pl-8 pr-3 py-[6px] text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors w-48"
              />
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <THead>
                <Th>Fecha</Th>
                <Th>Documento</Th>
                <Th>Producto</Th>
                <Th center>Tipo</Th>
                <Th right>Cantidad</Th>
                <Th right>Costo Unit.</Th>
                <Th right>Valor</Th>
                <Th>Responsable</Th>
                <Th>Observaciones</Th>
              </THead>
              <TBody>
                {cargandoLog && <LoadingRows cols={9} rows={5} />}

                {!cargandoLog && logFiltrado.length === 0 && (
                  <EmptyRow
                    icon={Plus}
                    title={searchLog ? 'Sin resultados' : 'Sin ajustes registrados'}
                    subtitle={searchLog ? 'Prueba con otro término' : 'Los ajustes que registres aparecerán aquí'}
                    cols={9}
                  />
                )}

                {!cargandoLog &&
                  logFiltrado.map((row) => (
                    <tr key={row.id} className="hover:bg-[#fafcfc] transition-colors">
                      <Td muted className="text-[12px] whitespace-nowrap">{row.fecha}</Td>
                      <Td mono muted className="text-[11px]">{row.numero_documento || '—'}</Td>
                      <Td>
                        <p className="font-medium text-[#1a2e2e] leading-tight text-[13px]">
                          {row.producto}
                        </p>
                        <p className="text-[11px] font-mono text-[#6b8f8f] mt-0.5">
                          {row.producto_codigo}
                        </p>
                      </Td>
                      <Td center>
                        <Badge variant={row.badge_variant}>
                          {TIPO_LABEL[row.tipo_documento] ?? row.tipo_documento}
                        </Badge>
                      </Td>
                      <Td right>
                        <span
                          className={`font-semibold text-[13px] ${
                            row.tipo_documento === 'AJUSTE_POSITIVO'
                              ? 'text-sky-600'
                              : 'text-red-600'
                          }`}
                        >
                          {row.tipo_documento === 'AJUSTE_POSITIVO' ? '+' : '-'}
                          {fmt(row.cantidad)}
                        </span>
                        <span className="text-[11px] text-[#aebfbf] ml-1">{row.unidad}</span>
                      </Td>
                      <Td right muted className="font-mono text-[12px]">
                        {Number(row.costo_unitario) > 0 ? `$${fmt(row.costo_unitario, 0)}` : '—'}
                      </Td>
                      <Td right className="font-medium text-[13px]">
                        {Number(row.valor) > 0 ? `$${fmt(row.valor, 0)}` : '—'}
                      </Td>
                      <Td muted className="text-[12px] whitespace-nowrap">
                        {row.responsable || '—'}
                      </Td>
                      <Td muted className="text-[12px] max-w-[200px]">
                        <span className="line-clamp-2">{row.observaciones || '—'}</span>
                      </Td>
                    </tr>
                  ))}
              </TBody>
            </table>
          </div>

          {!cargandoLog && (
            <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
              {logFiltrado.length} de {log.length} ajustes
              {searchLog ? ' (filtrado)' : ' (últimos 100)'}
            </div>
          )}
        </ContentCard>
      </div>
    </main>
  );
}

export default AjustesInventario;
