import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Search, FileText, Paperclip, X, CheckCircle2 } from 'lucide-react';
import {
  getFacturasProveedor, createFacturaProveedor,
  getFacturaProveedor, updateEstadoFactura,
  getOrdenesCompra, getOrdenCompra,
  getProveedores, getRecepcionesMercancia,
} from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, BtnGhost, BtnDestructive,
  Badge, AlertError, AlertSuccess,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
  Drawer, DrawerHeader, DrawerBody,
} from '../ui/index.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso() { return new Date().toISOString().split('T')[0]; }

function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtMonto(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CONDICION_OPTIONS = [
  { value: 'CONTADO', label: 'Contado' },
  { value: '15_DIAS', label: '15 días' },
  { value: '30_DIAS', label: '30 días' },
  { value: '45_DIAS', label: '45 días' },
  { value: '60_DIAS', label: '60 días' },
  { value: '90_DIAS', label: '90 días' },
];

const FORM_INIT = {
  numero_factura: '',
  fecha: todayIso(),
  proveedor_id: '',
  orden_compra_id: '',
  fecha_vencimiento: '',
  condiciones_pago: '30_DIAS',
  notas: '',
  retencion: '0',
};

const ITEM_INIT = () => ({
  _key: Date.now() + Math.random(),
  producto_id: '',
  descripcion: '',
  cantidad: '',
  precio_unitario: '',
  impuesto_pct: '0',
});

// ─── Component ────────────────────────────────────────────────────────────────

export function FacturasProveedor() {
  const [facturas, setFacturas] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, borradores: 0, pendientes: 0, pagadas: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Drawers
  const [drawer, setDrawer] = useState(null); // null | 'nueva' | 'detalle'
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');

  // Nueva factura form
  const [form, setForm] = useState({ ...FORM_INIT, fecha: todayIso() });
  const [formItems, setFormItems] = useState([ITEM_INIT()]);
  const [formErrors, setFormErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [archivoNombre, setArchivoNombre] = useState('');
  const fileRef = useRef(null);
  const [cargandoOC, setCargandoOC] = useState(false);
  const [recepciones, setRecepciones] = useState([]);
  const [selectedRecs, setSelectedRecs] = useState(new Set());
  const [advertenciaMsg, setAdvertenciaMsg] = useState('');

  // Detail actions
  const [accionPendiente, setAccionPendiente] = useState(null); // 'PENDIENTE'|'PAGADA'|'ANULADA'
  const [aplicandoAccion, setAplicandoAccion] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  // Catalogues
  const [proveedores, setProveedores] = useState([]);
  const [todasOrdenes, setTodasOrdenes] = useState([]);

  useEffect(() => {
    cargar();
    getProveedores({ activo: true, page_size: 500 })
      .then((res) => setProveedores((res.results ?? res).filter((p) => p.activo !== false)))
      .catch(() => {});
    getOrdenesCompra()
      .then((res) => setTodasOrdenes(res.items))
      .catch(() => {});
  }, []);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const res = await getFacturasProveedor();
      setFacturas(res.items);
      setResumen(res.resumen);
    } catch (err) {
      setError(err.message || 'Error al cargar facturas');
    } finally {
      setCargando(false);
    }
  }

  // ── Detalle ───────────────────────────────────────────────────────────────
  async function abrirDetalle(id) {
    setDrawer('detalle');
    setDetalle(null);
    setAccionPendiente(null);
    setErrorAccion('');
    setCargandoDetalle(true);
    try {
      const res = await getFacturaProveedor(id);
      setDetalle(res);
    } catch (err) {
      setErrorDetalle(err.message || 'Error al cargar factura');
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function aplicarAccion() {
    if (!accionPendiente || !detalle) return;
    setAplicandoAccion(true);
    setErrorAccion('');
    try {
      const res = await updateEstadoFactura(detalle.id, accionPendiente);
      setDetalle((prev) => ({ ...prev, ...res }));
      setFacturas((prev) =>
        prev.map((f) => (f.id === detalle.id ? { ...f, ...res } : f)),
      );
      setAccionPendiente(null);
    } catch (err) {
      setErrorAccion(err.message || 'Error al actualizar estado');
    } finally {
      setAplicandoAccion(false);
    }
  }

  // ── Drawer nueva ──────────────────────────────────────────────────────────
  function abrirNueva() {
    setForm({ ...FORM_INIT, fecha: todayIso() });
    setFormItems([ITEM_INIT()]);
    setFormErrors({});
    setSavedMsg('');
    setArchivoNombre('');
    setRecepciones([]);
    setSelectedRecs(new Set());
    setAdvertenciaMsg('');
    setDrawer('nueva');
  }

  function cerrarDrawer() {
    setDrawer(null);
    setDetalle(null);
    setAccionPendiente(null);
    setErrorDetalle('');
    setErrorAccion('');
  }

  // ── OC selector: auto-fill items ─────────────────────────────────────────
  async function handleSelectOC(id) {
    setForm((p) => ({ ...p, orden_compra_id: id }));
    setRecepciones([]);
    setSelectedRecs(new Set());
    if (!id) return;
    setCargandoOC(true);
    try {
      const [oc, recs] = await Promise.all([
        getOrdenCompra(Number(id)),
        getRecepcionesMercancia({ orden_id: id, libres: 'true' }),
      ]);
      if (oc.items?.length > 0) {
        setFormItems(
          oc.items.map((i) => ({
            _key: Date.now() + Math.random(),
            producto_id: i.producto_id,
            descripcion: i.producto,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
            impuesto_pct: i.impuesto_pct,
          })),
        );
      }
      setRecepciones(recs.items ?? []);
    } catch (_) {
    } finally {
      setCargandoOC(false);
    }
  }

  function toggleRecepcion(id) {
    setSelectedRecs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Form items ────────────────────────────────────────────────────────────
  const ordenesDelProveedor = useMemo(
    () =>
      todasOrdenes.filter(
        (o) =>
          String(o.proveedor_id) === String(form.proveedor_id) &&
          o.estado !== 'CANCELADA',
      ),
    [todasOrdenes, form.proveedor_id],
  );

  function addItem() { setFormItems((p) => [...p, ITEM_INIT()]); }
  function removeItem(key) { setFormItems((p) => p.filter((i) => i._key !== key)); }
  function updateItem(key, field, val) {
    setFormItems((p) => p.map((i) => (i._key === key ? { ...i, [field]: val } : i)));
  }

  const totales = useMemo(() => {
    let sub = 0; let imp = 0;
    for (const item of formItems) {
      const cant = parseFloat(item.cantidad) || 0;
      const precio = parseFloat(item.precio_unitario) || 0;
      const pct = parseFloat(item.impuesto_pct) || 0;
      const st = cant * precio;
      sub += st;
      imp += st * pct / 100;
    }
    const ret = parseFloat(form.retencion) || 0;
    return { sub, imp, ret, total: sub + imp - ret };
  }, [formItems, form.retencion]);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(crearCuentaPagar) {
    const e = {};
    if (!form.numero_factura.trim()) e.numero_factura = 'Requerido';
    if (!form.fecha) e.fecha = 'Requerido';
    if (!form.proveedor_id) e.proveedor_id = 'Requerido';
    if (!form.orden_compra_id) e.orden_compra_id = 'Requerido';
    const validos = formItems.filter((i) => i.descripcion.trim() && Number(i.cantidad) > 0);
    if (validos.length === 0) e.items = 'Agrega al menos una línea con descripción y cantidad';
    if (Object.keys(e).length > 0) { setFormErrors(e); return; }

    setGuardando(true);
    setSavedMsg('');
    try {
      const res = await createFacturaProveedor({
        numero_factura:   form.numero_factura.trim(),
        fecha:            form.fecha,
        proveedor_id:     Number(form.proveedor_id),
        orden_compra_id:  Number(form.orden_compra_id),
        fecha_vencimiento: form.fecha_vencimiento || null,
        condiciones_pago: form.condiciones_pago,
        retencion:        form.retencion || '0',
        notas:            form.notas,
        documento_nombre: archivoNombre,
        recepcion_ids:    Array.from(selectedRecs),
        items: validos.map((i) => ({
          producto_id:     i.producto_id ? Number(i.producto_id) : null,
          descripcion:     i.descripcion.trim(),
          cantidad:        i.cantidad,
          precio_unitario: i.precio_unitario || '0',
          impuesto_pct:    i.impuesto_pct || '0',
        })),
        crear_cuenta_pagar: crearCuentaPagar,
      });
      if (res.advertencia) {
        setAdvertenciaMsg(res.advertencia);
      }
      setSavedMsg(
        crearCuentaPagar
          ? `Factura ${res.numero_factura} registrada y cuenta por pagar creada.`
          : `Factura ${res.numero_factura} guardada como borrador.`,
      );
      await cargar();
      setTimeout(cerrarDrawer, 1400);
    } catch (err) {
      setFormErrors({ _global: err.message || 'Error al guardar' });
    } finally {
      setGuardando(false);
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const listFiltrada = useMemo(() => {
    if (!search) return facturas;
    const q = search.toLowerCase();
    return facturas.filter(
      (f) =>
        f.numero_factura.toLowerCase().includes(q) ||
        f.proveedor.toLowerCase().includes(q) ||
        f.orden_compra_numero.toLowerCase().includes(q) ||
        f.estado_label.toLowerCase().includes(q),
    );
  }, [facturas, search]);

  // ── Label helpers ─────────────────────────────────────────────────────────
  function fieldLabel(txt, required = false) {
    return (
      <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
        {txt}{required && <span className="text-red-400 ml-0.5"> *</span>}
      </label>
    );
  }

  function inputCls(err) {
    return `w-full px-3 py-[7px] bg-white border rounded-md text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:ring-1 transition-colors ${
      err ? 'border-red-400 focus:border-red-400 focus:ring-red-300/30' : 'border-[#dde8e8] focus:border-[#012d1d] focus:ring-[#012d1d]/10'
    }`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <PageHeader
          title="Facturas de Proveedor"
          subtitle="Registra facturas de compra y genera cuentas por pagar"
        >
          <BtnPrimary onClick={abrirNueva}>
            <Plus className="w-3.5 h-3.5" />
            Nueva Factura
          </BtnPrimary>
        </PageHeader>

        {/* Summary cards */}
        {!cargando && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total', value: resumen.total, cls: 'bg-white border-[#e4ecec]', txtCls: 'text-[#1a2e2e]' },
              { label: 'Borradores', value: resumen.borradores, cls: 'bg-white border-[#e4ecec]', txtCls: 'text-[#aebfbf]' },
              { label: 'Pendientes', value: resumen.pendientes, cls: resumen.pendientes > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#e4ecec]', txtCls: resumen.pendientes > 0 ? 'text-amber-700' : 'text-[#aebfbf]' },
              { label: 'Pagadas', value: resumen.pagadas, cls: resumen.pagadas > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-[#e4ecec]', txtCls: resumen.pagadas > 0 ? 'text-emerald-700' : 'text-[#aebfbf]' },
            ].map((c) => (
              <div key={c.label} className={`border rounded-lg px-4 py-3 ${c.cls}`}>
                <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wide">{c.label}</p>
                <p className={`text-[22px] font-bold mt-1 leading-tight ${c.txtCls}`}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {error && <AlertError onRetry={cargar}>{error}</AlertError>}

        <ContentCard>
          {/* Search */}
          <div className="px-4 py-3 border-b border-[#e4ecec] flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por N° factura, proveedor, OC, estado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-[#dde8e8] rounded-md pl-8 pr-3 py-[7px] text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <THead>
                <Th>N° Factura</Th>
                <Th>Fecha</Th>
                <Th>Proveedor</Th>
                <Th>OC vinculada</Th>
                <Th right>Total a pagar</Th>
                <Th>Vencimiento</Th>
                <Th center>Estado</Th>
              </THead>
              <TBody>
                {cargando && <LoadingRows cols={7} rows={5} />}
                {!cargando && listFiltrada.length === 0 && (
                  <EmptyRow
                    icon={FileText}
                    title={search ? 'Sin resultados' : 'Sin facturas registradas'}
                    subtitle={search ? 'Prueba con otro término' : 'Crea la primera factura con "Nueva Factura"'}
                    cols={7}
                  />
                )}
                {!cargando &&
                  listFiltrada.map((f) => (
                    <tr
                      key={f.id}
                      className="hover:bg-[#fafcfc] transition-colors cursor-pointer"
                      onClick={() => abrirDetalle(f.id)}
                    >
                      <Td>
                        <span className="font-mono font-semibold text-[13px] text-[#012d1d]">
                          {f.numero_factura}
                        </span>
                      </Td>
                      <Td muted className="text-[12px] whitespace-nowrap">{fmtFecha(f.fecha)}</Td>
                      <Td className="max-w-[160px] truncate">{f.proveedor}</Td>
                      <Td muted className="text-[12px] font-mono">
                        {f.orden_compra_numero || '—'}
                      </Td>
                      <Td right>
                        <span className="font-mono font-semibold text-[13px]">
                          {fmtMonto(f.total_pagar)}
                        </span>
                      </Td>
                      <Td muted className="text-[12px] whitespace-nowrap">
                        {fmtFecha(f.fecha_vencimiento)}
                      </Td>
                      <Td center>
                        <Badge variant={f.badge_variant}>{f.estado_label}</Badge>
                      </Td>
                    </tr>
                  ))}
              </TBody>
            </table>
          </div>

          {!cargando && (
            <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
              {listFiltrada.length} de {facturas.length} facturas{search ? ' (filtrado)' : ''}
            </div>
          )}
        </ContentCard>
      </div>

      {/* ══ Drawer: Nueva factura ══ */}
      <Drawer open={drawer === 'nueva'} onClose={cerrarDrawer}>
        <DrawerHeader
          title="Nueva Factura de Proveedor"
          icon="request_quote"
          onClose={cerrarDrawer}
          disabled={guardando}
        />
        <DrawerBody>
          {advertenciaMsg && (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{advertenciaMsg}</span>
            </div>
          )}
          {savedMsg && <AlertSuccess>{savedMsg}</AlertSuccess>}
          {formErrors._global && <AlertError>{formErrors._global}</AlertError>}

          <div className="space-y-3">

            {/* ── Bloque 1: Datos básicos ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                {fieldLabel('N° Factura', true)}
                <input
                  type="text"
                  placeholder="Ej: FAC-001234"
                  value={form.numero_factura}
                  onChange={(e) => setForm((p) => ({ ...p, numero_factura: e.target.value }))}
                  className={inputCls(formErrors.numero_factura)}
                />
                {formErrors.numero_factura && (
                  <p className="mt-1 text-[11px] text-red-500">{formErrors.numero_factura}</p>
                )}
              </div>
              <div>
                {fieldLabel('Fecha', true)}
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
                  className={inputCls(formErrors.fecha)}
                />
              </div>
            </div>

            {/* Proveedor */}
            <div>
              {fieldLabel('Proveedor', true)}
              <select
                value={form.proveedor_id}
                onChange={(e) => {
                  setForm((p) => ({ ...p, proveedor_id: e.target.value, orden_compra_id: '' }));
                }}
                className={inputCls(formErrors.proveedor_id)}
              >
                <option value="">— Seleccionar proveedor —</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {formErrors.proveedor_id && (
                <p className="mt-1 text-[11px] text-red-500">{formErrors.proveedor_id}</p>
              )}
            </div>

            {/* OC vinculada */}
            <div>
              {fieldLabel('OC vinculada', true)}
              <select
                value={form.orden_compra_id}
                onChange={(e) => handleSelectOC(e.target.value)}
                disabled={!form.proveedor_id || cargandoOC}
                className={inputCls(formErrors.orden_compra_id) + ' disabled:opacity-50'}
              >
                <option value="">
                  {!form.proveedor_id
                    ? 'Selecciona un proveedor primero'
                    : ordenesDelProveedor.length === 0
                    ? 'Sin órdenes para este proveedor'
                    : '— Selecciona una OC (obligatorio) —'}
                </option>
                {ordenesDelProveedor.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero} ({o.estado_label})
                  </option>
                ))}
              </select>
              {formErrors.orden_compra_id && (
                <p className="mt-1 text-[11px] text-red-500">{formErrors.orden_compra_id}</p>
              )}
              {form.orden_compra_id && (
                <p className="mt-1 text-[11px] text-emerald-600">
                  Líneas auto-completadas desde la OC. Puedes editarlas.
                </p>
              )}
            </div>

            {/* Recepciones libres de la OC */}
            {form.orden_compra_id && (
              <div>
                <p className="text-[11px] font-semibold text-[#1a2e2e] mb-1">
                  Recepciones a cubrir con esta factura
                </p>
                {cargandoOC ? (
                  <p className="text-[11px] text-[#6b8f8f]">Cargando recepciones…</p>
                ) : recepciones.length === 0 ? (
                  <p className="text-[11px] text-[#aebfbf] italic">
                    No hay recepciones disponibles para esta OC (todas ya facturadas o sin recepciones aún).
                  </p>
                ) : (
                  <div className="border border-[#e4ecec] rounded-lg divide-y divide-[#f0f5f5]">
                    {recepciones.map((r) => {
                      const items = r.items ?? [];
                      const MAX = 2;
                      const visibles = items.slice(0, MAX);
                      const resto   = items.length - MAX;
                      const resumen = visibles
                        .map((i) => `${i.producto} · ${parseFloat(i.cantidad).toLocaleString('es-CO')} ${i.unidad}`)
                        .join('  ·  ');
                      const monto = r.monto_provisionado
                        ? Number(r.monto_provisionado).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
                        : null;
                      return (
                        <label key={r.id} className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-[#f8fbfb]">
                          <input
                            type="checkbox"
                            checked={selectedRecs.has(r.id)}
                            onChange={() => toggleRecepcion(r.id)}
                            className="accent-[#012d1d] w-3.5 h-3.5 mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12px] font-semibold text-[#1a2e2e]">
                                REC-{r.id}
                                <span className="ml-1.5 font-normal text-[#6b8f8f]">{r.fecha}</span>
                              </span>
                              {monto && (
                                <span className="text-[11px] font-medium text-[#2d7a5a] shrink-0">
                                  {monto} provisionado
                                </span>
                              )}
                            </div>
                            {resumen && (
                              <p className="text-[11px] text-[#6b8f8f] mt-0.5 truncate">
                                {resumen}
                                {resto > 0 && (
                                  <span className="ml-1 text-[#aebfbf]">+{resto} más</span>
                                )}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Fecha vencimiento + Condiciones pago */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                {fieldLabel('F. Vencimiento')}
                <input
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={(e) => setForm((p) => ({ ...p, fecha_vencimiento: e.target.value }))}
                  className={inputCls(false)}
                />
              </div>
              <div>
                {fieldLabel('Condiciones de pago')}
                <select
                  value={form.condiciones_pago}
                  onChange={(e) => setForm((p) => ({ ...p, condiciones_pago: e.target.value }))}
                  className={inputCls(false)}
                >
                  {CONDICION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Bloque 2: Líneas ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                {fieldLabel('Líneas de la factura', true)}
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 text-[12px] font-semibold text-[#012d1d] hover:text-[#1a3d2d] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar fila
                </button>
              </div>
              {formErrors.items && (
                <p className="mb-2 text-[11px] text-red-500">{formErrors.items}</p>
              )}

              <div className="border border-[#e4ecec] rounded-md overflow-x-auto">
                <table className="text-left border-collapse" style={{ minWidth: 460 }}>
                  <thead>
                    <tr className="bg-[#f5f8f8] border-b border-[#e4ecec]">
                      <th className="px-2 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase">Descripción</th>
                      <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase text-right w-14">Cant.</th>
                      <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase text-right w-20">P. Unit.</th>
                      <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase text-right w-14">IVA%</th>
                      <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase text-right w-20">Subtotal</th>
                      <th className="w-7" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f5f5]">
                    {formItems.map((item) => {
                      const st = (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0);
                      return (
                        <tr key={item._key}>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              placeholder="Descripción del producto/servicio"
                              value={item.descripcion}
                              onChange={(e) => updateItem(item._key, 'descripcion', e.target.value)}
                              className="w-full min-w-[130px] px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] placeholder:text-[#d0dcdc] focus:outline-none focus:border-[#012d1d] transition-colors"
                            />
                          </td>
                          <td className="px-1.5 py-1.5">
                            <input
                              type="number" min="0" step="0.01" placeholder="0"
                              value={item.cantidad}
                              onChange={(e) => updateItem(item._key, 'cantidad', e.target.value)}
                              className="w-full px-1.5 py-1 bg-white border border-[#dde8e8] rounded text-[12px] text-right focus:outline-none focus:border-[#012d1d] transition-colors"
                            />
                          </td>
                          <td className="px-1.5 py-1.5">
                            <input
                              type="number" min="0" step="0.01" placeholder="0.00"
                              value={item.precio_unitario}
                              onChange={(e) => updateItem(item._key, 'precio_unitario', e.target.value)}
                              className="w-full px-1.5 py-1 bg-white border border-[#dde8e8] rounded text-[12px] text-right focus:outline-none focus:border-[#012d1d] transition-colors"
                            />
                          </td>
                          <td className="px-1.5 py-1.5">
                            <input
                              type="number" min="0" max="100" step="0.01" placeholder="0"
                              value={item.impuesto_pct}
                              onChange={(e) => updateItem(item._key, 'impuesto_pct', e.target.value)}
                              className="w-full px-1.5 py-1 bg-white border border-[#dde8e8] rounded text-[12px] text-right focus:outline-none focus:border-[#012d1d] transition-colors"
                            />
                          </td>
                          <td className="px-1.5 py-1.5 text-right">
                            <span className="text-[12px] font-mono text-[#4a6060]">
                              {fmtMonto(st)}
                            </span>
                          </td>
                          <td className="px-1 py-1.5">
                            {formItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(item._key)}
                                className="p-1 rounded text-[#aebfbf] hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Bloque 3: Totales ── */}
              <div className="mt-3 border border-[#e4ecec] rounded-md bg-[#fafcfc] px-4 py-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-2">
                  Resumen de importes
                </p>
                {[
                  { label: 'Subtotal', value: totales.sub, muted: true },
                  { label: 'Impuesto', value: totales.imp, muted: true },
                ].map(({ label, value, muted }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className={`text-[13px] ${muted ? 'text-[#6b8f8f]' : 'text-[#1a2e2e]'}`}>
                      {label}
                    </span>
                    <span className="font-mono text-[13px] text-[#4a6060]">{fmtMonto(value)}</span>
                  </div>
                ))}

                {/* Retención editable */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-[#6b8f8f] flex-1">Retención ISLR / IVA</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] text-[#aebfbf]">−</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.retencion}
                      onChange={(e) => setForm((p) => ({ ...p, retencion: e.target.value }))}
                      className="w-28 px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] font-mono text-right focus:outline-none focus:border-[#012d1d] transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#e4ecec] pt-2 mt-1">
                  <span className="text-[14px] font-bold text-[#1a2e2e]">Total a pagar</span>
                  <span className="font-mono text-[15px] font-bold text-[#012d1d]">
                    {fmtMonto(totales.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Bloque 4: Adjunto + Notas ── */}
            <div>
              {fieldLabel('Archivo adjunto')}
              <input
                type="file"
                ref={fileRef}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.xml"
                onChange={(e) => setArchivoNombre(e.target.files?.[0]?.name ?? '')}
              />
              {archivoNombre ? (
                <div className="inline-flex items-center gap-2 px-3 py-[6px] bg-sky-50 border border-sky-200 rounded-md text-[12px] text-sky-700 font-medium">
                  <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[220px]">{archivoNombre}</span>
                  <button
                    type="button"
                    onClick={() => { setArchivoNombre(''); if (fileRef.current) fileRef.current.value = ''; }}
                    className="hover:text-sky-900 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-[6px] bg-white border border-[#dde8e8] rounded-md text-[12px] text-[#4a6060] hover:bg-[#f0f5f5] hover:border-[#c4d8d8] transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Adjuntar factura en PDF / imagen
                </button>
              )}
            </div>

            <div>
              {fieldLabel('Notas')}
              <textarea
                rows={2}
                placeholder="Observaciones (opcional)"
                value={form.notas}
                onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
                className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors resize-none"
              />
            </div>

          </div>
        </DrawerBody>

        {/* Custom 3-button footer */}
        <div className="px-5 py-4 border-t border-[#e4ecec] flex gap-2 flex-shrink-0">
          <BtnGhost onClick={cerrarDrawer} disabled={guardando} className="flex-none px-3">
            Cancelar
          </BtnGhost>
          <BtnSecondary
            onClick={() => handleSubmit(false)}
            disabled={guardando}
            className="flex-1 justify-center text-[12px]"
          >
            Guardar borrador
          </BtnSecondary>
          <BtnPrimary
            onClick={() => handleSubmit(true)}
            loading={guardando}
            className="flex-1 justify-center text-[12px]"
          >
            <span className="material-symbols-outlined text-[14px]">payments</span>
            Crear cuenta por pagar
          </BtnPrimary>
        </div>
      </Drawer>

      {/* ══ Drawer: Detalle ══ */}
      <Drawer open={drawer === 'detalle'} onClose={cerrarDrawer}>
        <DrawerHeader
          title={detalle ? detalle.numero_factura : 'Detalle'}
          subtitle={detalle ? detalle.proveedor : ''}
          icon="request_quote"
          onClose={cerrarDrawer}
          disabled={aplicandoAccion}
        />
        <DrawerBody>
          {cargandoDetalle && (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-[#aebfbf] text-[28px]">
                progress_activity
              </span>
            </div>
          )}

          {errorDetalle && <AlertError>{errorDetalle}</AlertError>}

          {!cargandoDetalle && detalle && (
            <div className="space-y-4">

              {/* Estado badge */}
              <div className="flex items-center gap-2">
                <Badge variant={detalle.badge_variant} dot>{detalle.estado_label}</Badge>
                {detalle.orden_compra_numero && (
                  <span className="text-[12px] text-[#6b8f8f]">
                    OC: <span className="font-mono font-semibold text-[#012d1d]">{detalle.orden_compra_numero}</span>
                  </span>
                )}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'N° Factura', value: <span className="font-mono font-semibold">{detalle.numero_factura}</span> },
                  { label: 'Fecha factura', value: fmtFecha(detalle.fecha) },
                  { label: 'Vencimiento', value: fmtFecha(detalle.fecha_vencimiento) },
                  { label: 'Condiciones', value: detalle.condiciones_pago_label },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#f5f8f8] rounded-md px-3 py-2">
                    <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-0.5">{label}</p>
                    <div className="text-[13px] font-medium text-[#1a2e2e]">{value}</div>
                  </div>
                ))}
              </div>

              {/* Líneas */}
              <div>
                <p className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-2">
                  Líneas ({detalle.items?.length ?? 0})
                </p>
                <div className="border border-[#e4ecec] rounded-md overflow-x-auto">
                  <table className="w-full text-left border-collapse" style={{ minWidth: 380 }}>
                    <thead>
                      <tr className="bg-[#f5f8f8] border-b border-[#e4ecec]">
                        <th className="px-2 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase">Descripción</th>
                        <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase text-right">Cant.</th>
                        <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase text-right">P.Unit.</th>
                        <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f5f5]">
                      {(detalle.items ?? []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-2 py-2">
                            <p className="text-[12px] font-medium text-[#1a2e2e] leading-tight">{item.descripcion}</p>
                          </td>
                          <td className="px-1.5 py-2 text-right text-[12px] font-mono text-[#4a6060] whitespace-nowrap">
                            {item.cantidad}
                          </td>
                          <td className="px-1.5 py-2 text-right text-[12px] font-mono text-[#4a6060] whitespace-nowrap">
                            {fmtMonto(item.precio_unitario)}
                          </td>
                          <td className="px-1.5 py-2 text-right text-[12px] font-mono font-semibold text-[#1a2e2e] whitespace-nowrap">
                            {fmtMonto(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals block */}
              <div className="bg-[#f5f8f8] rounded-md px-4 py-3 space-y-1.5">
                {[
                  { label: 'Subtotal',   value: detalle.subtotal,       bold: false },
                  { label: 'Impuesto',   value: detalle.monto_impuesto, bold: false },
                  { label: '− Retención', value: `-${fmtMonto(detalle.retencion)}`, bold: false, raw: true },
                ].map(({ label, value, bold, raw }) => (
                  <div key={label} className="flex justify-between text-[13px] text-[#6b8f8f]">
                    <span>{label}</span>
                    <span className="font-mono">{raw ? value : fmtMonto(value)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[15px] font-bold text-[#1a2e2e] border-t border-[#e4ecec] pt-2 mt-1">
                  <span>Total a pagar</span>
                  <span className="font-mono text-[#012d1d]">{fmtMonto(detalle.total_pagar)}</span>
                </div>
              </div>

              {/* Documento + Notas */}
              {detalle.documento_nombre && (
                <div className="flex items-center gap-2 text-[12px] text-sky-600">
                  <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                  {detalle.documento_nombre}
                </div>
              )}
              {detalle.notas && (
                <div className="bg-[#f5f8f8] rounded-md px-3 py-2">
                  <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-0.5">Notas</p>
                  <p className="text-[13px] text-[#1a2e2e]">{detalle.notas}</p>
                </div>
              )}

              {/* Actions */}
              {(detalle.estado === 'BORRADOR' || detalle.estado === 'PENDIENTE') && (
                <div className="border border-[#e4ecec] rounded-md p-3 bg-[#fafcfc] space-y-2">
                  <p className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">Acciones</p>
                  {errorAccion && <AlertError>{errorAccion}</AlertError>}

                  {accionPendiente ? (
                    <div className="space-y-2">
                      <p className="text-[13px] text-[#1a2e2e]">
                        ¿Confirmar{' '}
                        <strong>
                          {accionPendiente === 'PENDIENTE' ? 'creación de cuenta por pagar'
                            : 'anulación'}
                        </strong>?
                      </p>
                      <div className="flex gap-2">
                        <BtnGhost onClick={() => setAccionPendiente(null)} disabled={aplicandoAccion} className="flex-1">
                          Cancelar
                        </BtnGhost>
                        {accionPendiente === 'ANULADA' ? (
                          <BtnDestructive
                            onClick={aplicarAccion}
                            disabled={aplicandoAccion}
                            className="flex-1 justify-center border border-red-200"
                          >
                            {aplicandoAccion ? 'Anulando…' : 'Confirmar anulación'}
                          </BtnDestructive>
                        ) : (
                          <BtnPrimary onClick={aplicarAccion} loading={aplicandoAccion} className="flex-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmar
                          </BtnPrimary>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {detalle.estado === 'BORRADOR' && (
                        <BtnPrimary
                          onClick={() => setAccionPendiente('PENDIENTE')}
                          className="w-full justify-center"
                        >
                          <span className="material-symbols-outlined text-[15px]">payments</span>
                          Crear cuenta por pagar
                        </BtnPrimary>
                      )}

                      <BtnDestructive
                        onClick={() => setAccionPendiente('ANULADA')}
                        className="w-full justify-center border border-red-200"
                      >
                        Anular factura
                      </BtnDestructive>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </DrawerBody>
      </Drawer>
    </main>
  );
}

export default FacturasProveedor;
