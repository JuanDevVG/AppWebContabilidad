import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Search, Package, CheckCircle2, XCircle, TruckIcon } from 'lucide-react';
import {
  getOrdenesCompra, createOrdenCompra,
  getOrdenCompra, recibirMercancia, updateEstadoOrden,
  getProductos, getProveedores,
} from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, BtnGhost, BtnDestructive, BtnIcon,
  Badge, AlertError, AlertSuccess,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
  Drawer, DrawerHeader, DrawerBody, DrawerFooter,
} from '../ui/index.jsx';

function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtMonto(val) {
  if (val === undefined || val === null || val === '') return '—';
  return Number(val).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ITEM_INIT = () => ({
  _key: Date.now() + Math.random(),
  producto_id: '',
  cantidad: '',
  precio_unitario: '',
  impuesto_pct: '0',
});

const TIMELINE_STEPS = [
  { estado: 'ABIERTA',   label: 'Abierta',   icon: 'shopping_bag' },
  { estado: 'PARCIAL',   label: 'Parcial',   icon: 'local_shipping' },
  { estado: 'RECIBIDA',  label: 'Recibida',  icon: 'inventory' },
];

export function OrdenesCompra() {
  const [ordenes, setOrdenes] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, abiertas: 0, parciales: 0, recibidas: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [drawer, setDrawer] = useState(null); // null | 'nueva' | 'detalle' | 'recibir'
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');

  // Form nueva orden
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    proveedor_id: '',
    fecha_entrega_esperada: '',
    notas: '',
  });
  const [formItems, setFormItems] = useState([ITEM_INIT()]);
  const [formErrors, setFormErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Recibir mercancía: {[item_id]: {cantidad, lote, fecha_vencimiento}}
  const [recibos, setRecibos] = useState({});
  const [fechaRecepcion, setFechaRecepcion] = useState(() => new Date().toISOString().split('T')[0]);
  const [aplicandoRecibo, setAplicandoRecibo] = useState(false);
  const [errorRecibo, setErrorRecibo] = useState('');

  // Cancelar
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    cargar();
    getProductos({ activo: true, page_size: 500 })
      .then((res) => setProductos((res.results ?? res).filter((p) => p.activo)))
      .catch(() => {});
    getProveedores({ activo: true, page_size: 500 })
      .then((res) => setProveedores((res.results ?? res).filter((p) => p.activo !== false)))
      .catch(() => {});
  }, []);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const res = await getOrdenesCompra();
      setOrdenes(res.items);
      setResumen(res.resumen);
    } catch (err) {
      setError(err.message || 'Error al cargar órdenes');
    } finally {
      setCargando(false);
    }
  }

  async function abrirDetalle(id) {
    setDrawer('detalle');
    setDetalle(null);
    setErrorDetalle('');
    setConfirmCancel(false);
    setCargandoDetalle(true);
    try {
      const res = await getOrdenCompra(id);
      setDetalle(res);
      const init = {};
      (res.items ?? []).forEach((i) => {
        init[i.id] = { cantidad: i.cantidad_recibida, lote: '', fecha_vencimiento: '' };
      });
      setRecibos(init);
    } catch (err) {
      setErrorDetalle(err.message || 'Error al cargar detalle');
    } finally {
      setCargandoDetalle(false);
    }
  }

  function cerrarDrawer() {
    setDrawer(null);
    setDetalle(null);
    setRecibos({});
    setFechaRecepcion(new Date().toISOString().split('T')[0]);
    setErrorDetalle('');
    setErrorRecibo('');
    setSavedMsg('');
    setFormErrors({});
    setConfirmCancel(false);
  }

  function abrirNueva() {
    setForm({
      fecha: new Date().toISOString().split('T')[0],
      proveedor_id: '',
      fecha_entrega_esperada: '',
      notas: '',
    });
    setFormItems([ITEM_INIT()]);
    setFormErrors({});
    setSavedMsg('');
    setDrawer('nueva');
  }

  // ── Line items ────────────────────────────────────────────────────────────
  const productoMap = useMemo(() => {
    const m = {};
    for (const p of productos) m[p.id] = p;
    return m;
  }, [productos]);

  const productosPorCategoria = useMemo(() => {
    const groups = {};
    for (const p of productos) {
      const cat = p.categoria_nombre || 'Sin categoría';
      (groups[cat] = groups[cat] || []).push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [productos]);

  function addItem() { setFormItems((prev) => [...prev, ITEM_INIT()]); }

  function updateItem(key, field, val) {
    setFormItems((prev) => prev.map((i) => (i._key === key ? { ...i, [field]: val } : i)));
  }

  function removeItem(key) {
    setFormItems((prev) => prev.filter((i) => i._key !== key));
  }

  // Totals preview
  const totales = useMemo(() => {
    let sub = 0;
    let imp = 0;
    for (const item of formItems) {
      const cant  = parseFloat(item.cantidad)       || 0;
      const precio = parseFloat(item.precio_unitario) || 0;
      const impPct = parseFloat(item.impuesto_pct)    || 0;
      const subtotal = cant * precio;
      sub += subtotal;
      imp += subtotal * impPct / 100;
    }
    return { sub, imp, total: sub + imp };
  }, [formItems]);

  // ── Submit nueva orden ────────────────────────────────────────────────────
  async function handleSubmit() {
    const e = {};
    if (!form.fecha) e.fecha = 'Requerido';
    if (!form.proveedor_id) e.proveedor_id = 'Requerido';
    const itemsValidos = formItems.filter(
      (i) => i.producto_id && Number(i.cantidad) > 0 && Number(i.precio_unitario) >= 0,
    );
    if (itemsValidos.length === 0) e.items = 'Agrega al menos un producto con cantidad';
    if (Object.keys(e).length > 0) { setFormErrors(e); return; }

    setGuardando(true);
    setSavedMsg('');
    try {
      const res = await createOrdenCompra({
        fecha: form.fecha,
        proveedor_id: Number(form.proveedor_id),
        fecha_entrega_esperada: form.fecha_entrega_esperada || null,
        notas: form.notas,
        items: itemsValidos.map((i) => ({
          producto_id:    Number(i.producto_id),
          cantidad:       i.cantidad,
          precio_unitario: i.precio_unitario,
          impuesto_pct:   i.impuesto_pct || '0',
        })),
      });
      setSavedMsg(`Orden ${res.numero} creada correctamente.`);
      await cargar();
      setTimeout(cerrarDrawer, 1200);
    } catch (err) {
      setFormErrors({ _global: err.message || 'Error al guardar' });
    } finally {
      setGuardando(false);
    }
  }

  // ── Recibir mercancía ─────────────────────────────────────────────────────
  async function handleRecibir() {
    setAplicandoRecibo(true);
    setErrorRecibo('');
    try {
      const payload = Object.entries(recibos).map(([item_id, vals]) => ({
        item_id:           Number(item_id),
        cantidad_recibida: vals.cantidad,
        lote:              vals.lote || null,
        fecha_vencimiento: vals.fecha_vencimiento || null,
      }));
      const res = await recibirMercancia(detalle.id, fechaRecepcion, payload);
      setDetalle(res);
      setOrdenes((prev) =>
        prev.map((o) =>
          o.id === detalle.id
            ? { ...o, estado: res.estado, estado_label: res.estado_label, badge_variant: res.badge_variant }
            : o,
        ),
      );
      setDrawer('detalle');
    } catch (err) {
      setErrorRecibo(err.message || 'Error al registrar recepción');
    } finally {
      setAplicandoRecibo(false);
    }
  }

  // ── Cancelar orden ────────────────────────────────────────────────────────
  async function handleCancelar() {
    setCancelando(true);
    try {
      await updateEstadoOrden(detalle.id, 'CANCELADA');
      setDetalle((prev) => ({ ...prev, estado: 'CANCELADA', estado_label: 'Cancelada', badge_variant: 'critical' }));
      setOrdenes((prev) =>
        prev.map((o) =>
          o.id === detalle.id
            ? { ...o, estado: 'CANCELADA', estado_label: 'Cancelada', badge_variant: 'critical' }
            : o,
        ),
      );
      setConfirmCancel(false);
    } catch (err) {
      setErrorDetalle(err.message || 'Error al cancelar');
    } finally {
      setCancelando(false);
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const listFiltrada = useMemo(() => {
    if (!search) return ordenes;
    const q = search.toLowerCase();
    return ordenes.filter(
      (o) =>
        o.numero.toLowerCase().includes(q) ||
        o.proveedor.toLowerCase().includes(q) ||
        o.estado_label.toLowerCase().includes(q),
    );
  }, [ordenes, search]);

  // ── Timeline helper ───────────────────────────────────────────────────────
  function Timeline({ estado }) {
    if (estado === 'CANCELADA') {
      return (
        <div className="flex items-center gap-2 py-2">
          <span className="material-symbols-outlined text-[16px] text-red-400">cancel</span>
          <span className="text-[12px] text-red-500 font-medium">Orden cancelada</span>
        </div>
      );
    }
    const activeIdx = TIMELINE_STEPS.findIndex((s) => s.estado === estado);
    return (
      <div className="flex items-center gap-0">
        {TIMELINE_STEPS.map((step, idx) => {
          const done    = idx < activeIdx;
          const current = idx === activeIdx;
          return (
            <div key={step.estado} className="flex items-center">
              <div className={`flex flex-col items-center gap-1 min-w-[70px]`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] transition-colors ${
                    done
                      ? 'bg-emerald-100 text-emerald-600'
                      : current
                      ? 'bg-[#012d1d] text-white'
                      : 'bg-[#f0f5f5] text-[#aebfbf]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{step.icon}</span>
                </div>
                <span
                  className={`text-[10px] font-semibold text-center leading-tight ${
                    done ? 'text-emerald-600' : current ? 'text-[#012d1d]' : 'text-[#aebfbf]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-colors ${
                    idx < activeIdx ? 'bg-emerald-300' : 'bg-[#e4ecec]'
                  }`}
                  style={{ width: 28 }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <PageHeader
          title="Órdenes de Compra"
          subtitle="Gestiona órdenes emitidas a proveedores y registra la recepción de mercancía"
        >
          <BtnPrimary onClick={abrirNueva}>
            <Plus className="w-3.5 h-3.5" />
            Nueva Orden
          </BtnPrimary>
        </PageHeader>

        {/* Summary cards */}
        {!cargando && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total', value: resumen.total, cls: 'bg-white border-[#e4ecec]', txtCls: 'text-[#1a2e2e]' },
              { label: 'Abiertas', value: resumen.abiertas, cls: resumen.abiertas > 0 ? 'bg-sky-50 border-sky-200' : 'bg-white border-[#e4ecec]', txtCls: resumen.abiertas > 0 ? 'text-sky-700' : 'text-[#aebfbf]' },
              { label: 'Parciales', value: resumen.parciales, cls: resumen.parciales > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#e4ecec]', txtCls: resumen.parciales > 0 ? 'text-amber-700' : 'text-[#aebfbf]' },
              { label: 'Recibidas', value: resumen.recibidas, cls: resumen.recibidas > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-[#e4ecec]', txtCls: resumen.recibidas > 0 ? 'text-emerald-700' : 'text-[#aebfbf]' },
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
          <div className="px-4 py-3 border-b border-[#e4ecec] flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por número, proveedor, estado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-[#dde8e8] rounded-md pl-8 pr-3 py-[7px] text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <THead>
                <Th>N° Orden</Th>
                <Th>Fecha</Th>
                <Th>Proveedor</Th>
                <Th>F. Entrega</Th>
                <Th center>Estado</Th>
                <Th right>Total</Th>
                <Th center>Acciones</Th>
              </THead>
              <TBody>
                {cargando && <LoadingRows cols={7} rows={6} />}
                {!cargando && listFiltrada.length === 0 && (
                  <EmptyRow
                    icon={Package}
                    title={search ? 'Sin resultados' : 'Sin órdenes registradas'}
                    subtitle={search ? 'Prueba con otro término' : 'Crea la primera orden con el botón "Nueva Orden"'}
                    cols={7}
                  />
                )}
                {!cargando &&
                  listFiltrada.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-[#fafcfc] transition-colors cursor-pointer"
                      onClick={() => abrirDetalle(o.id)}
                    >
                      <Td>
                        <span className="font-mono font-semibold text-[13px] text-[#012d1d]">{o.numero}</span>
                      </Td>
                      <Td muted className="text-[12px] whitespace-nowrap">{fmtFecha(o.fecha)}</Td>
                      <Td>{o.proveedor}</Td>
                      <Td muted className="text-[12px] whitespace-nowrap">{fmtFecha(o.fecha_entrega_esperada)}</Td>
                      <Td center>
                        <Badge variant={o.badge_variant}>{o.estado_label}</Badge>
                      </Td>
                      <Td right>
                        <span className="font-mono text-[13px] font-semibold text-[#1a2e2e]">
                          {fmtMonto(o.total)}
                        </span>
                      </Td>
                      <Td center onClick={(e) => e.stopPropagation()}>
                        <BtnGhost className="text-[12px] py-1 px-2" onClick={() => abrirDetalle(o.id)}>
                          Ver detalle
                        </BtnGhost>
                      </Td>
                    </tr>
                  ))}
              </TBody>
            </table>
          </div>

          {!cargando && (
            <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
              {listFiltrada.length} de {ordenes.length} órdenes{search ? ' (filtrado)' : ''}
            </div>
          )}
        </ContentCard>
      </div>

      {/* ── Drawer: Nueva orden ── */}
      <Drawer open={drawer === 'nueva'} onClose={cerrarDrawer}>
        <DrawerHeader
          title="Nueva Orden de Compra"
          icon="receipt_long"
          onClose={cerrarDrawer}
          disabled={guardando}
        />
        <DrawerBody>
          {savedMsg && <AlertSuccess>{savedMsg}</AlertSuccess>}
          {formErrors._global && <AlertError>{formErrors._global}</AlertError>}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                  Fecha <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
                  className={`w-full px-3 py-[7px] bg-white border rounded-md text-[13px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors ${formErrors.fecha ? 'border-red-400' : 'border-[#dde8e8]'}`}
                />
                {formErrors.fecha && <p className="mt-1 text-[11px] text-red-500">{formErrors.fecha}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                  F. Entrega esperada
                </label>
                <input
                  type="date"
                  value={form.fecha_entrega_esperada}
                  onChange={(e) => setForm((p) => ({ ...p, fecha_entrega_esperada: e.target.value }))}
                  className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                Proveedor <span className="text-red-400">*</span>
              </label>
              <select
                value={form.proveedor_id}
                onChange={(e) => setForm((p) => ({ ...p, proveedor_id: e.target.value }))}
                className={`w-full px-3 py-[7px] bg-white border rounded-md text-[13px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors ${formErrors.proveedor_id ? 'border-red-400' : 'border-[#dde8e8]'}`}
              >
                <option value="">— Seleccionar proveedor —</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {formErrors.proveedor_id && <p className="mt-1 text-[11px] text-red-500">{formErrors.proveedor_id}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">Notas</label>
              <textarea
                rows={2}
                placeholder="Observaciones (opcional)"
                value={form.notas}
                onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
                className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors resize-none"
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">
                  Productos <span className="text-red-400">*</span>
                </label>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1 text-[12px] font-semibold text-[#012d1d] hover:text-[#1a3d2d] transition-colors">
                  <Plus className="w-3.5 h-3.5" />Agregar fila
                </button>
              </div>
              {formErrors.items && <p className="mb-2 text-[11px] text-red-500">{formErrors.items}</p>}

              <div className="border border-[#e4ecec] rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f5f8f8] border-b border-[#e4ecec]">
                      <th className="px-3 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">Producto</th>
                      <th className="px-2 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider w-16 text-right">Cant.</th>
                      <th className="px-2 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider w-24 text-right">P. Unit.</th>
                      <th className="px-2 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider w-16 text-right">IVA%</th>
                      <th className="px-2 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider text-right">Subtotal</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f5f5]">
                    {formItems.map((item) => {
                      const sub = (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0);
                      return (
                        <tr key={item._key}>
                          <td className="px-2 py-1.5">
                            <select
                              value={item.producto_id}
                              onChange={(e) => updateItem(item._key, 'producto_id', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] focus:outline-none focus:border-[#012d1d] transition-colors"
                            >
                              <option value="">— Producto —</option>
                              {productosPorCategoria.map(([cat, items]) => (
                                <optgroup key={cat} label={cat}>
                                  {items.map((p) => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0.0001" step="0.01" placeholder="0"
                              value={item.cantidad}
                              onChange={(e) => updateItem(item._key, 'cantidad', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] text-right focus:outline-none focus:border-[#012d1d] transition-colors"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" step="0.01" placeholder="0.00"
                              value={item.precio_unitario}
                              onChange={(e) => updateItem(item._key, 'precio_unitario', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] text-right focus:outline-none focus:border-[#012d1d] transition-colors"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" max="100" step="0.01" placeholder="0"
                              value={item.impuesto_pct}
                              onChange={(e) => updateItem(item._key, 'impuesto_pct', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] text-right focus:outline-none focus:border-[#012d1d] transition-colors"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <span className="text-[12px] font-mono text-[#4a6060]">
                              {fmtMonto(sub)}
                            </span>
                          </td>
                          <td className="px-1 py-1.5">
                            {formItems.length > 1 && (
                              <button type="button" onClick={() => removeItem(item._key)}
                                className="p-1 rounded text-[#aebfbf] hover:text-red-500 hover:bg-red-50 transition-colors">
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

              {/* Totals */}
              <div className="mt-2 flex flex-col items-end gap-0.5 pr-10">
                <div className="flex gap-6 text-[12px] text-[#6b8f8f]">
                  <span>Subtotal</span>
                  <span className="font-mono w-28 text-right">{fmtMonto(totales.sub)}</span>
                </div>
                <div className="flex gap-6 text-[12px] text-[#6b8f8f]">
                  <span>Impuesto</span>
                  <span className="font-mono w-28 text-right">{fmtMonto(totales.imp)}</span>
                </div>
                <div className="flex gap-6 text-[13px] font-bold text-[#1a2e2e] border-t border-[#e4ecec] pt-1">
                  <span>Total</span>
                  <span className="font-mono w-28 text-right">{fmtMonto(totales.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </DrawerBody>
        <DrawerFooter
          onCancel={cerrarDrawer}
          onSave={handleSubmit}
          saving={guardando}
          saveLabel="Crear Orden"
          saveIcon="receipt_long"
        />
      </Drawer>

      {/* ── Drawer: Detalle / Recibir ── */}
      <Drawer open={drawer === 'detalle'} onClose={cerrarDrawer}>
        <DrawerHeader
          title={detalle ? detalle.numero : 'Detalle'}
          subtitle={detalle ? detalle.proveedor : ''}
          icon="receipt_long"
          onClose={cerrarDrawer}
          disabled={aplicandoRecibo}
        />
        <DrawerBody>
          {cargandoDetalle && (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-[#aebfbf] text-[28px]">progress_activity</span>
            </div>
          )}

          {errorDetalle && <AlertError>{errorDetalle}</AlertError>}

          {!cargandoDetalle && detalle && (
            <div className="space-y-4">

              {/* Estado timeline */}
              <div className="bg-[#f5f8f8] rounded-md px-4 py-3">
                <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-2">Estado de la orden</p>
                <Timeline estado={detalle.estado} />
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Fecha OC', value: fmtFecha(detalle.fecha) },
                  { label: 'F. Entrega esperada', value: fmtFecha(detalle.fecha_entrega_esperada) },
                  { label: 'Estado', value: <Badge variant={detalle.badge_variant}>{detalle.estado_label}</Badge> },
                  { label: 'N° Orden', value: <span className="font-mono font-semibold">{detalle.numero}</span> },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#f5f8f8] rounded-md px-3 py-2">
                    <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-0.5">{label}</p>
                    <div className="text-[13px] font-medium text-[#1a2e2e]">{value}</div>
                  </div>
                ))}
              </div>

              {/* Proveedor info */}
              <div className="bg-[#f5f8f8] rounded-md px-3 py-2">
                <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-1">Proveedor</p>
                <p className="text-[13px] font-semibold text-[#1a2e2e]">{detalle.proveedor}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                  {detalle.proveedor_rif && (
                    <p className="text-[12px] text-[#6b8f8f]">RIF: {detalle.proveedor_rif}</p>
                  )}
                  {detalle.proveedor_telefono && (
                    <p className="text-[12px] text-[#6b8f8f]">Tel: {detalle.proveedor_telefono}</p>
                  )}
                  {detalle.proveedor_email && (
                    <p className="text-[12px] text-[#6b8f8f]">{detalle.proveedor_email}</p>
                  )}
                </div>
              </div>

              {detalle.notas && (
                <div className="bg-[#f5f8f8] rounded-md px-3 py-2">
                  <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-0.5">Notas</p>
                  <p className="text-[13px] text-[#1a2e2e]">{detalle.notas}</p>
                </div>
              )}

              {/* Items table con recibos */}
              <div>
                <p className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-2">
                  Líneas de la orden ({detalle.items?.length ?? 0})
                </p>
                {detalle.estado !== 'CANCELADA' && detalle.estado !== 'RECIBIDA' && (
                  <div className="mb-2 flex items-center gap-3">
                    <label className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide whitespace-nowrap">
                      Fecha recepción <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={fechaRecepcion}
                      onChange={(e) => setFechaRecepcion(e.target.value)}
                      className="px-3 py-[6px] bg-white border border-[#dde8e8] rounded-md text-[13px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
                    />
                  </div>
                )}
                <div className="border border-[#e4ecec] rounded-md overflow-x-auto">
                  <table className="w-full text-left border-collapse" style={{ minWidth: 680 }}>
                    <thead>
                      <tr className="bg-[#f5f8f8] border-b border-[#e4ecec]">
                        <th className="px-2 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">Producto</th>
                        <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider text-right whitespace-nowrap">Cant.</th>
                        <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider text-right whitespace-nowrap">P. Unit.</th>
                        <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider text-right whitespace-nowrap">Subtotal</th>
                        {detalle.estado !== 'CANCELADA' && (
                          <>
                            <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider text-right whitespace-nowrap">Recibido</th>
                            <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider whitespace-nowrap">Lote</th>
                            <th className="px-1.5 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider whitespace-nowrap">F. Venc.</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f5f5]">
                      {(detalle.items ?? []).map((item) => {
                        const recibido  = parseFloat(recibos[item.id]?.cantidad ?? item.cantidad_recibida) || 0;
                        const pendiente = Math.max(0, (parseFloat(item.cantidad) || 0) - (parseFloat(item.cantidad_recibida) || 0));
                        const total     = parseFloat(item.cantidad) || 0;
                        const completo  = recibido >= total;
                        return (
                          <tr key={item.id}>
                            <td className="px-2 py-2">
                              <p className="text-[12px] font-medium text-[#1a2e2e] leading-tight">{item.producto}</p>
                              <p className="text-[10px] font-mono text-[#aebfbf]">{item.producto_codigo}</p>
                            </td>
                            <td className="px-1.5 py-2 text-right whitespace-nowrap">
                              <span className="text-[12px] font-mono text-[#4a6060]">{item.cantidad}</span>
                              <span className="text-[10px] text-[#aebfbf] ml-0.5">{item.unidad}</span>
                            </td>
                            <td className="px-1.5 py-2 text-right text-[12px] font-mono text-[#4a6060] whitespace-nowrap">
                              {fmtMonto(item.precio_unitario)}
                            </td>
                            <td className="px-1.5 py-2 text-right text-[12px] font-mono font-semibold text-[#1a2e2e] whitespace-nowrap">
                              {fmtMonto(item.subtotal)}
                            </td>
                            {detalle.estado !== 'CANCELADA' && (
                              <>
                                <td className="px-1.5 py-2 text-right">
                                  {detalle.estado === 'RECIBIDA' ? (
                                    <span className={`text-[12px] font-mono font-semibold ${completo ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {item.cantidad_recibida}
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      min="0"
                                      max={pendiente}
                                      step="0.01"
                                      value={recibos[item.id]?.cantidad ?? item.cantidad_recibida}
                                      onChange={(e) =>
                                        setRecibos((prev) => ({
                                          ...prev,
                                          [item.id]: { ...(prev[item.id] ?? { lote: '', fecha_vencimiento: '' }), cantidad: e.target.value },
                                        }))
                                      }
                                      className={`w-16 px-1.5 py-1 border rounded text-[12px] font-mono text-right focus:outline-none focus:border-[#012d1d] transition-colors ${
                                        completo ? 'border-emerald-300 bg-emerald-50' : 'border-[#dde8e8] bg-white'
                                      }`}
                                    />
                                  )}
                                </td>
                                <td className="px-1.5 py-2">
                                  {detalle.estado !== 'RECIBIDA' && (
                                    <input
                                      type="text"
                                      placeholder="Opcional"
                                      value={recibos[item.id]?.lote ?? ''}
                                      onChange={(e) =>
                                        setRecibos((prev) => ({
                                          ...prev,
                                          [item.id]: { ...(prev[item.id] ?? { cantidad: item.cantidad_recibida, fecha_vencimiento: '' }), lote: e.target.value },
                                        }))
                                      }
                                      className="w-24 px-1.5 py-1 border border-[#dde8e8] bg-white rounded text-[12px] focus:outline-none focus:border-[#012d1d] transition-colors"
                                    />
                                  )}
                                </td>
                                <td className="px-1.5 py-2">
                                  {detalle.estado !== 'RECIBIDA' && (
                                    <input
                                      type="date"
                                      value={recibos[item.id]?.fecha_vencimiento ?? ''}
                                      onChange={(e) =>
                                        setRecibos((prev) => ({
                                          ...prev,
                                          [item.id]: { ...(prev[item.id] ?? { cantidad: item.cantidad_recibida, lote: '' }), fecha_vencimiento: e.target.value },
                                        }))
                                      }
                                      className="w-32 px-1.5 py-1 border border-[#dde8e8] bg-white rounded text-[12px] focus:outline-none focus:border-[#012d1d] transition-colors"
                                    />
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals section */}
              <div className="bg-[#f5f8f8] rounded-md px-4 py-3">
                <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-2">Resumen de totales</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[13px] text-[#6b8f8f]">
                    <span>Subtotal</span>
                    <span className="font-mono">{fmtMonto(detalle.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-[#6b8f8f]">
                    <span>Impuesto</span>
                    <span className="font-mono">{fmtMonto(detalle.impuesto)}</span>
                  </div>
                  <div className="flex justify-between text-[14px] font-bold text-[#1a2e2e] border-t border-[#e4ecec] pt-1.5 mt-1">
                    <span>Total</span>
                    <span className="font-mono">{fmtMonto(detalle.total)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {detalle.estado !== 'CANCELADA' && detalle.estado !== 'RECIBIDA' && (
                <div className="space-y-2">
                  {errorRecibo && <AlertError>{errorRecibo}</AlertError>}

                  <BtnPrimary
                    onClick={handleRecibir}
                    loading={aplicandoRecibo}
                    className="w-full justify-center"
                  >
                    <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                    Registrar recepción de mercancía
                  </BtnPrimary>

                  {!confirmCancel ? (
                    <BtnDestructive
                      onClick={() => setConfirmCancel(true)}
                      className="w-full justify-center border border-red-200"
                    >
                      Cancelar orden
                    </BtnDestructive>
                  ) : (
                    <div className="border border-red-200 rounded-md p-3 bg-red-50 space-y-2">
                      <p className="text-[13px] text-red-700 font-medium">¿Confirmar cancelación de esta orden?</p>
                      <div className="flex gap-2">
                        <BtnGhost onClick={() => setConfirmCancel(false)} disabled={cancelando} className="flex-1">
                          Volver
                        </BtnGhost>
                        <BtnDestructive
                          onClick={handleCancelar}
                          disabled={cancelando}
                          className="flex-1 border border-red-300 justify-center"
                        >
                          {cancelando ? 'Cancelando…' : 'Confirmar cancelación'}
                        </BtnDestructive>
                      </div>
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

export default OrdenesCompra;
