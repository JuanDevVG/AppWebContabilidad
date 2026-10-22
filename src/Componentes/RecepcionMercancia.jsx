import { useState, useEffect, useMemo, useRef } from 'react';
import { Paperclip, X, CheckCircle2, Package2 } from 'lucide-react';
import {
  getOrdenesCompra, getOrdenCompra,
  getRecepcionesMercancia, createRecepcionMercancia,
} from '../utils/apiService';
import {
  BtnPrimary, BtnGhost,
  Badge, AlertError, AlertSuccess,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
} from '../ui/index.jsx';

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtNum(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '0' : n.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

const ITEM_INIT = () => ({ cantidad: '', lote: '', fecha_vencimiento: '' });

export function RecepcionMercanciaView() {
  // OC selector
  const [ordenesDisponibles, setOrdenesDisponibles] = useState([]);
  const [cargandoOrdenes, setCargandoOrdenes] = useState(true);
  const [errorOrdenes, setErrorOrdenes] = useState('');

  // Selected OC
  const [ordenId, setOrdenId] = useState('');
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');

  // Receipt form
  const [fecha, setFecha] = useState(todayIso);
  const [notas, setNotas] = useState('');
  const [archivoNombre, setArchivoNombre] = useState('');
  const fileRef = useRef(null);

  // Per-item inputs: { [orden_item_id]: { cantidad, lote, fecha_vencimiento } }
  const [reciboItems, setReciboItems] = useState({});

  // Submit
  const [guardando, setGuardando] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorGuardar, setErrorGuardar] = useState('');

  // History log
  const [recepciones, setRecepciones] = useState([]);
  const [cargandoLog, setCargandoLog] = useState(true);

  useEffect(() => {
    cargarOrdenes();
    cargarLog();
  }, []);

  async function cargarOrdenes() {
    setCargandoOrdenes(true);
    setErrorOrdenes('');
    try {
      const res = await getOrdenesCompra();
      setOrdenesDisponibles(
        res.items.filter((o) => o.estado === 'ABIERTA' || o.estado === 'PARCIAL'),
      );
    } catch (err) {
      setErrorOrdenes(err.message || 'Error al cargar órdenes');
    } finally {
      setCargandoOrdenes(false);
    }
  }

  async function cargarLog() {
    setCargandoLog(true);
    try {
      const res = await getRecepcionesMercancia();
      setRecepciones(res.items);
    } catch (_) {
    } finally {
      setCargandoLog(false);
    }
  }

  async function handleSelectOrden(id) {
    setOrdenId(id);
    setSavedMsg('');
    setErrorGuardar('');
    if (!id) {
      setOrdenDetalle(null);
      setReciboItems({});
      return;
    }
    setCargandoDetalle(true);
    setErrorDetalle('');
    try {
      const res = await getOrdenCompra(Number(id));
      setOrdenDetalle(res);
      const init = {};
      (res.items ?? []).forEach((i) => { init[i.id] = ITEM_INIT(); });
      setReciboItems(init);
    } catch (err) {
      setErrorDetalle(err.message || 'Error al cargar orden');
    } finally {
      setCargandoDetalle(false);
    }
  }

  function updateReciboItem(itemId, field, value) {
    setReciboItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  }

  // How many items have a cantidad > 0
  const cantidadesTotales = useMemo(
    () =>
      Object.values(reciboItems).filter((v) => parseFloat(v.cantidad) > 0).length,
    [reciboItems],
  );

  async function handleConfirmar() {
    const items = [];
    for (const [id, val] of Object.entries(reciboItems)) {
      const cant = parseFloat(val.cantidad);
      if (cant > 0) {
        items.push({
          orden_item_id:    Number(id),
          cantidad:         val.cantidad,
          lote:             val.lote,
          fecha_vencimiento: val.fecha_vencimiento || null,
        });
      }
    }
    if (items.length === 0) {
      setErrorGuardar('Ingresa al menos una cantidad a recibir.');
      return;
    }

    setGuardando(true);
    setErrorGuardar('');
    setSavedMsg('');
    try {
      await createRecepcionMercancia({
        orden_id:         Number(ordenId),
        fecha,
        notas,
        documento_nombre: archivoNombre,
        items,
      });

      // Reload order detail to show updated received qtys
      const res = await getOrdenCompra(Number(ordenId));
      setOrdenDetalle(res);

      // Reset receipt inputs
      const init = {};
      (res.items ?? []).forEach((i) => { init[i.id] = ITEM_INIT(); });
      setReciboItems(init);
      setNotas('');
      setArchivoNombre('');
      setSavedMsg('Recepción registrada. Inventario actualizado correctamente.');

      // Refresh available orders and log
      await cargarOrdenes();
      await cargarLog();

      // If now fully received, deselect
      if (res.estado === 'RECIBIDA') {
        setOrdenId('');
        setOrdenDetalle(null);
      }
    } catch (err) {
      setErrorGuardar(err.message || 'Error al registrar recepción');
    } finally {
      setGuardando(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <PageHeader
          title="Recepción de Mercancía"
          subtitle="Registra la entrada de productos contra una orden de compra abierta"
        />

        {/* ── OC Selector ── */}
        <ContentCard className="mb-4">
          <div className="px-4 py-3 border-b border-[#e4ecec]">
            <p className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">
              Seleccionar orden de compra
            </p>
          </div>
          <div className="px-4 py-3">
            {errorOrdenes && <AlertError>{errorOrdenes}</AlertError>}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={ordenId}
                onChange={(e) => handleSelectOrden(e.target.value)}
                disabled={cargandoOrdenes}
                className="flex-1 min-w-[260px] max-w-lg px-3 py-[8px] bg-white border border-[#dde8e8] rounded-md text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors disabled:opacity-50"
              >
                <option value="">
                  {cargandoOrdenes
                    ? 'Cargando órdenes…'
                    : ordenesDisponibles.length === 0
                    ? 'No hay órdenes abiertas'
                    : '— Selecciona una orden de compra —'}
                </option>
                {ordenesDisponibles.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero} — {o.proveedor}{' '}
                    ({o.estado === 'ABIERTA' ? 'Abierta' : 'Recepción parcial'})
                  </option>
                ))}
              </select>
              {ordenId && (
                <button
                  type="button"
                  onClick={() => handleSelectOrden('')}
                  className="flex items-center gap-1.5 text-[12px] text-[#6b8f8f] hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar selección
                </button>
              )}
            </div>
          </div>
        </ContentCard>

        {/* ── OC Summary + Form ── */}
        {errorDetalle && <AlertError>{errorDetalle}</AlertError>}

        {cargandoDetalle && (
          <ContentCard className="mb-4">
            <div className="flex items-center justify-center py-10">
              <span className="material-symbols-outlined animate-spin text-[#aebfbf] text-[28px]">
                progress_activity
              </span>
            </div>
          </ContentCard>
        )}

        {!cargandoDetalle && ordenDetalle && (
          <>
            {savedMsg && <AlertSuccess className="mb-4">{savedMsg}</AlertSuccess>}

            {/* Summary card */}
            <ContentCard className="mb-4">
              <div className="px-4 py-3 border-b border-[#e4ecec] flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">
                  Resumen de la orden
                </p>
                <Badge variant={ordenDetalle.badge_variant}>{ordenDetalle.estado_label}</Badge>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'N° Orden',   value: <span className="font-mono font-semibold">{ordenDetalle.numero}</span> },
                  { label: 'Proveedor',  value: ordenDetalle.proveedor },
                  { label: 'Fecha OC',   value: fmtFecha(ordenDetalle.fecha) },
                  { label: 'F. Entrega', value: fmtFecha(ordenDetalle.fecha_entrega_esperada) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-0.5">
                      {label}
                    </p>
                    <div className="text-[13px] font-medium text-[#1a2e2e]">{value}</div>
                  </div>
                ))}
              </div>
              {ordenDetalle.proveedor_rif && (
                <div className="px-4 pb-3 flex gap-4 text-[12px] text-[#6b8f8f]">
                  <span>RIF: {ordenDetalle.proveedor_rif}</span>
                  {ordenDetalle.proveedor_telefono && <span>Tel: {ordenDetalle.proveedor_telefono}</span>}
                  {ordenDetalle.proveedor_email && <span>{ordenDetalle.proveedor_email}</span>}
                </div>
              )}
            </ContentCard>

            {/* Line items table */}
            <ContentCard className="mb-4">
              <div className="px-4 py-3 border-b border-[#e4ecec]">
                <p className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">
                  Productos de la orden
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <THead>
                    <Th>Producto</Th>
                    <Th right>Pedido</Th>
                    <Th right>Prev. Recibido</Th>
                    <Th right>Pendiente</Th>
                    <Th right>Recibir ahora</Th>
                    <Th center>Unidad</Th>
                    <Th>Lote / Batch</Th>
                    <Th>F. Vencimiento</Th>
                  </THead>
                  <TBody>
                    {(ordenDetalle.items ?? []).map((item) => {
                      const pedido      = parseFloat(item.cantidad) || 0;
                      const prevRec     = parseFloat(item.cantidad_recibida) || 0;
                      const pendiente   = Math.max(0, pedido - prevRec);
                      const completado  = pendiente <= 0;
                      const recv        = reciboItems[item.id] ?? ITEM_INIT();
                      const recvCant    = parseFloat(recv.cantidad) || 0;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            completado ? 'opacity-50 bg-[#fafcfc]' : 'hover:bg-[#fafcfc]'
                          }`}
                        >
                          <Td>
                            <p className="text-[13px] font-medium text-[#1a2e2e] leading-tight">
                              {item.producto}
                            </p>
                            <p className="text-[11px] font-mono text-[#6b8f8f]">{item.producto_codigo}</p>
                          </Td>

                          <Td right>
                            <span className="font-mono text-[13px] text-[#4a6060]">
                              {fmtNum(item.cantidad)}
                            </span>
                          </Td>

                          <Td right>
                            <span className={`font-mono text-[13px] ${prevRec > 0 ? 'text-emerald-600' : 'text-[#aebfbf]'}`}>
                              {fmtNum(prevRec)}
                            </span>
                          </Td>

                          <Td right>
                            {completado ? (
                              <Badge variant="active">
                                <CheckCircle2 className="w-3 h-3" />
                                Completo
                              </Badge>
                            ) : (
                              <span className="font-mono text-[13px] font-semibold text-amber-600">
                                {fmtNum(pendiente)}
                              </span>
                            )}
                          </Td>

                          {/* Recibir ahora */}
                          <Td right>
                            <input
                              type="number"
                              min="0"
                              max={pendiente}
                              step="0.01"
                              placeholder="0"
                              disabled={completado}
                              value={recv.cantidad}
                              onChange={(e) => updateReciboItem(item.id, 'cantidad', e.target.value)}
                              className={`w-24 px-2 py-1 border rounded text-[12px] font-mono text-right focus:outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                recvCant > 0
                                  ? 'border-emerald-300 bg-emerald-50 focus:border-emerald-400'
                                  : 'border-[#dde8e8] bg-white focus:border-[#012d1d]'
                              }`}
                            />
                          </Td>

                          <Td center>
                            <span className="text-[12px] font-medium text-[#4a6060]">
                              {item.unidad}
                            </span>
                          </Td>

                          {/* Lote */}
                          <Td>
                            <input
                              type="text"
                              placeholder="Ej: LOT-001"
                              disabled={completado}
                              value={recv.lote}
                              onChange={(e) => updateReciboItem(item.id, 'lote', e.target.value)}
                              className="w-full min-w-[120px] px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] placeholder:text-[#d0dcdc] focus:outline-none focus:border-[#012d1d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </Td>

                          {/* F. Vencimiento */}
                          <Td>
                            <input
                              type="date"
                              disabled={completado}
                              value={recv.fecha_vencimiento}
                              onChange={(e) =>
                                updateReciboItem(item.id, 'fecha_vencimiento', e.target.value)
                              }
                              className="w-full min-w-[140px] px-2 py-1 bg-white border border-[#dde8e8] rounded text-[12px] focus:outline-none focus:border-[#012d1d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </Td>
                        </tr>
                      );
                    })}
                  </TBody>
                </table>
              </div>
            </ContentCard>

            {/* Notes + file + confirm */}
            <ContentCard className="mb-4">
              <div className="px-4 py-3 border-b border-[#e4ecec]">
                <p className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">
                  Datos de la recepción
                </p>
              </div>
              <div className="px-4 py-4 space-y-3">
                {/* Fecha */}
                <div className="max-w-xs">
                  <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                    Fecha de recepción <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                    Notas / Observaciones
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Condición de llegada, novedades, etc. (opcional)"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors resize-none"
                  />
                </div>

                {/* File attachment */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                    Documento soporte
                  </label>
                  <input
                    type="file"
                    ref={fileRef}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.xml"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setArchivoNombre(f ? f.name : '');
                    }}
                  />
                  {archivoNombre ? (
                    <div className="inline-flex items-center gap-2 px-3 py-[6px] bg-sky-50 border border-sky-200 rounded-md text-[12px] text-sky-700 font-medium">
                      <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[260px]">{archivoNombre}</span>
                      <button
                        type="button"
                        onClick={() => { setArchivoNombre(''); if (fileRef.current) fileRef.current.value = ''; }}
                        className="ml-1 hover:text-sky-900 transition-colors"
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
                      Adjuntar documento (remisión, guía, etc.)
                    </button>
                  )}
                  <p className="mt-1 text-[11px] text-[#aebfbf]">PDF, imagen o XML. Se registra el nombre del archivo.</p>
                </div>

                {/* Error + confirm */}
                {errorGuardar && <AlertError>{errorGuardar}</AlertError>}

                <div className="pt-1 flex items-center gap-3">
                  <BtnPrimary
                    onClick={handleConfirmar}
                    loading={guardando}
                    disabled={cantidadesTotales === 0}
                    className="px-6"
                  >
                    <span className="material-symbols-outlined text-[16px]">move_to_inbox</span>
                    Confirmar recepción
                    {cantidadesTotales > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px] font-bold">
                        {cantidadesTotales} {cantidadesTotales === 1 ? 'ítem' : 'ítems'}
                      </span>
                    )}
                  </BtnPrimary>
                  {cantidadesTotales === 0 && (
                    <p className="text-[12px] text-[#aebfbf]">
                      Ingresa al menos una cantidad en la tabla para habilitar.
                    </p>
                  )}
                </div>
              </div>
            </ContentCard>
          </>
        )}

        {/* ── Reception History ── */}
        <ContentCard>
          <div className="px-4 py-3 border-b border-[#e4ecec]">
            <p className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">
              Historial de recepciones
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <THead>
                <Th>Fecha</Th>
                <Th>Orden</Th>
                <Th>Proveedor</Th>
                <Th center>Ítems recibidos</Th>
                <Th>Documento</Th>
                <Th>Notas</Th>
              </THead>
              <TBody>
                {cargandoLog && <LoadingRows cols={6} rows={4} />}
                {!cargandoLog && recepciones.length === 0 && (
                  <EmptyRow
                    icon={Package2}
                    title="Sin recepciones registradas"
                    subtitle="Las recepciones confirmadas aparecerán aquí"
                    cols={6}
                  />
                )}
                {!cargandoLog &&
                  recepciones.map((r) => (
                    <tr key={r.id} className="hover:bg-[#fafcfc] transition-colors">
                      <Td muted className="text-[12px] whitespace-nowrap">{fmtFecha(r.fecha)}</Td>
                      <Td>
                        <span className="font-mono font-semibold text-[13px] text-[#012d1d]">
                          {r.orden_numero}
                        </span>
                      </Td>
                      <Td>{r.proveedor}</Td>
                      <Td center>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-600">
                          {r.total_items}
                        </span>
                      </Td>
                      <Td>
                        {r.documento_nombre ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-sky-600">
                            <Paperclip className="w-3 h-3" />
                            {r.documento_nombre}
                          </span>
                        ) : (
                          <span className="text-[12px] text-[#aebfbf]">—</span>
                        )}
                      </Td>
                      <Td muted className="text-[12px] max-w-[200px] truncate" title={r.notas}>
                        {r.notas || '—'}
                      </Td>
                    </tr>
                  ))}
              </TBody>
            </table>
          </div>
          {!cargandoLog && recepciones.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
              {recepciones.length} recepciones registradas
            </div>
          )}
        </ContentCard>
      </div>
    </main>
  );
}

export default RecepcionMercanciaView;
