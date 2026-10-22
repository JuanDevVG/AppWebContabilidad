import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, ShoppingCart, AlertTriangle } from 'lucide-react';
import {
  getClientes, getProductosTerminados, getStockProductoTerminado,
  getPedidosVenta, createPedidoVenta,
  getPedidoVentaDetalle, facturarPedido,
} from '../utils/apiService';
import {
  BtnPrimary, BtnGhost, Badge,
  AlertError, AlertSuccess,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow, Spinner,
} from '../ui/index.jsx';

// ── Constantes ────────────────────────────────────────────────────────────────

const CONDICION_OPTS = [
  { value: 'CONTADO',  label: 'Contado' },
  { value: '15_DIAS',  label: '15 días' },
  { value: '30_DIAS',  label: '30 días' },
  { value: '45_DIAS',  label: '45 días' },
  { value: '60_DIAS',  label: '60 días' },
  { value: '90_DIAS',  label: '90 días' },
];

const IVA_OPTS = ['0', '5', '19'];

// ── Utilidades ────────────────────────────────────────────────────────────────

function fmtMoneda(n) {
  return Number(n || 0).toLocaleString('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
}
function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function estadoBadge(estado) {
  if (estado === 'BORRADOR')  return 'neutral';
  if (estado === 'FACTURADO') return 'info';
  if (estado === 'COBRADO')   return 'active';
  return 'neutral';
}
function facturaBadge(estado) {
  if (estado === 'PENDIENTE') return 'warning';
  if (estado === 'PARCIAL')   return 'info';
  if (estado === 'COBRADA')   return 'active';
  return 'neutral';
}
function facturaBadgeLabel(estado) {
  return { PENDIENTE: 'Por cobrar', PARCIAL: 'Cobro parcial', COBRADA: 'Cobrada' }[estado] || estado;
}

const FILA_VACIA = () => ({
  _key: Math.random(),
  producto_id: '', cantidad: '', precio_unitario: '',
  descuento_pct: '0', impuesto_pct: '19',
});

// ── Cálculo por línea ─────────────────────────────────────────────────────────

function calcLinea(fila) {
  const cant   = parseFloat(fila.cantidad)        || 0;
  const precio = parseFloat(fila.precio_unitario) || 0;
  const desc   = parseFloat(fila.descuento_pct)   || 0;
  const imp    = parseFloat(fila.impuesto_pct)    || 0;
  const base   = cant * precio;
  const descV  = base * desc / 100;
  const neto   = base - descV;
  const impV   = neto * imp / 100;
  return { base, descV, neto, impV, total: neto + impV };
}

function calcTotales(filas) {
  let subtotal = 0, descuento = 0, impuesto = 0;
  for (const f of filas) {
    const l = calcLinea(f);
    subtotal += l.base;
    descuento += l.descV;
    impuesto += l.impV;
  }
  return { subtotal, descuento, impuesto, total: subtotal - descuento + impuesto };
}

// ── Formulario de pedido ──────────────────────────────────────────────────────

function FormularioPedido({ clientes, productos, stocks, onGuardado, onCancelar }) {
  const [form, setForm] = useState({
    numero: '',
    fecha: new Date().toISOString().slice(0, 10),
    cliente_id: '',
    condiciones_pago: 'CONTADO',
    notas: '',
  });
  const [filas,     setFilas]     = useState([FILA_VACIA()]);
  const [errores,   setErrores]   = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

  const productoMap = useMemo(() => {
    const m = {};
    for (const p of productos) m[String(p.id)] = p;
    return m;
  }, [productos]);

  const stockMap = useMemo(() => {
    const m = {};
    for (const s of stocks) m[String(s.id)] = parseFloat(s.stock_kg) || 0;
    return m;
  }, [stocks]);

  function handleClienteChange(clienteId) {
    const cliente = clientes.find(c => String(c.id) === String(clienteId));
    setForm(p => ({
      ...p,
      cliente_id: clienteId,
      condiciones_pago: cliente?.condiciones_pago || 'CONTADO',
    }));
  }

  function setFila(key, campo, valor) {
    setFilas(prev => prev.map(f => f._key === key ? { ...f, [campo]: valor } : f));
  }
  function agregarFila() { setFilas(prev => [...prev, FILA_VACIA()]); }
  function eliminarFila(key) {
    setFilas(prev => prev.length === 1 ? [FILA_VACIA()] : prev.filter(f => f._key !== key));
  }

  function validar() {
    const ev = {};
    if (!form.fecha)      ev.fecha   = 'Requerido';
    if (!form.cliente_id) ev.cliente = 'Requerido';
    const itemsOk = filas.filter(f => f.producto_id && parseFloat(f.cantidad) > 0);
    if (!itemsOk.length)  ev.items   = 'Agrega al menos un producto con cantidad mayor a cero';
    return ev;
  }

  async function guardar(facturarInmediato = false) {
    const ev = validar();

    // Validación de stock al facturar
    if (facturarInmediato && !Object.keys(ev).length) {
      for (const f of filas) {
        if (!f.producto_id || !parseFloat(f.cantidad)) continue;
        const disp = stockMap[f.producto_id] ?? 0;
        const cant = parseFloat(f.cantidad);
        if (cant > disp) {
          const prod = productoMap[f.producto_id];
          ev.items = `Stock insuficiente: "${prod?.nombre}" disponible ${disp.toFixed(2)} kg, solicitado ${cant} kg.`;
          break;
        }
      }
    }

    if (Object.keys(ev).length) { setErrores(ev); return; }
    setGuardando(true);
    setErrorMsg('');
    try {
      const payload = {
        numero:           form.numero || undefined,
        fecha:            form.fecha,
        cliente_id:       Number(form.cliente_id),
        condiciones_pago: form.condiciones_pago,
        notas:            form.notas,
        items: filas
          .filter(f => f.producto_id && parseFloat(f.cantidad) > 0)
          .map(f => ({
            producto_terminado_id: Number(f.producto_id),
            cantidad:        f.cantidad,
            precio_unitario: f.precio_unitario || '0',
            descuento_pct:   f.descuento_pct || '0',
            impuesto_pct:    f.impuesto_pct || '0',
          })),
      };
      const res = await createPedidoVenta(payload);
      if (facturarInmediato) {
        const res2 = await facturarPedido(res.id);
        onGuardado(res2, true);
      } else {
        onGuardado(res, false);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  const totales = calcTotales(filas);
  const inputCls = 'w-full border border-[#c8d8d8] rounded-md px-2 py-1.5 text-[12px] text-[#1a2e2e] focus:outline-none focus:ring-1 focus:ring-[#012d1d]/30 bg-white';
  const fieldCls = (err) => `w-full border rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 bg-white ${err ? 'border-red-400' : 'border-[#c8d8d8]'}`;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
      <button onClick={onCancelar}
        className="flex items-center gap-1.5 text-[12px] font-medium text-[#6b8f8f] hover:text-[#012d1d] mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver al listado
      </button>

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[18px] font-bold text-[#1a2e2e]">Nueva Venta</h2>
      </div>

      {errorMsg && <AlertError className="mb-4">{errorMsg}</AlertError>}

      {/* Encabezado */}
      <ContentCard className="mb-4">
        <div className="px-5 pt-4 pb-2 border-b border-[#f0f5f5]">
          <p className="text-[13px] font-bold text-[#1a2e2e]">Datos del pedido</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
              N° Pedido <span className="text-[#6b8f8f] font-normal">(opcional)</span>
            </label>
            <input type="text" value={form.numero}
              onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
              placeholder="Auto-generado" className={fieldCls(false)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input type="date" value={form.fecha}
              onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
              className={fieldCls(errores.fecha)} />
            {errores.fecha && <p className="text-[11px] text-red-500 mt-0.5">{errores.fecha}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
              Cliente <span className="text-red-500">*</span>
            </label>
            <select value={form.cliente_id}
              onChange={e => handleClienteChange(e.target.value)}
              className={fieldCls(errores.cliente)}>
              <option value="">Seleccionar cliente…</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}{c.nit ? ` — ${c.nit}` : ''}</option>
              ))}
            </select>
            {errores.cliente && <p className="text-[11px] text-red-500 mt-0.5">{errores.cliente}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
              Condiciones de pago
            </label>
            <select value={form.condiciones_pago}
              onChange={e => setForm(p => ({ ...p, condiciones_pago: e.target.value }))}
              className={fieldCls(false)}>
              {CONDICION_OPTS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-[#6b8f8f] mt-0.5">
              Se hereda del cliente al seleccionarlo. Determina la fecha de vencimiento en CxC.
            </p>
          </div>
        </div>
      </ContentCard>

      {/* Líneas */}
      <ContentCard className="mb-4">
        <div className="px-5 pt-4 pb-2 border-b border-[#f0f5f5] flex items-center justify-between">
          <p className="text-[13px] font-bold text-[#1a2e2e]">Productos</p>
          <button type="button" onClick={agregarFila}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#012d1d] hover:underline">
            <Plus className="w-3.5 h-3.5" /> Agregar línea
          </button>
        </div>
        {errores.items && (
          <p className="text-[11px] text-red-500 px-5 pt-2">{errores.items}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <THead>
              <Th>Producto</Th>
              <Th>Unidad</Th>
              <Th right>Cantidad</Th>
              <Th right>Precio unit.</Th>
              <Th right>Desc. %</Th>
              <Th right>IVA %</Th>
              <Th right>Total línea</Th>
              <Th center>—</Th>
            </THead>
            <TBody>
              {filas.map(fila => {
                const prod     = productoMap[fila.producto_id];
                const linea    = calcLinea(fila);
                const stockDisp = fila.producto_id ? (stockMap[fila.producto_id] ?? 0) : null;
                const sinStock  = stockDisp !== null && parseFloat(fila.cantidad) > stockDisp;
                const unidad    = fila.producto_id ? 'kg' : '—';
                return (
                  <tr key={fila._key}
                    className={`border-b border-[#f0f5f5] ${sinStock ? 'bg-red-50/40' : ''}`}>
                    <Td>
                      <div>
                        <select value={fila.producto_id}
                          onChange={e => setFila(fila._key, 'producto_id', e.target.value)}
                          className={`${inputCls} min-w-[180px]`}>
                          <option value="">Seleccionar…</option>
                          {productos.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
                          ))}
                        </select>
                        {fila.producto_id && stockDisp !== null && (
                          <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${sinStock ? 'text-red-500' : 'text-[#6b8f8f]'}`}>
                            {sinStock && <AlertTriangle className="w-3 h-3" />}
                            Stock disponible: {stockDisp.toFixed(2)} kg
                          </p>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <span className="text-[#6b8f8f]">{unidad}</span>
                    </Td>
                    <Td right>
                      <input type="number" min="0" step="0.01" value={fila.cantidad}
                        onChange={e => setFila(fila._key, 'cantidad', e.target.value)}
                        placeholder="0"
                        className={`${inputCls} w-20 text-right ${sinStock ? 'border-red-400' : ''}`} />
                    </Td>
                    <Td right>
                      <input type="number" min="0" step="100" value={fila.precio_unitario}
                        onChange={e => setFila(fila._key, 'precio_unitario', e.target.value)}
                        placeholder="0" className={`${inputCls} w-28 text-right`} />
                    </Td>
                    <Td right>
                      <input type="number" min="0" max="100" step="0.5" value={fila.descuento_pct}
                        onChange={e => setFila(fila._key, 'descuento_pct', e.target.value)}
                        className={`${inputCls} w-16 text-right`} />
                    </Td>
                    <Td right>
                      <select value={fila.impuesto_pct}
                        onChange={e => setFila(fila._key, 'impuesto_pct', e.target.value)}
                        className={`${inputCls} w-20`}>
                        {IVA_OPTS.map(v => (
                          <option key={v} value={v}>{v}%</option>
                        ))}
                      </select>
                    </Td>
                    <Td right>
                      <span className="font-semibold text-[#1a2e2e]">
                        {fmtMoneda(linea.total)}
                      </span>
                    </Td>
                    <Td center>
                      <button type="button" onClick={() => eliminarFila(fila._key)}
                        className="p-1 rounded text-[#aebfbf] hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </TBody>
          </table>
        </div>
      </ContentCard>

      {/* Totales + notas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <ContentCard>
          <div className="px-5 pt-4 pb-2 border-b border-[#f0f5f5]">
            <p className="text-[13px] font-bold text-[#1a2e2e]">Notas</p>
          </div>
          <div className="px-5 py-4">
            <textarea value={form.notas}
              onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              rows={4} placeholder="Observaciones, condiciones especiales…"
              className="w-full border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 resize-none" />
          </div>
        </ContentCard>

        <ContentCard>
          <div className="px-5 pt-4 pb-2 border-b border-[#f0f5f5]">
            <p className="text-[13px] font-bold text-[#1a2e2e]">Resumen</p>
          </div>
          <div className="px-5 py-4 space-y-2">
            {[
              { label: 'Subtotal bruto', val: fmtMoneda(totales.subtotal),              cls: 'text-[#1a2e2e]' },
              { label: 'Descuentos',     val: `− ${fmtMoneda(totales.descuento)}`,      cls: 'text-red-500'   },
              { label: 'IVA',            val: `+ ${fmtMoneda(totales.impuesto)}`,       cls: 'text-[#1a2e2e]' },
            ].map(({ label, val, cls }) => (
              <div key={label} className="flex justify-between text-[12px]">
                <span className="text-[#6b8f8f]">{label}</span>
                <span className={cls}>{val}</span>
              </div>
            ))}
            <div className="border-t border-[#f0f5f5] pt-2 flex justify-between">
              <span className="text-[14px] font-bold text-[#1a2e2e]">TOTAL</span>
              <span className="text-[16px] font-bold text-[#012d1d]">{fmtMoneda(totales.total)}</span>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3">
        <BtnGhost type="button" onClick={onCancelar} disabled={guardando}>Cancelar</BtnGhost>
        <button
          type="button" disabled={guardando}
          onClick={() => guardar(false)}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#c8d8d8] text-[#1a2e2e] hover:bg-[#f0f5f5] transition-colors disabled:opacity-50">
          {guardando ? 'Guardando…' : 'Guardar borrador'}
        </button>
        <BtnPrimary type="button" disabled={guardando} onClick={() => guardar(true)}>
          {guardando ? <><Spinner size="xs" className="text-white" /> Procesando…</> : 'Confirmar y Facturar'}
        </BtnPrimary>
      </div>
    </div>
  );
}

// ── Vista detalle de pedido ───────────────────────────────────────────────────

function DetallePedido({ pedido: pedidoInicial, onVolver, onActualizado }) {
  const [pedido,   setPedido]   = useState(pedidoInicial);
  const [accion,   setAccion]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  useEffect(() => {
    getPedidoVentaDetalle(pedido.id).then(data => {
      setPedido(data);
    }).catch(() => {});
  }, [pedido.id]);

  async function handleFacturar() {
    setAccion(true); setErrorMsg('');
    try {
      const res = await facturarPedido(pedido.id);
      setPedido(res);
      onActualizado(res);
      setExitoMsg(`Pedido facturado. Factura ${res.numero_factura} generada. Inventario descontado.`);
      setTimeout(() => setExitoMsg(''), 6000);
    } catch (err) {
      setErrorMsg(err.message || 'Error al facturar');
    } finally {
      setAccion(false);
    }
  }

  const items = pedido.items ?? [];

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
      <button onClick={onVolver}
        className="flex items-center gap-1.5 text-[12px] font-medium text-[#6b8f8f] hover:text-[#012d1d] mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver al listado
      </button>

      {exitoMsg && <AlertSuccess className="mb-4">{exitoMsg}</AlertSuccess>}
      {errorMsg && <AlertError  className="mb-4">{errorMsg}</AlertError>}

      {/* Header */}
      <ContentCard className="mb-4">
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#e8f5f0] flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-[#012d1d]" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-[#1a2e2e]">{pedido.numero}</p>
              <p className="text-[12px] text-[#6b8f8f]">{pedido.cliente_nombre}</p>
            </div>
            <Badge variant={estadoBadge(pedido.estado)}>{pedido.estado_label}</Badge>
          </div>
          <div className="flex gap-2">
            {pedido.estado === 'BORRADOR' && (
              <BtnPrimary onClick={handleFacturar} disabled={accion}>
                {accion ? <><Spinner size="xs" className="text-white" /> Facturando…</> : 'Confirmar y Facturar'}
              </BtnPrimary>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-[#f0f5f5]">
          {[
            { label: 'Fecha',             val: fmtFecha(pedido.fecha) },
            { label: 'Cliente',           val: pedido.cliente_nombre },
            { label: 'NIT/ID',            val: pedido.cliente_nit || '—' },
            { label: 'Condiciones pago',  val: pedido.condiciones_pago_label || pedido.condiciones_pago || '—' },
          ].map(({ label, val }) => (
            <div key={label} className="px-5 py-3 border-r border-[#f0f5f5] last:border-r-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f] mb-0.5">{label}</p>
              <p className="text-[13px] font-semibold text-[#1a2e2e]">{val}</p>
            </div>
          ))}
        </div>
      </ContentCard>

      {/* Factura vinculada — aparece cuando el pedido está FACTURADO o COBRADO */}
      {pedido.numero_factura && (
        <ContentCard className="mb-4">
          <div className="px-5 py-3.5 flex flex-wrap items-center gap-4">
            <span className="material-symbols-outlined text-emerald-600 text-[22px] flex-shrink-0">
              receipt_long
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f]">Factura generada</p>
              <p className="text-[15px] font-mono font-bold text-[#012d1d]">{pedido.numero_factura}</p>
            </div>
            <Badge variant={facturaBadge(pedido.factura_estado)}>
              {facturaBadgeLabel(pedido.factura_estado)}
            </Badge>
            {pedido.factura_vencimiento && (
              <div className="ml-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f]">Vencimiento</p>
                <p className="text-[13px] font-semibold text-[#1a2e2e]">{fmtFecha(pedido.factura_vencimiento)}</p>
              </div>
            )}
            <p className="ml-auto text-[11px] text-[#6b8f8f]">
              El cobro se gestiona desde <strong>Cuentas por Cobrar</strong>
            </p>
          </div>
        </ContentCard>
      )}

      {/* Líneas */}
      <ContentCard className="mb-4">
        <div className="px-5 py-3 border-b border-[#f0f5f5]">
          <p className="text-[13px] font-bold text-[#1a2e2e]">Líneas del pedido</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <THead>
              <Th>Producto</Th>
              <Th>Código</Th>
              <Th>Unidad</Th>
              <Th right>Cantidad</Th>
              <Th right>Precio unit.</Th>
              <Th right>Desc. %</Th>
              <Th right>IVA %</Th>
              <Th right>Total</Th>
            </THead>
            <TBody>
              {items.length === 0 ? (
                <EmptyRow cols={8} title="Sin líneas" />
              ) : (
                items.map(it => (
                  <tr key={it.id} className="border-b border-[#f0f5f5] hover:bg-[#f8fbfb]">
                    <Td>{it.producto_nombre}</Td>
                    <Td><span className="font-mono text-[11px] text-[#6b8f8f]">{it.producto_codigo}</span></Td>
                    <Td muted>{it.unidad}</Td>
                    <Td right>{Number(it.cantidad).toLocaleString('es-CO', { maximumFractionDigits: 4 })}</Td>
                    <Td right>{fmtMoneda(it.precio_unitario)}</Td>
                    <Td right>{Number(it.descuento_pct) > 0 ? `${it.descuento_pct}%` : <span className="text-[#aebfbf]">—</span>}</Td>
                    <Td right>{it.impuesto_pct}%</Td>
                    <Td right><span className="font-semibold">{fmtMoneda(it.total_linea)}</span></Td>
                  </tr>
                ))
              )}
            </TBody>
          </table>
        </div>
      </ContentCard>

      {/* Totales + notas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pedido.notas && (
          <ContentCard>
            <div className="px-5 pt-4 pb-2 border-b border-[#f0f5f5]">
              <p className="text-[13px] font-bold text-[#1a2e2e]">Notas</p>
            </div>
            <p className="px-5 py-4 text-[13px] text-[#1a2e2e]">{pedido.notas}</p>
          </ContentCard>
        )}
        <ContentCard className={pedido.notas ? '' : 'sm:col-start-2'}>
          <div className="px-5 pt-4 pb-2 border-b border-[#f0f5f5]">
            <p className="text-[13px] font-bold text-[#1a2e2e]">Totales</p>
          </div>
          <div className="px-5 py-4 space-y-2">
            {[
              { label: 'Subtotal bruto', val: fmtMoneda(pedido.subtotal),              cls: '' },
              { label: 'Descuentos',     val: `− ${fmtMoneda(pedido.descuento_total)}`, cls: 'text-red-500' },
              { label: 'IVA',            val: `+ ${fmtMoneda(pedido.impuesto_total)}`,  cls: '' },
            ].map(({ label, val, cls }) => (
              <div key={label} className="flex justify-between text-[12px]">
                <span className="text-[#6b8f8f]">{label}</span>
                <span className={cls || 'text-[#1a2e2e]'}>{val}</span>
              </div>
            ))}
            <div className="border-t border-[#f0f5f5] pt-2 flex justify-between">
              <span className="text-[14px] font-bold text-[#1a2e2e]">TOTAL</span>
              <span className="text-[16px] font-bold text-[#012d1d]">{fmtMoneda(pedido.total)}</span>
            </div>
          </div>
        </ContentCard>
      </div>
    </div>
  );
}

// ── Vista lista ───────────────────────────────────────────────────────────────

export default function PedidosVenta() {
  const [vista,        setVista]        = useState('lista');
  const [pedidoActivo, setPedidoActivo] = useState(null);

  const [pedidos,   setPedidos]   = useState([]);
  const [clientes,  setClientes]  = useState([]);
  const [productos, setProductos] = useState([]);
  const [stocks,    setStocks]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [exitoMsg,  setExitoMsg]  = useState('');

  const [busqueda,  setBusqueda]  = useState('');
  const [filtroEst, setFiltroEst] = useState('');

  useEffect(() => { cargarTodo(); }, []);

  async function cargarTodo() {
    setLoading(true);
    try {
      const [pRes, cRes, prodRes, stockRes] = await Promise.all([
        getPedidosVenta(),
        getClientes({ activo: 'true' }),
        getProductosTerminados({ activo: 'true' }),
        getStockProductoTerminado(),
      ]);
      setPedidos(pRes.items ?? []);
      setClientes(cRes.results ?? cRes);
      setProductos(prodRes.results ?? prodRes);
      setStocks(Array.isArray(stockRes) ? stockRes : stockRes.results ?? []);
    } catch (err) {
      setErrorMsg(err.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  function handleGuardado(res, facturado) {
    setPedidos(prev => [res, ...prev]);
    setVista('lista');
    setExitoMsg(facturado
      ? `Pedido ${res.numero} creado y facturado (${res.numero_factura}). Inventario descontado.`
      : `Borrador ${res.numero} guardado.`);
    setTimeout(() => setExitoMsg(''), 6000);
  }

  function handleActualizado(res) {
    setPedidos(prev => prev.map(p => p.id === res.id ? res : p));
    if (pedidoActivo?.id === res.id) setPedidoActivo(res);
  }

  const pedidosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return pedidos.filter(p => {
      if (filtroEst && p.estado !== filtroEst) return false;
      if (q && !p.numero.toLowerCase().includes(q) &&
              !(p.cliente_nombre || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pedidos, busqueda, filtroEst]);

  const selectCls = 'border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 bg-white';

  if (vista === 'formulario') {
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <FormularioPedido
          clientes={clientes}
          productos={productos}
          stocks={stocks}
          onGuardado={handleGuardado}
          onCancelar={() => setVista('lista')}
        />
      </main>
    );
  }

  if (vista === 'detalle' && pedidoActivo) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <DetallePedido
          pedido={pedidoActivo}
          onVolver={() => { setVista('lista'); setPedidoActivo(null); }}
          onActualizado={handleActualizado}
        />
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <div className="flex items-center justify-between mb-5">
          <PageHeader
            title="Pedidos / Ventas"
            subtitle="Gestión del ciclo de venta: borrador → facturado → cobrado en CxC"
          />
          <BtnPrimary onClick={() => setVista('formulario')}>
            <Plus className="w-4 h-4 mr-1.5" /> Nueva Venta
          </BtnPrimary>
        </div>

        {exitoMsg && <AlertSuccess className="mb-4">{exitoMsg}</AlertSuccess>}
        {errorMsg && <AlertError  className="mb-4">{errorMsg}</AlertError>}

        <ContentCard>
          {/* Filtros */}
          <div className="px-5 py-3 border-b border-[#f0f5f5] flex flex-wrap gap-3 items-center">
            <input
              type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por N° pedido o cliente…"
              className="border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 min-w-[220px]"
            />
            <select value={filtroEst} onChange={e => setFiltroEst(e.target.value)} className={selectCls}>
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="FACTURADO">Facturado</option>
              <option value="COBRADO">Cobrado</option>
            </select>
            <span className="ml-auto text-[11px] text-[#6b8f8f]">
              {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <THead>
                <Th>N° Pedido</Th>
                <Th>Fecha</Th>
                <Th>Cliente</Th>
                <Th>Productos</Th>
                <Th>Factura</Th>
                <Th right>Total</Th>
                <Th center>Estado</Th>
                <Th center>Acciones</Th>
              </THead>
              <TBody>
                {loading ? (
                  <LoadingRows cols={8} />
                ) : pedidosFiltrados.length === 0 ? (
                  <EmptyRow cols={8} title={pedidos.length === 0 ? 'No hay ventas registradas' : 'Sin resultados'} />
                ) : (
                  pedidosFiltrados.map(p => (
                    <tr key={p.id} className="border-b border-[#f0f5f5] hover:bg-[#f8fbfb]">
                      <Td>
                        <span className="font-mono text-[11px] font-semibold text-[#1a2e2e]">{p.numero}</span>
                      </Td>
                      <Td muted>{fmtFecha(p.fecha)}</Td>
                      <Td>
                        <p className="font-medium text-[#1a2e2e]">{p.cliente_nombre}</p>
                        {p.cliente_nit && <p className="text-[10px] text-[#6b8f8f]">{p.cliente_nit}</p>}
                      </Td>
                      <Td muted>{p.resumen_productos}</Td>
                      <Td>
                        {p.numero_factura
                          ? <span className="font-mono text-[11px] text-[#012d1d]">{p.numero_factura}</span>
                          : <span className="text-[#aebfbf] text-[11px]">—</span>}
                      </Td>
                      <Td right>
                        <span className="font-semibold text-[#1a2e2e]">{fmtMoneda(p.total)}</span>
                      </Td>
                      <Td center>
                        <Badge variant={estadoBadge(p.estado)}>{p.estado_label}</Badge>
                      </Td>
                      <Td center>
                        <button
                          onClick={() => { setPedidoActivo(p); setVista('detalle'); }}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#012d1d] border border-[#c8d8d8] hover:bg-[#e8f5f0] transition-colors">
                          Ver detalle
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </TBody>
            </table>
          </div>
        </ContentCard>
      </div>
    </main>
  );
}
