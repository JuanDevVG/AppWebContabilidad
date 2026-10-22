import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Search, ShoppingCart, CheckCircle2, XCircle, FileText } from 'lucide-react';
import {
  getSolicitudesCompra, createSolicitudCompra,
  getSolicitudCompra, aprobarSolicitud,
  getMisPermisos, getProductos, getGalpones, getProveedores,
  getSolicitudGenerarOCPrefill, generarOCDesdeSolicitud,
} from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, BtnGhost, BtnDestructive, BtnIcon,
  Badge, AlertError, AlertSuccess,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
  Drawer, DrawerHeader, DrawerBody, DrawerFooter,
} from '../ui/index.jsx';

function fmtFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const ITEM_INIT = () => ({ _key: Date.now() + Math.random(), producto_id: '', cantidad: '', notas: '' });

const ESTADO_ORDER = { BORRADOR: 0, APROBADA: 1, RECHAZADA: 2, CONVERTIDA: 3 };

export function SolicitudesCompra() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, borradores: 0, aprobadas: 0, rechazadas: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Drawer: null | 'nueva' | 'detalle'
  const [drawer, setDrawer] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // Form
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], solicitante: '', galpon_id: '', notas: '' });
  const [formItems, setFormItems] = useState([ITEM_INIT()]);
  const [formErrors, setFormErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Approve/reject confirm state: null | 'APROBADA' | 'RECHAZADA'
  const [accionPendiente, setAccionPendiente] = useState(null);
  const [aplicandoAccion, setAplicandoAccion] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  const [productos, setProductos] = useState([]);
  const [galpones, setGalpones] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [puedeAprobar, setPuedeAprobar] = useState(false);
  const [puedeGenerarOC, setPuedeGenerarOC] = useState(false);

  // Form generar-oc
  const [ocForm, setOcForm] = useState({ fecha: '', proveedor_id: '', fecha_entrega_esperada: '', notas: '' });
  const [ocItems, setOcItems] = useState([]);
  const [ocFormErrors, setOcFormErrors] = useState({});
  const [generandoOC, setGenerandoOC] = useState(false);
  const [generarOCMsg, setGenerarOCMsg] = useState('');
  const [errorGenerarOC, setErrorGenerarOC] = useState('');

  useEffect(() => {
    cargar();
    getMisPermisos()
      .then((res) => {
        if (res.es_admin) {
          setPuedeAprobar(true);
          setPuedeGenerarOC(true);
        } else {
          const p = res.permisos?.compras_solicitudes ?? {};
          setPuedeAprobar(p.puede_aprobar ?? false);
          setPuedeGenerarOC(p.puede_generar_oc ?? false);
        }
      })
      .catch(() => {});
    getProductos({ activo: true, page_size: 500 })
      .then((res) => setProductos((res.results ?? res).filter((p) => p.activo)))
      .catch((_e) => {});
    getGalpones()
      .then((res) => setGalpones((res.results ?? res).filter((g) => g.activo)))
      .catch((_e) => {});
    getProveedores({ activo: true, page_size: 500 })
      .then((res) => setProveedores((res.results ?? res).filter((p) => p.activo !== false)))
      .catch((_e) => {});
  }, []);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const res = await getSolicitudesCompra();
      setSolicitudes(res.items);
      setResumen(res.resumen);
    } catch (err) {
      setError(err.message || 'Error al cargar solicitudes');
    } finally {
      setCargando(false);
    }
  }

  async function abrirDetalle(id) {
    setDrawer('detalle');
    setDetalle(null);
    setAccionPendiente(null);
    setErrorAccion('');
    setCargandoDetalle(true);
    try {
      const res = await getSolicitudCompra(id);
      setDetalle(res);
    } catch (err) {
      setErrorAccion(err.message || 'Error al cargar detalle');
    } finally {
      setCargandoDetalle(false);
    }
  }

  function cerrarDrawer() {
    setDrawer(null);
    setDetalle(null);
    setAccionPendiente(null);
    setErrorAccion('');
    setSavedMsg('');
    setFormErrors({});
    setOcItems([]);
    setOcFormErrors({});
    setGenerarOCMsg('');
    setErrorGenerarOC('');
  }

  async function abrirGenerarOC() {
    if (!detalle) return;
    setErrorAccion('');
    try {
      const prefill = await getSolicitudGenerarOCPrefill(detalle.id);
      setOcItems(prefill.items.map((i) => ({ ...i, precio_unitario: '', impuesto_pct: '0' })));
      setOcForm({
        fecha: new Date().toISOString().split('T')[0],
        proveedor_id: '',
        fecha_entrega_esperada: '',
        notas: '',
      });
      setOcFormErrors({});
      setGenerarOCMsg('');
      setErrorGenerarOC('');
      setDrawer('generar-oc');
    } catch (err) {
      setErrorAccion(err.message || 'Error al cargar datos para generar OC');
    }
  }

  function updateOcItem(idx, field, value) {
    setOcItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  async function handleGenerarOC() {
    const e = {};
    if (!ocForm.fecha) e.fecha = 'Requerido';
    if (!ocForm.proveedor_id) e.proveedor_id = 'Requerido';
    if (ocItems.length === 0) e.items = 'Sin ítems';
    if (Object.keys(e).length > 0) { setOcFormErrors(e); return; }

    setGenerandoOC(true);
    setErrorGenerarOC('');
    try {
      const res = await generarOCDesdeSolicitud(detalle.id, {
        fecha: ocForm.fecha,
        proveedor_id: Number(ocForm.proveedor_id),
        fecha_entrega_esperada: ocForm.fecha_entrega_esperada || null,
        notas: ocForm.notas,
        items: ocItems.map((i) => ({
          producto_id:    Number(i.producto_id),
          cantidad:       i.cantidad,
          precio_unitario: i.precio_unitario || '0',
          impuesto_pct:   i.impuesto_pct || '0',
        })),
      });
      setGenerarOCMsg(`Orden ${res.orden_numero} creada. Solicitud convertida a OC.`);
      setSolicitudes((prev) =>
        prev.map((s) =>
          s.id === detalle.id
            ? { ...s, estado: 'CONVERTIDA', estado_label: 'Convertida a OC', badge_variant: 'info',
                orden_compra_id: res.orden_id, orden_compra_numero: res.orden_numero }
            : s,
        ),
      );
      setTimeout(() => cerrarDrawer(), 1800);
    } catch (err) {
      setErrorGenerarOC(err.message || 'Error al generar orden de compra');
    } finally {
      setGenerandoOC(false);
    }
  }

  function abrirNueva() {
    setForm({ fecha: new Date().toISOString().split('T')[0], solicitante: '', galpon_id: '', notas: '' });
    setFormItems([ITEM_INIT()]);
    setFormErrors({});
    setSavedMsg('');
    setDrawer('nueva');
  }

  // ── Line items ────────────────────────────────────────────────────────────
  function addItem() {
    setFormItems((prev) => [...prev, ITEM_INIT()]);
  }

  function updateItem(key, field, value) {
    setFormItems((prev) =>
      prev.map((i) => (i._key === key ? { ...i, [field]: value } : i)),
    );
  }

  function removeItem(key) {
    setFormItems((prev) => prev.filter((i) => i._key !== key));
  }

  // Product helper for unit display
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

  // ── Submit form ───────────────────────────────────────────────────────────
  async function handleSubmit() {
    const e = {};
    if (!form.fecha) e.fecha = 'Requerido';
    if (!form.solicitante.trim()) e.solicitante = 'Requerido';
    const itemsValidos = formItems.filter((i) => i.producto_id && Number(i.cantidad) > 0);
    if (itemsValidos.length === 0) e.items = 'Agrega al menos un producto con cantidad';
    if (Object.keys(e).length > 0) { setFormErrors(e); return; }

    setGuardando(true);
    setSavedMsg('');
    try {
      const res = await createSolicitudCompra({
        fecha: form.fecha,
        solicitante: form.solicitante.trim(),
        galpon_id: form.galpon_id || null,
        notas: form.notas,
        items: itemsValidos.map((i) => ({
          producto_id: Number(i.producto_id),
          cantidad: i.cantidad,
          notas: i.notas,
        })),
      });
      setSavedMsg(`Solicitud ${res.numero} creada correctamente.`);
      await cargar();
      setTimeout(cerrarDrawer, 1200);
    } catch (err) {
      setFormErrors({ _global: err.message || 'Error al guardar' });
    } finally {
      setGuardando(false);
    }
  }

  // ── Approve / Reject ──────────────────────────────────────────────────────
  async function aplicarAccion() {
    if (!accionPendiente || !detalle) return;
    setAplicandoAccion(true);
    setErrorAccion('');
    try {
      const res = await aprobarSolicitud(detalle.id, accionPendiente);
      setDetalle((prev) => ({ ...prev, estado: res.estado, estado_label: res.estado_label }));
      setSolicitudes((prev) =>
        prev.map((s) =>
          s.id === detalle.id ? { ...s, estado: res.estado, estado_label: res.estado_label, badge_variant: res.estado === 'APROBADA' ? 'active' : 'critical' } : s,
        ),
      );
      setAccionPendiente(null);
    } catch (err) {
      setErrorAccion(err.message || 'Error al actualizar estado');
    } finally {
      setAplicandoAccion(false);
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const listFiltrada = useMemo(() => {
    if (!search) return solicitudes;
    const q = search.toLowerCase();
    return solicitudes.filter(
      (s) =>
        s.numero.toLowerCase().includes(q) ||
        s.solicitante.toLowerCase().includes(q) ||
        s.galpon.toLowerCase().includes(q) ||
        s.estado_label.toLowerCase().includes(q),
    );
  }, [solicitudes, search]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <PageHeader
          title="Solicitudes de Compra"
          subtitle="Gestiona y aprueba pedidos de productos antes de emitir órdenes de compra"
        >
          <BtnPrimary onClick={abrirNueva}>
            <Plus className="w-3.5 h-3.5" />
            Nueva Solicitud
          </BtnPrimary>
        </PageHeader>

        {/* Resumen cards */}
        {!cargando && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total', value: resumen.total, cls: 'bg-white border-[#e4ecec]', txtCls: 'text-[#1a2e2e]' },
              { label: 'Borradores', value: resumen.borradores, cls: 'bg-white border-[#e4ecec]', txtCls: 'text-[#6b8f8f]' },
              { label: 'Aprobadas', value: resumen.aprobadas, cls: resumen.aprobadas > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-[#e4ecec]', txtCls: resumen.aprobadas > 0 ? 'text-emerald-700' : 'text-[#aebfbf]' },
              { label: 'Rechazadas', value: resumen.rechazadas, cls: resumen.rechazadas > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#e4ecec]', txtCls: resumen.rechazadas > 0 ? 'text-red-700' : 'text-[#aebfbf]' },
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
          {/* Buscador */}
          <div className="px-4 py-3 border-b border-[#e4ecec] flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por número, solicitante, estado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-[#dde8e8] rounded-md pl-8 pr-3 py-[7px] text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
              />
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <THead>
                <Th>N° Solicitud</Th>
                <Th>Fecha</Th>
                <Th>Solicitante</Th>
                <Th>Galpón</Th>
                <Th center>Ítems</Th>
                <Th center>Estado</Th>
                <Th center>Acciones</Th>
              </THead>
              <TBody>
                {cargando && <LoadingRows cols={7} rows={6} />}

                {!cargando && listFiltrada.length === 0 && (
                  <EmptyRow
                    icon={ShoppingCart}
                    title={search ? 'Sin resultados' : 'Sin solicitudes registradas'}
                    subtitle={search ? 'Prueba con otro término' : 'Crea la primera solicitud con el botón "Nueva Solicitud"'}
                    cols={7}
                  />
                )}

                {!cargando &&
                  listFiltrada.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-[#fafcfc] transition-colors cursor-pointer"
                      onClick={() => abrirDetalle(s.id)}
                    >
                      <Td>
                        <span className="font-mono font-semibold text-[13px] text-[#012d1d]">
                          {s.numero}
                        </span>
                      </Td>
                      <Td muted className="text-[12px] whitespace-nowrap">{fmtFecha(s.fecha)}</Td>
                      <Td>{s.solicitante}</Td>
                      <Td muted className="text-[12px]">{s.galpon || '—'}</Td>
                      <Td center>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#eef3f3] text-[11px] font-bold text-[#4a6060]">
                          {s.total_items}
                        </span>
                      </Td>
                      <Td center>
                        <Badge variant={s.badge_variant}>{s.estado_label}</Badge>
                      </Td>
                      <Td center onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <BtnGhost
                            className="text-[12px] py-1 px-2"
                            onClick={() => abrirDetalle(s.id)}
                          >
                            Ver detalle
                          </BtnGhost>
                          {puedeAprobar && s.estado === 'BORRADOR' && (
                            <>
                              <BtnIcon
                                title="Aprobar"
                                onClick={() => { abrirDetalle(s.id); setTimeout(() => setAccionPendiente('APROBADA'), 300); }}
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </BtnIcon>
                              <BtnIcon
                                title="Rechazar"
                                onClick={() => { abrirDetalle(s.id); setTimeout(() => setAccionPendiente('RECHAZADA'), 300); }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4" />
                              </BtnIcon>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
              </TBody>
            </table>
          </div>

          {!cargando && (
            <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
              {listFiltrada.length} de {solicitudes.length} solicitudes
              {search ? ' (filtrado)' : ''}
            </div>
          )}
        </ContentCard>
      </div>

      {/* ── Drawer: Nueva solicitud ── */}
      <Drawer open={drawer === 'nueva'} onClose={cerrarDrawer}>
        <DrawerHeader
          title="Nueva Solicitud de Compra"
          icon="shopping_cart_checkout"
          onClose={cerrarDrawer}
          disabled={guardando}
        />
        <DrawerBody>
          {savedMsg && <AlertSuccess>{savedMsg}</AlertSuccess>}
          {formErrors._global && <AlertError>{formErrors._global}</AlertError>}

          <div className="space-y-3">
            {/* Fecha */}
            <div>
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                Fecha <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
                className={`w-full px-3 py-[7px] bg-white border rounded-md text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors ${formErrors.fecha ? 'border-red-400' : 'border-[#dde8e8]'}`}
              />
              {formErrors.fecha && <p className="mt-1 text-[11px] text-red-500">{formErrors.fecha}</p>}
            </div>

            {/* Solicitante */}
            <div>
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                Solicitante <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Nombre de quien solicita"
                value={form.solicitante}
                onChange={(e) => setForm((p) => ({ ...p, solicitante: e.target.value }))}
                className={`w-full px-3 py-[7px] bg-white border rounded-md text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors ${formErrors.solicitante ? 'border-red-400' : 'border-[#dde8e8]'}`}
              />
              {formErrors.solicitante && <p className="mt-1 text-[11px] text-red-500">{formErrors.solicitante}</p>}
            </div>

            {/* Galpón */}
            <div>
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                Galpón solicitante
              </label>
              <select
                value={form.galpon_id}
                onChange={(e) => setForm((p) => ({ ...p, galpon_id: e.target.value }))}
                className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
              >
                <option value="">General / Sin galpón</option>
                {galpones.map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                Notas
              </label>
              <textarea
                rows={2}
                placeholder="Observaciones generales (opcional)"
                value={form.notas}
                onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
                className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors resize-none"
              />
            </div>

            {/* Ítems */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">
                  Productos solicitados <span className="text-red-400">*</span>
                </label>
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

              <div className="border border-[#e4ecec] rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f5f8f8] border-b border-[#e4ecec]">
                      <th className="px-3 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">Producto</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider w-20">Cant.</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider w-12 text-center">Ud.</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">Notas</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f5f5]">
                    {formItems.map((item) => {
                      const prod = productoMap[item.producto_id];
                      return (
                        <tr key={item._key}>
                          <td className="px-2 py-1.5">
                            <select
                              value={item.producto_id}
                              onChange={(e) => updateItem(item._key, 'producto_id', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] transition-colors"
                            >
                              <option value="">— Producto —</option>
                              {productosPorCategoria.map(([cat, items]) => (
                                <optgroup key={cat} label={cat}>
                                  {items.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.nombre}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0.0001"
                              step="0.01"
                              placeholder="0"
                              value={item.cantidad}
                              onChange={(e) => updateItem(item._key, 'cantidad', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] text-right focus:outline-none focus:border-[#012d1d] transition-colors"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <span className="text-[11px] text-[#aebfbf]">
                              {prod?.unidad_abreviatura ?? '—'}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              placeholder="Notas..."
                              value={item.notas}
                              onChange={(e) => updateItem(item._key, 'notas', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] focus:outline-none focus:border-[#012d1d] transition-colors"
                            />
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
            </div>
          </div>
        </DrawerBody>
        <DrawerFooter
          onCancel={cerrarDrawer}
          onSave={handleSubmit}
          saving={guardando}
          saveLabel="Crear Solicitud"
          saveIcon="shopping_cart_checkout"
        />
      </Drawer>

      {/* ── Drawer: Generar OC ── */}
      <Drawer open={drawer === 'generar-oc'} onClose={cerrarDrawer}>
        <DrawerHeader
          title="Generar Orden de Compra"
          subtitle={detalle ? `Desde ${detalle.numero}` : ''}
          icon="receipt_long"
          onClose={cerrarDrawer}
          disabled={generandoOC}
        />
        <DrawerBody>
          {generarOCMsg && <AlertSuccess>{generarOCMsg}</AlertSuccess>}
          {errorGenerarOC && <AlertError>{errorGenerarOC}</AlertError>}

          <div className="space-y-3">
            <div className="bg-sky-50 border border-sky-200 rounded-md px-3 py-2">
              <p className="text-[11px] text-sky-700 font-semibold">
                Los productos y cantidades se precargan desde la solicitud.
                Ingresa el proveedor y los precios para crear la orden.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                  Fecha <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={ocForm.fecha}
                  onChange={(e) => setOcForm((p) => ({ ...p, fecha: e.target.value }))}
                  className={`w-full px-3 py-[7px] bg-white border rounded-md text-[13px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors ${ocFormErrors.fecha ? 'border-red-400' : 'border-[#dde8e8]'}`}
                />
                {ocFormErrors.fecha && <p className="mt-1 text-[11px] text-red-500">{ocFormErrors.fecha}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                  F. Entrega esperada
                </label>
                <input
                  type="date"
                  value={ocForm.fecha_entrega_esperada}
                  onChange={(e) => setOcForm((p) => ({ ...p, fecha_entrega_esperada: e.target.value }))}
                  className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                Proveedor <span className="text-red-400">*</span>
              </label>
              <select
                value={ocForm.proveedor_id}
                onChange={(e) => setOcForm((p) => ({ ...p, proveedor_id: e.target.value }))}
                className={`w-full px-3 py-[7px] bg-white border rounded-md text-[13px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors ${ocFormErrors.proveedor_id ? 'border-red-400' : 'border-[#dde8e8]'}`}
              >
                <option value="">— Seleccionar proveedor —</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {ocFormErrors.proveedor_id && <p className="mt-1 text-[11px] text-red-500">{ocFormErrors.proveedor_id}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                Notas
              </label>
              <textarea
                rows={2}
                placeholder="Observaciones (opcional)"
                value={ocForm.notas}
                onChange={(e) => setOcForm((p) => ({ ...p, notas: e.target.value }))}
                className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-2">
                Productos <span className="text-[#aebfbf] font-normal normal-case">(precargados de la solicitud)</span>
              </label>
              <div className="border border-[#e4ecec] rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f5f8f8] border-b border-[#e4ecec]">
                      <th className="px-3 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">Producto</th>
                      <th className="px-2 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider w-16 text-right">Cant.</th>
                      <th className="px-2 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider w-24 text-right">P. Unit.</th>
                      <th className="px-2 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider w-16 text-right">IVA%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f5f5]">
                    {ocItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">
                          <p className="text-[12px] font-medium text-[#1a2e2e] leading-tight">{item.producto}</p>
                          <p className="text-[10px] font-mono text-[#aebfbf]">{item.producto_codigo}</p>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span className="text-[12px] font-mono text-[#4a6060]">{item.cantidad}</span>
                          <span className="text-[10px] text-[#aebfbf] ml-0.5">{item.unidad}</span>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.precio_unitario}
                            onChange={(e) => updateOcItem(idx, 'precio_unitario', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] text-right focus:outline-none focus:border-[#012d1d] transition-colors"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0"
                            value={item.impuesto_pct}
                            onChange={(e) => updateOcItem(idx, 'impuesto_pct', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] text-right focus:outline-none focus:border-[#012d1d] transition-colors"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DrawerBody>
        <DrawerFooter
          onCancel={cerrarDrawer}
          onSave={handleGenerarOC}
          saving={generandoOC}
          saveLabel="Crear Orden de Compra"
          saveIcon="receipt_long"
        />
      </Drawer>

      {/* ── Drawer: Detalle / Aprobar-Rechazar ── */}
      <Drawer open={drawer === 'detalle'} onClose={cerrarDrawer}>
        <DrawerHeader
          title={detalle ? detalle.numero : 'Detalle'}
          subtitle={detalle ? detalle.estado_label : ''}
          icon="shopping_cart_checkout"
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

          {!cargandoDetalle && detalle && (
            <div className="space-y-4">
              {/* Info header */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Fecha', value: fmtFecha(detalle.fecha) },
                  { label: 'Estado', value: <Badge variant={detalle.badge_variant}>{detalle.estado_label}</Badge> },
                  { label: 'Solicitante', value: detalle.solicitante },
                  { label: 'Galpón', value: detalle.galpon || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#f5f8f8] rounded-md px-3 py-2">
                    <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-0.5">
                      {label}
                    </p>
                    <div className="text-[13px] font-medium text-[#1a2e2e]">{value}</div>
                  </div>
                ))}
              </div>

              {detalle.notas && (
                <div className="bg-[#f5f8f8] rounded-md px-3 py-2">
                  <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-0.5">Notas</p>
                  <p className="text-[13px] text-[#1a2e2e]">{detalle.notas}</p>
                </div>
              )}

              {/* Items table */}
              <div>
                <p className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-2">
                  Productos solicitados ({detalle.items?.length ?? 0})
                </p>
                <div className="border border-[#e4ecec] rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f5f8f8] border-b border-[#e4ecec]">
                        <th className="px-3 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">Producto</th>
                        <th className="px-3 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider text-right">Cant.</th>
                        <th className="px-3 py-2 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f5f5]">
                      {(detalle.items ?? []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">
                            <p className="text-[13px] font-medium text-[#1a2e2e] leading-tight">{item.producto}</p>
                            <p className="text-[11px] font-mono text-[#6b8f8f]">{item.producto_codigo}</p>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-[13px] font-semibold text-[#1a2e2e]">
                              {item.cantidad}
                            </span>
                            <span className="text-[11px] text-[#aebfbf] ml-1">{item.unidad}</span>
                          </td>
                          <td className="px-3 py-2 text-[12px] text-[#6b8f8f]">
                            {item.notas || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Admin actions */}
              {puedeAprobar && detalle.estado === 'BORRADOR' && (
                <div className="border border-[#e4ecec] rounded-md p-3 bg-[#fafcfc]">
                  <p className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-2">
                    Acción administrativa
                  </p>
                  {errorAccion && <AlertError>{errorAccion}</AlertError>}

                  {accionPendiente ? (
                    <div className="space-y-2">
                      <p className="text-[13px] text-[#1a2e2e]">
                        ¿Confirmar{' '}
                        <strong>
                          {accionPendiente === 'APROBADA' ? 'aprobación' : 'rechazo'}
                        </strong>{' '}
                        de esta solicitud?
                      </p>
                      <div className="flex gap-2">
                        <BtnGhost onClick={() => setAccionPendiente(null)} disabled={aplicandoAccion} className="flex-1">
                          Cancelar
                        </BtnGhost>
                        {accionPendiente === 'APROBADA' ? (
                          <BtnPrimary onClick={aplicarAccion} loading={aplicandoAccion} className="flex-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmar aprobación
                          </BtnPrimary>
                        ) : (
                          <BtnDestructive onClick={aplicarAccion} disabled={aplicandoAccion} className="flex-1 border border-red-200 hover:bg-red-100">
                            {aplicandoAccion ? 'Rechazando…' : 'Confirmar rechazo'}
                          </BtnDestructive>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <BtnSecondary
                        onClick={() => setAccionPendiente('APROBADA')}
                        className="flex-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Aprobar
                      </BtnSecondary>
                      <BtnSecondary
                        onClick={() => setAccionPendiente('RECHAZADA')}
                        className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        Rechazar
                      </BtnSecondary>
                    </div>
                  )}
                </div>
              )}

              {!puedeAprobar && detalle.estado === 'BORRADOR' && (
                <p className="text-[12px] text-[#aebfbf] text-center py-1">
                  Solo administradores pueden aprobar o rechazar solicitudes.
                </p>
              )}

              {puedeGenerarOC && detalle.estado === 'APROBADA' && (
                <div className="border border-sky-200 rounded-md p-3 bg-sky-50">
                  <p className="text-[11px] font-semibold text-sky-700 uppercase tracking-wide mb-2">
                    Generar Orden de Compra
                  </p>
                  {errorAccion && <p className="text-[12px] text-red-500 mb-2">{errorAccion}</p>}
                  <BtnPrimary onClick={abrirGenerarOC} className="w-full justify-center bg-sky-700 hover:bg-sky-800">
                    <FileText className="w-3.5 h-3.5" />
                    Generar OC desde esta solicitud
                  </BtnPrimary>
                </div>
              )}

              {detalle.estado === 'CONVERTIDA' && detalle.orden_compra_numero && (
                <div className="border border-[#e4ecec] rounded-md px-3 py-2 bg-[#f5f8f8] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-sky-600">receipt_long</span>
                  <span className="text-[12px] text-[#4a6060]">
                    Convertida a OC: <strong className="font-mono">{detalle.orden_compra_numero}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </DrawerBody>
      </Drawer>
    </main>
  );
}

export default SolicitudesCompra;
