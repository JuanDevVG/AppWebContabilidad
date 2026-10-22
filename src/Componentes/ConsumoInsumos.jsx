import { useState, useEffect, useMemo, Fragment } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getLotes, getProductos, getExistencias } from '../utils/apiService';
import { getConsumos, createConsumo } from '../utils/apiService';
import {
  BtnPrimary, BtnGhost, Badge,
  AlertError, AlertSuccess,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
} from '../ui/index.jsx';

const PERIODOS = [
  { value: 'DIARIO',  label: 'Diario' },
  { value: 'SEMANAL', label: 'Semanal' },
];

function fmt(n, d = 2) {
  return Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const FILA_INIT = () => ({ _key: Math.random(), producto_id: '', cantidad: '' });

export default function ConsumoInsumos() {
  const [lotes,      setLotes]      = useState([]);
  const [productos,  setProductos]  = useState([]);
  const [stockMap,   setStockMap]   = useState({});   // producto_id → stock_actual
  const [historial,  setHistorial]  = useState([]);
  const [loadHist,   setLoadHist]   = useState(false);

  // form header
  const [fecha,       setFecha]       = useState(() => new Date().toISOString().slice(0, 10));
  const [loteId,      setLoteId]      = useState('');
  const [periodo,     setPeriodo]     = useState('DIARIO');
  const [responsable, setResponsable] = useState('');
  const [notas,       setNotas]       = useState('');

  // items
  const [filas, setFilas] = useState([FILA_INIT()]);

  // ui
  const [guardando,  setGuardando]  = useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');
  const [exitoMsg,   setExitoMsg]   = useState('');
  const [errores,    setErrores]    = useState({});
  const [histExpanded, setHistExpanded] = useState({});

  useEffect(() => { cargarCatalogos(); }, []);

  useEffect(() => {
    if (loteId) cargarHistorial(loteId);
    else setHistorial([]);
  }, [loteId]);

  async function cargarCatalogos() {
    try {
      const [lRes, pRes, eRes] = await Promise.all([
        getLotes({ estado: 'ACTIVO' }),
        getProductos({ activo: 'true' }),
        getExistencias(),
      ]);
      setLotes(lRes.items ?? []);
      setProductos(pRes.results ?? pRes);
      const mapa = {};
      for (const e of (eRes.items ?? [])) mapa[e.id] = e.stock_actual;
      setStockMap(mapa);
    } catch (_) {}
  }

  async function cargarHistorial(gid) {
    setLoadHist(true);
    try {
      const res = await getConsumos({ lote_id: gid });
      setHistorial(res.items ?? []);
    } catch (_) {
      setHistorial([]);
    } finally {
      setLoadHist(false);
    }
  }

  // ── Mapa id→producto para lookups rápidos
  const productoMap = useMemo(() => {
    const m = {};
    for (const p of productos) m[p.id] = p;
    return m;
  }, [productos]);

  // ── Productos ya usados en otras filas (para evitar duplicados)
  function productosDisponibles(keyActual) {
    const usados = filas.filter(f => f._key !== keyActual && f.producto_id).map(f => Number(f.producto_id));
    return productos.filter(p => !usados.includes(p.id));
  }

  function setFila(key, campo, valor) {
    setFilas(prev => prev.map(f => f._key === key ? { ...f, [campo]: valor } : f));
  }
  function agregarFila() { setFilas(prev => [...prev, FILA_INIT()]); }
  function eliminarFila(key) {
    setFilas(prev => prev.length === 1 ? [FILA_INIT()] : prev.filter(f => f._key !== key));
  }

  function validar() {
    const e = {};
    if (!fecha)    e.fecha   = 'Requerido';
    if (!loteId)   e.galpon  = 'Requerido';
    const itemsOk = filas.filter(f => f.producto_id && Number(f.cantidad) > 0);
    if (!itemsOk.length) e.items = 'Agrega al menos un insumo con cantidad mayor a cero';
    return e;
  }

  async function handleGuardar(e) {
    e.preventDefault();
    const ev = validar();
    if (Object.keys(ev).length) { setErrores(ev); return; }
    setGuardando(true);
    setErrorMsg('');
    setExitoMsg('');
    setErrores({});
    try {
      const payload = {
        fecha, lote_id: Number(loteId), periodo, responsable, notas,
        items: filas
          .filter(f => f.producto_id && Number(f.cantidad) > 0)
          .map(f => ({ producto_id: Number(f.producto_id), cantidad: f.cantidad })),
      };
      const res = await createConsumo(payload);
      setExitoMsg(`Consumo registrado: ${res.numero}`);
      setFilas([FILA_INIT()]);
      setNotas('');
      setResponsable('');
      cargarHistorial(loteId);
      cargarCatalogos();
      setTimeout(() => setExitoMsg(''), 6000);
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el consumo');
    } finally {
      setGuardando(false);
    }
  }

  const inputCls = (err) =>
    `w-full border rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 ${err ? 'border-red-400' : 'border-[#c8d8d8]'}`;

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <PageHeader title="Consumo de Insumos" />

        {exitoMsg && <AlertSuccess className="mb-4">{exitoMsg}</AlertSuccess>}
        {errorMsg && <AlertError  className="mb-4">{errorMsg}</AlertError>}

        {/* ── Formulario de registro ── */}
        <ContentCard className="mb-5">
          <div className="px-5 pt-4 pb-2 border-b border-[#f0f5f5]">
            <p className="text-[13px] font-bold text-[#1a2e2e]">Registro de Consumo</p>
          </div>

          <form onSubmit={handleGuardar} className="px-5 py-4 space-y-5">
            {/* Header fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  className={inputCls(errores.fecha)}
                />
                {errores.fecha && <p className="text-[11px] text-red-500 mt-0.5">{errores.fecha}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                  Lote <span className="text-red-500">*</span>
                </label>
                <select
                  value={loteId} onChange={e => setLoteId(e.target.value)}
                  className={inputCls(errores.galpon)}
                >
                  <option value="">Seleccionar…</option>
                  {lotes.map(l => (
                    <option key={l.id} value={l.id}>{l.numero}</option>
                  ))}
                </select>
                {errores.galpon && <p className="text-[11px] text-red-500 mt-0.5">{errores.galpon}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Período</label>
                <select
                  value={periodo} onChange={e => setPeriodo(e.target.value)}
                  className={inputCls(false)}
                >
                  {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Responsable</label>
                <input
                  type="text" value={responsable} onChange={e => setResponsable(e.target.value)}
                  placeholder="Nombre del responsable"
                  className={inputCls(false)}
                />
              </div>
            </div>

            {/* Items table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold text-[#1a2e2e]">Insumos consumidos</p>
                <button
                  type="button" onClick={agregarFila}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#012d1d] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar fila
                </button>
              </div>

              {errores.items && (
                <p className="text-[11px] text-red-500 mb-2">{errores.items}</p>
              )}

              <div className="border border-[#e4ecec] rounded-lg overflow-hidden">
                <table className="w-full text-[13px]">
                  <THead>
                    <Th>Producto / Insumo</Th>
                    <Th>Unidad</Th>
                    <Th right>Stock actual</Th>
                    <Th right>Cantidad a descontar</Th>
                    <Th center>—</Th>
                  </THead>
                  <TBody>
                    {filas.map((fila) => {
                      const prod = productoMap[fila.producto_id];
                      const stock = prod ? Number(stockMap[prod.id] ?? 0) : null;
                      const cant  = Number(fila.cantidad) || 0;
                      const restante = stock !== null ? stock - cant : null;
                      return (
                        <tr key={fila._key} className="border-b border-[#f0f5f5]">
                          {/* Producto */}
                          <Td>
                            <select
                              value={fila.producto_id}
                              onChange={e => setFila(fila._key, 'producto_id', e.target.value)}
                              className="w-full border border-[#c8d8d8] rounded-md px-2 py-1.5 text-[12px] text-[#1a2e2e] focus:outline-none focus:ring-1 focus:ring-[#012d1d]/30 min-w-[200px]"
                            >
                              <option value="">Seleccionar insumo…</option>
                              {productosDisponibles(fila._key).map(p => (
                                <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
                              ))}
                            </select>
                          </Td>

                          {/* Unidad */}
                          <Td>
                            <span className="text-[12px] text-[#6b8f8f] font-medium">
                              {prod?.unidad_abreviatura ?? '—'}
                            </span>
                          </Td>

                          {/* Stock actual */}
                          <Td right>
                            {stock !== null ? (
                              <span className={`text-[12px] font-medium ${stock <= 0 ? 'text-red-500' : 'text-[#1a2e2e]'}`}>
                                {fmt(stock, 2)}
                              </span>
                            ) : (
                              <span className="text-[#aebfbf]">—</span>
                            )}
                          </Td>

                          {/* Cantidad */}
                          <Td right>
                            <div className="flex flex-col items-end gap-0.5">
                              <input
                                type="number" min="0" step="0.01"
                                value={fila.cantidad}
                                onChange={e => setFila(fila._key, 'cantidad', e.target.value)}
                                placeholder="0.00"
                                className="w-28 border border-[#c8d8d8] rounded-md px-2 py-1.5 text-[12px] text-right text-[#1a2e2e] focus:outline-none focus:ring-1 focus:ring-[#012d1d]/30"
                              />
                              {restante !== null && cant > 0 && (
                                <span className={`text-[10px] ${restante < 0 ? 'text-red-500 font-semibold' : 'text-[#6b8f8f]'}`}>
                                  {restante < 0 ? `⚠ Deficit ${fmt(Math.abs(restante))}` : `Queda: ${fmt(restante)}`}
                                </span>
                              )}
                            </div>
                          </Td>

                          {/* Eliminar */}
                          <Td center>
                            <button
                              type="button" onClick={() => eliminarFila(fila._key)}
                              className="p-1 rounded-md text-[#aebfbf] hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Td>
                        </tr>
                      );
                    })}
                  </TBody>
                </table>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Notas</label>
              <textarea
                value={notas} onChange={e => setNotas(e.target.value)}
                rows={2} placeholder="Observaciones adicionales…"
                className="w-full border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <BtnPrimary type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Registrar consumo'}
              </BtnPrimary>
            </div>
          </form>
        </ContentCard>

        {/* ── Historial del galpón ── */}
        {loteId && (
          <ContentCard>
            <div className="px-5 py-3 border-b border-[#f0f5f5]">
              <p className="text-[13px] font-bold text-[#1a2e2e]">
                Historial de consumos — {lotes.find(l => String(l.id) === String(loteId))?.numero ?? ''}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <THead>
                  <Th>N° Documento</Th>
                  <Th>Fecha</Th>
                  <Th>Período</Th>
                  <Th>Responsable</Th>
                  <Th center>Insumos</Th>
                  <Th>Notas</Th>
                  <Th center>Detalle</Th>
                </THead>
                <TBody>
                  {loadHist ? (
                    <LoadingRows cols={7} />
                  ) : historial.length === 0 ? (
                    <EmptyRow cols={7} title="Sin consumos registrados para este galpón" />
                  ) : (
                    historial.map(c => (
                      <Fragment key={c.id}>
                        <tr className="border-b border-[#f0f5f5] hover:bg-[#f8fbfb]">
                          <Td>
                            <span className="font-mono text-[11px] font-medium">{c.numero}</span>
                          </Td>
                          <Td>{fmtFecha(c.fecha)}</Td>
                          <Td>
                            <Badge variant={c.periodo === 'SEMANAL' ? 'info' : 'neutral'}>
                              {c.periodo_label}
                            </Badge>
                          </Td>
                          <Td>{c.responsable || '—'}</Td>
                          <Td center>
                            <span className="text-[12px] font-semibold text-[#1a2e2e]">{c.total_items}</span>
                          </Td>
                          <Td muted>{c.notas || '—'}</Td>
                          <Td center>
                            <button
                              onClick={() => setHistExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                              className="p-1 rounded text-[#6b8f8f] hover:text-[#012d1d] hover:bg-[#f0f5f5]"
                            >
                              {histExpanded[c.id]
                                ? <ChevronUp className="w-3.5 h-3.5" />
                                : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </Td>
                        </tr>
                        {histExpanded[c.id] && (
                          <tr>
                            <td colSpan={7} className="bg-[#f8fbfb] px-8 py-3 border-b border-[#f0f5f5]">
                              <table className="w-full text-[12px]">
                                <thead>
                                  <tr className="text-[#6b8f8f] uppercase text-[10px]">
                                    <th className="text-left py-1 pr-4 font-semibold">Producto</th>
                                    <th className="text-left py-1 pr-4 font-semibold">Código</th>
                                    <th className="text-right py-1 pr-4 font-semibold">Cantidad</th>
                                    <th className="text-left py-1 font-semibold">Unidad</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(c.items ?? []).map(it => (
                                    <tr key={it.id} className="border-t border-[#eef3f3]">
                                      <td className="py-1 pr-4 text-[#1a2e2e]">{it.producto}</td>
                                      <td className="py-1 pr-4 font-mono text-[#6b8f8f]">{it.producto_codigo}</td>
                                      <td className="py-1 pr-4 text-right font-medium text-[#1a2e2e]">{fmt(it.cantidad, 4)}</td>
                                      <td className="py-1 text-[#6b8f8f]">{it.unidad}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </TBody>
              </table>
            </div>
          </ContentCard>
        )}
      </div>
    </main>
  );
}
