import { useState, useEffect, useMemo, Fragment } from 'react';
import { ArrowLeft, Plus, Bird, AlertTriangle, X, Paperclip, FileText, Scissors, ChevronDown, ChevronRight, Ban, Filter } from 'lucide-react';
import { getLotes, createLote, getLoteDetalle, patchLote, anularLote, registrarMortalidad, registrarBeneficio, getProductosTerminados, getProductos, getRecepcionesDisponibles } from '../utils/apiService';
import { getGalpones } from '../utils/apiService';
import {
  BtnPrimary, BtnGhost, Badge,
  AlertError, AlertSuccess,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
} from '../ui/index.jsx';

function fmt(n) {
  return Number(n || 0).toLocaleString('es-CO');
}
function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function estadoBadge(estado) {
  if (estado === 'ACTIVO')  return 'active';
  if (estado === 'CERRADO') return 'inactive';
  if (estado === 'ANULADO') return 'critical';
  return 'neutral';
}

// ── Modal Nuevo Lote ─────────────────────────────────────────────────────────

function ModalNuevoLote({ galpones, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    numero: '', fecha_entrada: new Date().toISOString().slice(0, 10),
    cantidad_inicial: '', galpon_id: '', producto_ave_id: '',
    recepcion_item_id: '', notas_origen: '',
  });
  const [productosAve,          setProductosAve]          = useState([]);
  const [recepcionesDisponibles, setRecepcionesDisponibles] = useState([]);
  const [loadingRecepciones,     setLoadingRecepciones]     = useState(true);
  const [recepcionSel,           setRecepcionSel]           = useState(null);
  const [errores,                setErrores]                = useState({});
  const [guardando,              setGuardando]              = useState(false);
  const [errorMsg,               setErrorMsg]               = useState('');

  useEffect(() => {
    getProductos({ naturaleza: 'AVE_INICIAL', activo: 'true' })
      .then(r => setProductosAve(r.results ?? r))
      .catch(() => {});
    getRecepcionesDisponibles({ tipo_producto: 'AVE_INICIAL' })
      .then(r => setRecepcionesDisponibles(r.items ?? []))
      .catch(() => setRecepcionesDisponibles([]))
      .finally(() => setLoadingRecepciones(false));
  }, []);

  useEffect(() => {
    if (!form.recepcion_item_id) { setRecepcionSel(null); return; }
    const rec = recepcionesDisponibles.find(r => String(r.id) === form.recepcion_item_id);
    setRecepcionSel(rec ?? null);
  }, [form.recepcion_item_id, recepcionesDisponibles]);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    const ev = {};
    if (!form.recepcion_item_id)                                  ev.recepcion_item_id = 'Requerido';
    if (!form.fecha_entrada)                                       ev.fecha_entrada     = 'Requerido';
    if (!form.cantidad_inicial || Number(form.cantidad_inicial) <= 0)
                                                                   ev.cantidad_inicial  = 'Debe ser mayor a cero';
    if (!form.galpon_id)                                           ev.galpon_id         = 'Requerido';
    if (!form.producto_ave_id)                                     ev.producto_ave_id   = 'Requerido';
    if (Object.keys(ev).length) { setErrores(ev); return; }

    setGuardando(true);
    setErrorMsg('');
    try {
      const res = await createLote({
        numero:            form.numero || undefined,
        fecha_entrada:     form.fecha_entrada,
        cantidad_inicial:  Number(form.cantidad_inicial),
        galpon_id:         Number(form.galpon_id),
        producto_ave_id:   Number(form.producto_ave_id),
        recepcion_item_id: Number(form.recepcion_item_id),
        notas_origen:      form.notas_origen,
      });
      onGuardar(res);
    } catch (err) {
      setErrorMsg(err.message || 'Error al crear el lote');
    } finally {
      setGuardando(false);
    }
  }

  const inputCls = (err) =>
    `w-full border rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 ${err ? 'border-red-400' : 'border-[#c8d8d8]'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f5f5] flex-shrink-0">
          <p className="text-[14px] font-bold text-[#1a2e2e]">Nuevo Lote</p>
          <button onClick={onCerrar} className="p-1 rounded text-[#aebfbf] hover:text-[#1a2e2e]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
          {errorMsg && <AlertError>{errorMsg}</AlertError>}

          {/* Recepción de origen */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
              Recepción de pollito BB de origen <span className="text-red-500">*</span>
            </label>
            {loadingRecepciones ? (
              <p className="text-[12px] text-[#6b8f8f] py-2">Cargando recepciones disponibles…</p>
            ) : recepcionesDisponibles.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-[12px] text-amber-700">
                  No hay recepciones de pollito BB con saldo disponible. Registra una recepción
                  en el módulo de Compras antes de abrir un lote.
                </p>
              </div>
            ) : (
              <select
                value={form.recepcion_item_id}
                onChange={e => set('recepcion_item_id', e.target.value)}
                className={inputCls(errores.recepcion_item_id)}
              >
                <option value="">Seleccionar recepción…</option>
                {recepcionesDisponibles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.proveedor_nombre} | {r.fecha_recepcion} | {r.orden_compra_numero}
                    {r.lote_proveedor ? ` | Lote: ${r.lote_proveedor}` : ''}
                    {` | Disp: ${Number(r.saldo_disponible).toLocaleString('es-CO')} aves`}
                  </option>
                ))}
              </select>
            )}
            {errores.recepcion_item_id && (
              <p className="text-[11px] text-red-500 mt-0.5">{errores.recepcion_item_id}</p>
            )}
          </div>

          {/* Panel read-only: info de la recepción seleccionada */}
          {recepcionSel && (
            <div className="rounded-lg bg-[#f5f8f8] border border-[#dde8e8] px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f] mb-0.5">Proveedor</p>
                <p className="text-[13px] font-medium text-[#1a2e2e]">{recepcionSel.proveedor_nombre}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f] mb-0.5">Fecha recepción</p>
                <p className="text-[13px] font-medium text-[#1a2e2e]">{fmtFecha(recepcionSel.fecha_recepcion)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f] mb-0.5">Orden de compra</p>
                <p className="text-[13px] font-medium text-[#1a2e2e]">{recepcionSel.orden_compra_numero}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f] mb-0.5">Saldo disponible</p>
                <p className="text-[13px] font-medium text-emerald-700">
                  {Number(recepcionSel.saldo_disponible).toLocaleString('es-CO')} aves
                </p>
              </div>
              {recepcionSel.lote_proveedor && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f] mb-0.5">Lote proveedor</p>
                  <p className="text-[13px] font-medium text-[#1a2e2e]">{recepcionSel.lote_proveedor}</p>
                </div>
              )}
            </div>
          )}

          {/* Producto Ave Inicial */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
              Producto Ave Inicial <span className="text-red-500">*</span>
            </label>
            <select
              value={form.producto_ave_id} onChange={e => set('producto_ave_id', e.target.value)}
              className={inputCls(errores.producto_ave_id)}
            >
              <option value="">Seleccionar producto…</option>
              {productosAve.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
              ))}
            </select>
            {errores.producto_ave_id && <p className="text-[11px] text-red-500 mt-0.5">{errores.producto_ave_id}</p>}
            {form.producto_ave_id && (
              <p className="text-[11px] text-[#6b8f8f] mt-0.5">
                El costo se calculará automáticamente del costo promedio en inventario.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                N° Lote <span className="text-[#6b8f8f] font-normal">(opcional — se autogenera)</span>
              </label>
              <input
                type="text" value={form.numero} onChange={e => set('numero', e.target.value)}
                placeholder="Ej: LOT-001"
                className={inputCls(errores.numero)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                Fecha de entrada <span className="text-red-500">*</span>
              </label>
              <input
                type="date" value={form.fecha_entrada} onChange={e => set('fecha_entrada', e.target.value)}
                className={inputCls(errores.fecha_entrada)}
              />
              {errores.fecha_entrada && <p className="text-[11px] text-red-500 mt-0.5">{errores.fecha_entrada}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                Cantidad inicial de aves <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="1" step="1" value={form.cantidad_inicial}
                onChange={e => set('cantidad_inicial', e.target.value)}
                placeholder="Ej: 5000"
                className={inputCls(errores.cantidad_inicial)}
              />
              {errores.cantidad_inicial && <p className="text-[11px] text-red-500 mt-0.5">{errores.cantidad_inicial}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                Galpón <span className="text-red-500">*</span>
              </label>
              <select
                value={form.galpon_id} onChange={e => set('galpon_id', e.target.value)}
                className={inputCls(errores.galpon_id)}
              >
                <option value="">Seleccionar…</option>
                {galpones.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
              {errores.galpon_id && <p className="text-[11px] text-red-500 mt-0.5">{errores.galpon_id}</p>}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Notas de origen</label>
            <textarea
              value={form.notas_origen} onChange={e => set('notas_origen', e.target.value)}
              rows={2} placeholder="Raza, procedencia, observaciones…"
              className="w-full border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 resize-none"
            />
          </div>
        </form>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#f0f5f5] flex-shrink-0">
          <BtnGhost type="button" onClick={onCerrar}>Cancelar</BtnGhost>
          <BtnPrimary type="button" onClick={handleSubmit} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear lote'}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// ── Modal Anular Lote ────────────────────────────────────────────────────────

function ModalAnularLote({ lote, onAnulado, onCerrar }) {
  const [motivo,    setMotivo]    = useState('');
  const [anulando,  setAnulando]  = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!motivo.trim()) { setErrorMsg('El motivo es obligatorio.'); return; }
    setAnulando(true);
    setErrorMsg('');
    try {
      const res = await anularLote(lote.id, { motivo: motivo.trim() });
      onAnulado(res);
    } catch (err) {
      setErrorMsg(err.message || 'Error al anular el lote');
    } finally {
      setAnulando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f5f5]">
          <div>
            <p className="text-[14px] font-bold text-[#1a2e2e]">Anular Lote</p>
            <p className="text-[11px] text-[#6b8f8f] mt-0.5">
              Lote {lote.numero} — esta acción revierte el inventario y los asientos contables
            </p>
          </div>
          <button onClick={onCerrar} className="p-1 rounded text-[#aebfbf] hover:text-[#1a2e2e]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {errorMsg && <AlertError>{errorMsg}</AlertError>}
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-[12px] text-red-700">
            <strong>Advertencia:</strong> La anulación solo es posible si el lote no tiene mortalidad,
            consumos de insumos ni beneficios registrados. El stock de aves se devolverá al inventario
            y los asientos contables quedarán revertidos.
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
              Motivo de anulación <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo} onChange={e => setMotivo(e.target.value)}
              rows={3} placeholder="Describa el motivo…"
              className="w-full border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <BtnGhost type="button" onClick={onCerrar}>Cancelar</BtnGhost>
            <button
              type="submit" disabled={anulando}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {anulando ? 'Anulando…' : 'Confirmar anulación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const CAUSAS = [
  { value: 'ENFERMEDAD',  label: 'Enfermedad' },
  { value: 'ACCIDENTE',   label: 'Accidente' },
  { value: 'CALOR',       label: 'Estrés térmico / Calor' },
  { value: 'DEPREDADOR',  label: 'Depredador' },
  { value: 'DESCONOCIDA', label: 'Desconocida' },
  { value: 'OTRA',        label: 'Otra' },
];

// ── Modal Registrar Mortalidad ────────────────────────────────────────────────

function ModalMortalidad({ lote, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    cantidad: '', causa: 'DESCONOCIDA', notas: '',
  });
  const [archivo,   setArchivo]   = useState(null);
  const [errores,   setErrores]   = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function handleArchivo(e) {
    const f = e.target.files?.[0] ?? null;
    setArchivo(f);
  }

  function quitarArchivo() {
    setArchivo(null);
    document.getElementById('mort-doc-input').value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.cantidad || Number(form.cantidad) <= 0) {
      setErrores({ cantidad: 'Debe ser mayor a cero' });
      return;
    }
    setGuardando(true);
    setErrorMsg('');
    try {
      const res = await registrarMortalidad(
        lote.id,
        { fecha: form.fecha, cantidad: Number(form.cantidad), causa: form.causa, notas: form.notas },
        archivo,
      );
      onGuardar(res);
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar mortalidad');
    } finally {
      setGuardando(false);
    }
  }

  const inputCls = (err) =>
    `w-full border rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 ${err ? 'border-red-400' : 'border-[#c8d8d8]'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f5f5]">
          <div>
            <p className="text-[14px] font-bold text-[#1a2e2e]">Registrar Mortalidad</p>
            <p className="text-[11px] text-[#6b8f8f] mt-0.5">
              Lote {lote.numero} — {fmt(lote.cantidad_actual)} aves actuales
            </p>
          </div>
          <button onClick={onCerrar} className="p-1 rounded text-[#aebfbf] hover:text-[#1a2e2e]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {errorMsg && <AlertError>{errorMsg}</AlertError>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Fecha</label>
              <input
                type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                className={inputCls(false)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                Cantidad de bajas <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="1" step="1" value={form.cantidad}
                onChange={e => set('cantidad', e.target.value)}
                placeholder="0"
                className={inputCls(errores.cantidad)}
              />
              {errores.cantidad && <p className="text-[11px] text-red-500 mt-0.5">{errores.cantidad}</p>}
            </div>
          </div>

          {/* Causa — dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Causa</label>
            <select
              value={form.causa} onChange={e => set('causa', e.target.value)}
              className={inputCls(false)}
            >
              {CAUSAS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Notas adicionales</label>
            <textarea
              value={form.notas} onChange={e => set('notas', e.target.value)}
              rows={2} placeholder="Observaciones…"
              className="w-full border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 resize-none"
            />
          </div>

          {/* Adjuntar documento */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
              Documento adjunto <span className="text-[#6b8f8f] font-normal">(opcional)</span>
            </label>
            {archivo ? (
              <div className="flex items-center gap-2 border border-[#c8d8d8] rounded-lg px-3 py-2 bg-[#f8fbfb]">
                <FileText className="w-4 h-4 text-[#012d1d] flex-shrink-0" />
                <span className="text-[12px] text-[#1a2e2e] flex-1 truncate">{archivo.name}</span>
                <button
                  type="button" onClick={quitarArchivo}
                  className="p-0.5 rounded text-[#aebfbf] hover:text-red-500 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="mort-doc-input"
                className="flex items-center gap-2 border border-dashed border-[#c8d8d8] rounded-lg px-3 py-2.5 cursor-pointer hover:border-[#012d1d]/40 hover:bg-[#f8fbfb] transition-colors"
              >
                <Paperclip className="w-4 h-4 text-[#6b8f8f]" />
                <span className="text-[12px] text-[#6b8f8f]">Haz clic para adjuntar un archivo…</span>
              </label>
            )}
            <input
              id="mort-doc-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleArchivo}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <BtnGhost type="button" onClick={onCerrar}>Cancelar</BtnGhost>
            <BtnPrimary type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Registrar'}
            </BtnPrimary>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Registrar Beneficio ─────────────────────────────────────────────────

const FILA_PT_VACIA = () => ({ _key: Math.random(), producto_terminado_id: '', kg_obtenidos: '', costo_unitario: '' });

function ModalBeneficio({ lote, productosTerminados, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    aves_beneficiadas: '',
    merma_decomiso: '0',
    costo_proceso: '0',
    responsable: '',
    notas: '',
  });
  const [lineas,    setLineas]    = useState([FILA_PT_VACIA()]);
  const [errores,   setErrores]   = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

  const avesDisp = lote.cantidad_actual ?? 0;
  const costoAcumulado = Number(lote.costo_acumulado_lote ?? 0);
  const cantIni  = lote.cantidad_inicial || 1;

  const avesBenef = parseFloat(form.aves_beneficiadas) || 0;
  const costoProceso = parseFloat(form.costo_proceso) || 0;
  const costoAvesTanda = costoAcumulado * avesBenef / cantIni;
  const costoTandaRef  = costoAvesTanda + costoProceso;

  const esUnaLinea = lineas.length === 1;
  const totalKgRepartido = lineas.reduce((s, l) => s + (parseFloat(l.kg_obtenidos) || 0), 0);

  // Para línea única: costo/kg automático
  function costoAutoLinea(kgStr) {
    const kg = parseFloat(kgStr) || 0;
    return kg > 0 ? (costoTandaRef / kg).toFixed(2) : '0';
  }

  // Costo repartido en despresado (Σ kg×costo)
  const costoRepartido = lineas.reduce((s, l) => {
    return s + (parseFloat(l.kg_obtenidos) || 0) * (parseFloat(l.costo_unitario) || 0);
  }, 0);
  const diferenciaCuadre = costoRepartido - costoTandaRef;

  function setFila(key, campo, valor) {
    setLineas(prev => prev.map(l => l._key === key ? { ...l, [campo]: valor } : l));
  }
  function agregarFila() { setLineas(prev => [...prev, FILA_PT_VACIA()]); }
  function eliminarFila(key) {
    setLineas(prev => prev.length === 1 ? [FILA_PT_VACIA()] : prev.filter(l => l._key !== key));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ev = {};
    if (!form.aves_beneficiadas || Number(form.aves_beneficiadas) <= 0) ev.aves = 'Debe ser mayor a cero';
    const totalProc = (parseFloat(form.aves_beneficiadas) || 0) + (parseFloat(form.merma_decomiso) || 0);
    if (totalProc > avesDisp) ev.aves = `Total a procesar (${totalProc}) supera las disponibles (${avesDisp})`;
    const lineasOk = lineas.filter(l => l.producto_terminado_id && parseFloat(l.kg_obtenidos) > 0);
    if (!lineasOk.length) ev.lineas = 'Agrega al menos una línea con producto y kg';
    if (Object.keys(ev).length) { setErrores(ev); return; }

    setGuardando(true);
    setErrorMsg('');
    try {
      const payload = {
        fecha:             form.fecha,
        responsable:       form.responsable,
        aves_beneficiadas: Number(form.aves_beneficiadas),
        merma_decomiso:    Number(form.merma_decomiso) || 0,
        costo_proceso:     Number(form.costo_proceso) || 0,
        notas:             form.notas,
        lineas: lineasOk.map(l => ({
          producto_terminado_id: Number(l.producto_terminado_id),
          kg_obtenidos:          l.kg_obtenidos,
          // Para línea única el backend calcula costo_unitario; para despresado lo enviamos
          ...(esUnaLinea ? {} : { costo_unitario: l.costo_unitario || '0' }),
        })),
      };
      const res = await registrarBeneficio(lote.id, payload);
      onGuardar(res);
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar beneficio');
    } finally {
      setGuardando(false);
    }
  }

  const inputCls = (err) =>
    `w-full border rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 ${err ? 'border-red-400' : 'border-[#c8d8d8]'}`;
  const inlineCls = 'w-full border border-[#c8d8d8] rounded-md px-2 py-1.5 text-[12px] text-[#1a2e2e] focus:outline-none focus:ring-1 focus:ring-[#012d1d]/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f5f5] flex-shrink-0">
          <div>
            <p className="text-[14px] font-bold text-[#1a2e2e]">Registrar Beneficio</p>
            <p className="text-[11px] text-[#6b8f8f] mt-0.5">
              Lote {lote.numero} — {fmt(avesDisp)} aves disponibles
            </p>
          </div>
          <button onClick={onCerrar} className="p-1 rounded text-[#aebfbf] hover:text-[#1a2e2e]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
          {errorMsg && <AlertError>{errorMsg}</AlertError>}

          {/* Fila 1: fecha, responsable, aves, merma */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Fecha</label>
              <input type="date" value={form.fecha}
                onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                className={inputCls(false)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                Aves beneficiadas <span className="text-red-500">*</span>
              </label>
              <input type="number" min="1" step="1" value={form.aves_beneficiadas}
                onChange={e => setForm(p => ({ ...p, aves_beneficiadas: e.target.value }))}
                placeholder={`Máx ${avesDisp}`}
                className={inputCls(errores.aves)} />
              {errores.aves && <p className="text-[11px] text-red-500 mt-0.5">{errores.aves}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                Merma / decomiso
                <span className="text-[#6b8f8f] font-normal ml-1">(aves)</span>
              </label>
              <input type="number" min="0" step="1" value={form.merma_decomiso}
                onChange={e => setForm(p => ({ ...p, merma_decomiso: e.target.value }))}
                className={inputCls(false)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Responsable</label>
              <input type="text" value={form.responsable}
                onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))}
                placeholder="Nombre…" className={inputCls(false)} />
            </div>
          </div>

          {/* Costo proceso */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                Costo de proceso ($)
                <span className="text-[#6b8f8f] font-normal ml-1">mano de obra, gas, empaque…</span>
              </label>
              <input type="number" min="0" step="100" value={form.costo_proceso}
                onChange={e => setForm(p => ({ ...p, costo_proceso: e.target.value }))}
                className={inputCls(false)} />
            </div>
            {/* Costo de referencia calculado */}
            {avesBenef > 0 && (
              <div className="flex flex-col justify-end">
                <div className="rounded-lg bg-[#f0f9f4] border border-[#c8e8d8] px-3 py-2">
                  <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider mb-0.5">
                    Costo referencia de la tanda
                  </p>
                  <p className="text-[15px] font-bold text-[#012d1d]">
                    {costoTandaRef.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-[#6b8f8f]">
                    Insumos + pollitos prorateados + costo proceso
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Notas</label>
            <textarea value={form.notas}
              onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              rows={2} placeholder="Observaciones opcionales…"
              className="w-full border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 resize-none" />
          </div>

          {/* Líneas de productos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-bold text-[#1a2e2e]">
                Productos obtenidos <span className="text-red-500">*</span>
              </label>
              <button type="button" onClick={agregarFila}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#012d1d] hover:underline">
                <Plus className="w-3.5 h-3.5" /> Agregar corte
              </button>
            </div>
            {errores.lineas && <p className="text-[11px] text-red-500 mb-1">{errores.lineas}</p>}
            <div className="border border-[#e8f0f0] rounded-lg overflow-hidden">
              <table className="w-full text-[12px]">
                <thead className="bg-[#f5f8f8]">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">Producto terminado</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">Kg obtenidos</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">
                      {esUnaLinea ? 'Costo/kg (auto)' : 'Costo/kg (manual)'}
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">Total línea</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lineas.map(lin => {
                    const kgVal    = parseFloat(lin.kg_obtenidos) || 0;
                    const costoVal = esUnaLinea
                      ? parseFloat(costoAutoLinea(lin.kg_obtenidos))
                      : (parseFloat(lin.costo_unitario) || 0);
                    const totalLin = kgVal * costoVal;
                    return (
                      <tr key={lin._key} className="border-t border-[#f0f5f5]">
                        <td className="px-3 py-2">
                          <select value={lin.producto_terminado_id}
                            onChange={e => setFila(lin._key, 'producto_terminado_id', e.target.value)}
                            className={`${inlineCls} min-w-[160px]`}>
                            <option value="">Seleccionar…</option>
                            {productosTerminados.map(pt => (
                              <option key={pt.id} value={pt.id}>{pt.nombre}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" value={lin.kg_obtenidos}
                            onChange={e => setFila(lin._key, 'kg_obtenidos', e.target.value)}
                            placeholder="0" className={`${inlineCls} w-20 text-right`} />
                        </td>
                        <td className="px-3 py-2">
                          {esUnaLinea ? (
                            <span className="block text-right font-medium text-[#6b8f8f] pr-2">
                              {kgVal > 0 && avesBenef > 0
                                ? Number(costoAutoLinea(lin.kg_obtenidos)).toLocaleString('es-CO', { minimumFractionDigits: 2 })
                                : '—'}
                            </span>
                          ) : (
                            <input type="number" min="0" step="100" value={lin.costo_unitario}
                              onChange={e => setFila(lin._key, 'costo_unitario', e.target.value)}
                              placeholder="0" className={`${inlineCls} w-24 text-right`} />
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-[#1a2e2e]">
                          {totalLin > 0
                            ? totalLin.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
                            : '—'}
                        </td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => eliminarFila(lin._key)}
                            className="p-1 rounded text-[#aebfbf] hover:text-red-500 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Indicador de cuadre para despresado */}
            {!esUnaLinea && avesBenef > 0 && costoTandaRef > 0 && (
              <div className={`mt-2 px-3 py-2 rounded-lg text-[11px] flex items-center justify-between
                ${Math.abs(diferenciaCuadre) < 1
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                <span>
                  Σ repartido:{' '}
                  <strong>
                    {costoRepartido.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                  </strong>
                  {' '}/ referencia:{' '}
                  <strong>
                    {costoTandaRef.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                  </strong>
                </span>
                <span className="font-bold ml-2">
                  {diferenciaCuadre >= 0 ? '+' : ''}
                  {diferenciaCuadre.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                  {' '}({costoTandaRef > 0 ? ((diferenciaCuadre / costoTandaRef) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#f0f5f5] flex-shrink-0">
          <BtnGhost type="button" onClick={onCerrar}>Cancelar</BtnGhost>
          <BtnPrimary type="button" disabled={guardando} onClick={handleSubmit}>
            {guardando ? 'Registrando…' : 'Registrar beneficio'}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// ── Vista Detalle de Lote ─────────────────────────────────────────────────────

function DetalleLote({ lote: loteInicial, onVolver, onActualizado }) {
  const [lote,              setLote]              = useState(loteInicial);
  const [modalMortalidad,   setModalMortalidad]   = useState(false);
  const [modalBeneficio,    setModalBeneficio]     = useState(false);
  const [modalAnular,       setModalAnular]       = useState(false);
  const [productosTerminados, setPT]              = useState([]);
  const [cerrando,          setCerrando]          = useState(false);
  const [errorMsg,          setErrorMsg]          = useState('');
  const [exitoMsg,          setExitoMsg]          = useState('');
  const [benefExpanded,     setBenefExpanded]     = useState({});

  async function cargarDetalle() {
    try {
      const [res, pts] = await Promise.all([
        getLoteDetalle(lote.id),
        getProductosTerminados({ activo: 'true' }),
      ]);
      setLote(res);
      setPT(pts);
    } catch (_) {}
  }

  useEffect(() => { cargarDetalle(); }, [lote.id]);

  async function handleCerrar() {
    if (!window.confirm(`¿Cerrar el lote ${lote.numero}? Esta acción cambia el estado a Cerrado.`)) return;
    setCerrando(true);
    setErrorMsg('');
    try {
      const res = await patchLote(lote.id, { estado: 'CERRADO' });
      setLote(res);
      onActualizado(res);
      setExitoMsg('Lote cerrado correctamente.');
      setTimeout(() => setExitoMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Error al cerrar el lote');
    } finally {
      setCerrando(false);
    }
  }

  function handleMortalidadGuardada(res) {
    setLote(res);
    onActualizado(res);
    setModalMortalidad(false);
    setExitoMsg('Mortalidad registrada.');
    setTimeout(() => setExitoMsg(''), 4000);
  }

  function handleAnulado(res) {
    setLote(res);
    onActualizado(res);
    setModalAnular(false);
    setExitoMsg(`Lote ${res.numero} anulado. Inventario y asientos revertidos.`);
    setTimeout(() => setExitoMsg(''), 6000);
  }

  function handleBeneficioGuardado(res) {
    // res contiene { lote, lote_cerrado, ... }
    if (res.lote) {
      setLote(res.lote);
      onActualizado(res.lote);
    }
    setModalBeneficio(false);
    const msg = res.lote_cerrado
      ? `Beneficio registrado. Lote cerrado automáticamente (aves = 0).`
      : `Beneficio ${res.numero} registrado — ${res.total_kg} kg producidos.`;
    setExitoMsg(msg);
    setTimeout(() => setExitoMsg(''), 6000);
    // Recargar para tener historial de beneficios actualizado
    cargarDetalle();
  }

  const registros  = lote.registros_mortalidad ?? [];
  const beneficios = lote.beneficios           ?? [];

  return (
    <>
      {modalMortalidad && (
        <ModalMortalidad
          lote={lote}
          onGuardar={handleMortalidadGuardada}
          onCerrar={() => setModalMortalidad(false)}
        />
      )}
      {modalBeneficio && (
        <ModalBeneficio
          lote={lote}
          productosTerminados={productosTerminados}
          onGuardar={handleBeneficioGuardado}
          onCerrar={() => setModalBeneficio(false)}
        />
      )}
      {modalAnular && (
        <ModalAnularLote
          lote={lote}
          onAnulado={handleAnulado}
          onCerrar={() => setModalAnular(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        {/* Breadcrumb */}
        <button
          onClick={onVolver}
          className="flex items-center gap-1.5 text-[12px] font-medium text-[#6b8f8f] hover:text-[#012d1d] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al listado
        </button>

        {exitoMsg && <AlertSuccess className="mb-4">{exitoMsg}</AlertSuccess>}
        {errorMsg && <AlertError  className="mb-4">{errorMsg}</AlertError>}

        {/* Header card */}
        <ContentCard className="mb-5">
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#e8f5f0] flex items-center justify-center flex-shrink-0">
                <Bird className="w-5 h-5 text-[#012d1d]" />
              </div>
              <div>
                <p className="text-[16px] font-bold text-[#1a2e2e] leading-tight">{lote.numero}</p>
                <p className="text-[12px] text-[#6b8f8f] mt-0.5">{lote.galpon_nombre}</p>
              </div>
              <Badge variant={estadoBadge(lote.estado)} dot={lote.estado === 'ACTIVO'}>{lote.estado_label}</Badge>
            </div>
            {lote.estado === 'ACTIVO' && (
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <button
                  onClick={() => setModalBeneficio(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  Registrar beneficio
                </button>
                <button
                  onClick={() => setModalMortalidad(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Registrar mortalidad
                </button>
                <button
                  onClick={handleCerrar}
                  disabled={cerrando}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#c8d8d8] text-[#6b8f8f] hover:bg-[#f0f5f5] transition-colors disabled:opacity-50"
                >
                  {cerrando ? 'Cerrando…' : 'Cerrar lote'}
                </button>
                <button
                  onClick={() => setModalAnular(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Anular lote
                </button>
              </div>
            )}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-0 border-t border-[#f0f5f5]">
            {[
              { label: 'Aves iniciales',  val: fmt(lote.cantidad_inicial),    color: 'text-[#1a2e2e]' },
              { label: 'Beneficiadas',    val: fmt(lote.cantidad_beneficiada ?? 0), color: 'text-[#012d1d]' },
              { label: 'Merma',           val: fmt(lote.cantidad_merma ?? 0), color: 'text-amber-600' },
              { label: 'Bajas mort.',     val: fmt(lote.cantidad_mortalidad), color: 'text-red-600',
                sub: `${lote.mortalidad_pct}%` },
              { label: 'Aves actuales',   val: fmt(lote.cantidad_actual),     color: 'text-emerald-700' },
            ].map(({ label, val, color, sub }) => (
              <div key={label} className="px-4 py-4 border-r border-[#f0f5f5] last:border-r-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f] mb-1">{label}</p>
                <p className={`text-[18px] font-bold ${color}`}>{val}</p>
                {sub && <p className="text-[10px] text-[#6b8f8f]">{sub} mort.</p>}
              </div>
            ))}
          </div>
        </ContentCard>

        {/* Info grid */}
        <ContentCard className="mb-5">
          <div className="px-5 pt-4 pb-2 border-b border-[#f0f5f5]">
            <p className="text-[13px] font-bold text-[#1a2e2e]">Información del lote</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
            {[
              { label: 'Fecha de entrada', val: fmtFecha(lote.fecha_entrada) },
              { label: 'Galpón asignado',  val: lote.galpon_nombre },
              { label: 'Proveedor/Origen', val: lote.proveedor_nombre || '—' },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f] mb-0.5">{label}</p>
                <p className="text-[13px] text-[#1a2e2e] font-medium">{val}</p>
              </div>
            ))}
            {lote.notas_origen && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f] mb-0.5">Notas de origen</p>
                <p className="text-[13px] text-[#1a2e2e]">{lote.notas_origen}</p>
              </div>
            )}
          </div>
        </ContentCard>

        {/* Historial de beneficios */}
        <ContentCard className="mb-5">
          <div className="px-5 py-3 border-b border-[#f0f5f5] flex items-center justify-between">
            <p className="text-[13px] font-bold text-[#1a2e2e]">Historial de beneficios</p>
            <span className="text-[11px] text-[#6b8f8f]">{beneficios.length} tanda{beneficios.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <THead>
                <Th>N° Beneficio</Th>
                <Th>Fecha</Th>
                <Th right>Aves benef.</Th>
                <Th right>Merma</Th>
                <Th right>Total kg</Th>
                <Th right>Rend. kg/ave</Th>
                <Th right>Costo tanda</Th>
                <Th center>Detalle</Th>
              </THead>
              <TBody>
                {beneficios.length === 0 ? (
                  <EmptyRow cols={8} title="Sin beneficios registrados" />
                ) : (
                  beneficios.map(b => (
                    <Fragment key={b.id}>
                      <tr className="border-b border-[#f0f5f5] hover:bg-[#f8fbfb]">
                        <Td>
                          <span className="font-mono text-[11px] font-semibold text-[#1a2e2e]">{b.numero}</span>
                        </Td>
                        <Td>{fmtFecha(b.fecha)}</Td>
                        <Td right><span className="font-semibold text-[#012d1d]">{fmt(b.aves_beneficiadas)}</span></Td>
                        <Td right>
                          {b.merma_decomiso > 0
                            ? <span className="text-amber-600 font-medium">{fmt(b.merma_decomiso)}</span>
                            : <span className="text-[#aebfbf]">—</span>}
                        </Td>
                        <Td right><span className="font-semibold">{Number(b.total_kg).toLocaleString('es-CO', { maximumFractionDigits: 2 })} kg</span></Td>
                        <Td right>{Number(b.rendimiento_kg_ave).toFixed(3)} kg/ave</Td>
                        <Td right>
                          {Number(b.costo_total_lineas) > 0
                            ? Number(b.costo_total_lineas).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
                            : <span className="text-[#aebfbf]">—</span>}
                        </Td>
                        <Td center>
                          <button
                            onClick={() => setBenefExpanded(prev => ({ ...prev, [b.id]: !prev[b.id] }))}
                            className="p-1 rounded hover:bg-[#f0f5f5] transition-colors text-[#6b8f8f]"
                          >
                            {benefExpanded[b.id]
                              ? <ChevronDown className="w-3.5 h-3.5" />
                              : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </Td>
                      </tr>
                      {benefExpanded[b.id] && (
                        <tr className="bg-[#f8fbfb]">
                          <td colSpan={8} className="px-6 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f] mb-2">Líneas de productos</p>
                            <table className="w-full text-[12px]">
                              <thead>
                                <tr>
                                  <th className="text-left text-[10px] text-[#6b8f8f] font-semibold py-1 pr-4">Producto</th>
                                  <th className="text-right text-[10px] text-[#6b8f8f] font-semibold py-1 pr-4">Kg obtenidos</th>
                                  <th className="text-right text-[10px] text-[#6b8f8f] font-semibold py-1 pr-4">Costo/kg</th>
                                  <th className="text-right text-[10px] text-[#6b8f8f] font-semibold py-1">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {b.lineas.map(lin => (
                                  <tr key={lin.id}>
                                    <td className="py-1 pr-4 font-medium text-[#1a2e2e]">{lin.producto_terminado_nombre}</td>
                                    <td className="py-1 pr-4 text-right">{Number(lin.kg_obtenidos).toLocaleString('es-CO', { maximumFractionDigits: 3 })} kg</td>
                                    <td className="py-1 pr-4 text-right text-[#6b8f8f]">
                                      {Number(lin.costo_unitario).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}/kg
                                    </td>
                                    <td className="py-1 text-right font-semibold">
                                      {Number(lin.total_linea).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                    </td>
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

        {/* Mortality history */}
        <ContentCard>
          <div className="px-5 py-3 border-b border-[#f0f5f5] flex items-center justify-between">
            <p className="text-[13px] font-bold text-[#1a2e2e]">Historial de mortalidad</p>
            <span className="text-[11px] text-[#6b8f8f]">{registros.length} registro{registros.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <THead>
                <Th>Fecha</Th>
                <Th right>Cantidad</Th>
                <Th>Causa</Th>
                <Th>Notas</Th>
                <Th center>Documento</Th>
              </THead>
              <TBody>
                {registros.length === 0 ? (
                  <EmptyRow cols={5} title="Sin registros de mortalidad" />
                ) : (
                  registros.map(r => (
                    <tr key={r.id} className="border-b border-[#f0f5f5] hover:bg-[#f8fbfb]">
                      <Td>{fmtFecha(r.fecha)}</Td>
                      <Td right>
                        <span className="font-semibold text-red-600">{fmt(r.cantidad)}</span>
                      </Td>
                      <Td>{r.causa_label || <span className="text-[#aebfbf] text-[11px]">—</span>}</Td>
                      <Td>{r.notas || <span className="text-[#aebfbf] text-[11px]">—</span>}</Td>
                      <Td center>
                        {r.documento_url ? (
                          <a
                            href={r.documento_url}
                            target="_blank"
                            rel="noreferrer"
                            title={r.documento_nombre}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#012d1d] border border-[#c8d8d8] hover:bg-[#e8f5f0] transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            Ver
                          </a>
                        ) : (
                          <span className="text-[#aebfbf] text-[11px]">—</span>
                        )}
                      </Td>
                    </tr>
                  ))
                )}
              </TBody>
            </table>
          </div>
        </ContentCard>
      </div>
    </>
  );
}

// ── Vista Lista ───────────────────────────────────────────────────────────────

export default function GestionLotes() {
  const [lotes,    setLotes]    = useState([]);
  const [galpones, setGalpones] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [exitoMsg,    setExitoMsg]    = useState('');

  const [modalNuevo, setModalNuevo] = useState(false);
  const [loteActivo, setLoteActivo] = useState(null);

  // Filtros
  const [busqueda,        setBusqueda]        = useState('');
  const [filtroEst,       setFiltroEst]       = useState('');
  const [filtroGal,       setFiltroGal]       = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [showFechaFilter,  setShowFechaFilter]  = useState(false);
  const [showEstFilter,    setShowEstFilter]    = useState(false);

  useEffect(() => { cargarTodo(); }, []);

  async function cargarTodo() {
    setLoading(true);
    try {
      const [lRes, gRes] = await Promise.all([
        getLotes(),
        getGalpones({ activo: 'true' }),
      ]);
      setLotes(lRes.items ?? []);
      setGalpones(gRes.results ?? gRes);
    } catch (err) {
      setErrorMsg(err.message || 'Error al cargar lotes');
    } finally {
      setLoading(false);
    }
  }

  function handleNuevoGuardado(res) {
    setLotes(prev => [res, ...prev]);
    setModalNuevo(false);
    setExitoMsg(`Lote ${res.numero} creado.`);
    setTimeout(() => setExitoMsg(''), 5000);
  }

  function handleActualizado(res) {
    setLotes(prev => prev.map(l => l.id === res.id ? res : l));
    if (loteActivo?.id === res.id) setLoteActivo(res);
  }

  const ESTADO_ORDEN = { ACTIVO: 0, CERRADO: 1, ANULADO: 2 };

  const lotesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return lotes
      .filter(l => {
        if (filtroEst        && l.estado         !== filtroEst)       return false;
        if (filtroGal        && String(l.galpon)  !== filtroGal)      return false;
        if (filtroFechaDesde && l.fecha_entrada   < filtroFechaDesde) return false;
        if (filtroFechaHasta && l.fecha_entrada   > filtroFechaHasta) return false;
        if (q && !l.numero.toLowerCase().includes(q) && !l.galpon_nombre.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (ESTADO_ORDEN[a.estado] ?? 9) - (ESTADO_ORDEN[b.estado] ?? 9));
  }, [lotes, busqueda, filtroEst, filtroGal, filtroFechaDesde, filtroFechaHasta]);

  const selectCls = 'border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 bg-white';

  if (loteActivo) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <DetalleLote
          lote={loteActivo}
          onVolver={() => setLoteActivo(null)}
          onActualizado={handleActualizado}
        />
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {modalNuevo && (
        <ModalNuevoLote
          galpones={galpones}
          onGuardar={handleNuevoGuardado}
          onCerrar={() => setModalNuevo(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <div className="flex items-center justify-between mb-5">
          <PageHeader title="Gestión de Lotes" />
          <BtnPrimary onClick={() => setModalNuevo(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Lote
          </BtnPrimary>
        </div>

        {exitoMsg && <AlertSuccess className="mb-4">{exitoMsg}</AlertSuccess>}
        {errorMsg && <AlertError  className="mb-4">{errorMsg}</AlertError>}

        <ContentCard>
          {/* Filtros */}
          <div className="px-5 py-3 border-b border-[#f0f5f5] flex flex-wrap gap-3 items-center">
            <input
              type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por N° lote o galpón…"
              className="border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 min-w-[220px]"
            />
            <select value={filtroGal} onChange={e => setFiltroGal(e.target.value)} className={selectCls}>
              <option value="">Todos los galpones</option>
              {galpones.map(g => <option key={g.id} value={String(g.id)}>{g.nombre}</option>)}
            </select>
            <span className="ml-auto text-[11px] text-[#6b8f8f]">{lotesFiltrados.length} lote{lotesFiltrados.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <THead>
                <Th>N° Lote</Th>
                <Th>
                  <span className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowFechaFilter(p => !p)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider select-none hover:text-[#012d1d] transition-colors"
                    >
                      Fecha entrada
                      <Filter className={`w-3 h-3 flex-shrink-0 ${(filtroFechaDesde || filtroFechaHasta) ? 'text-[#012d1d]' : 'text-[#aebfbf]'}`} />
                    </button>
                    {(filtroFechaDesde || filtroFechaHasta) && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setFiltroFechaDesde(''); setFiltroFechaHasta(''); }}
                        title="Limpiar filtro de fecha"
                        className="rounded-full p-0.5 text-[#012d1d] hover:bg-[#012d1d]/10 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                  {showFechaFilter && (
                    <div className="flex flex-col gap-0.5 mt-1.5 normal-case tracking-normal font-normal">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-[#6b8f8f] w-7 shrink-0">Desde</span>
                        <input
                          type="date"
                          value={filtroFechaDesde}
                          onChange={e => setFiltroFechaDesde(e.target.value)}
                          className="w-full border border-[#c8d8d8] rounded px-1 py-0.5 text-[10px] text-[#1a2e2e] bg-white focus:outline-none focus:ring-1 focus:ring-[#012d1d]/30"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-[#6b8f8f] w-7 shrink-0">Hasta</span>
                        <input
                          type="date"
                          value={filtroFechaHasta}
                          onChange={e => setFiltroFechaHasta(e.target.value)}
                          className="w-full border border-[#c8d8d8] rounded px-1 py-0.5 text-[10px] text-[#1a2e2e] bg-white focus:outline-none focus:ring-1 focus:ring-[#012d1d]/30"
                        />
                      </div>
                    </div>
                  )}
                </Th>
                <Th>Galpón</Th>
                <Th right>Aves iniciales</Th>
                <Th right>Bajas</Th>
                <Th right>Aves actuales</Th>
                <Th right>% Mort.</Th>
                <Th center>
                  <span className="inline-flex items-center justify-center gap-1 mx-auto">
                    <button
                      type="button"
                      onClick={() => setShowEstFilter(p => !p)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider select-none hover:text-[#012d1d] transition-colors"
                    >
                      Estado
                      <Filter className={`w-3 h-3 flex-shrink-0 ${filtroEst ? 'text-[#012d1d]' : 'text-[#aebfbf]'}`} />
                    </button>
                    {filtroEst && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setFiltroEst(''); }}
                        title="Limpiar filtro de estado"
                        className="rounded-full p-0.5 text-[#012d1d] hover:bg-[#012d1d]/10 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                  {showEstFilter && (
                    <select
                      value={filtroEst}
                      onChange={e => setFiltroEst(e.target.value)}
                      className="block mx-auto mt-1.5 border border-[#c8d8d8] rounded px-1.5 py-0.5 text-[10px] text-[#1a2e2e] bg-white normal-case tracking-normal font-medium focus:outline-none focus:ring-1 focus:ring-[#012d1d]/30"
                    >
                      <option value="">Todos</option>
                      <option value="ACTIVO">Activo</option>
                      <option value="CERRADO">Cerrado</option>
                      <option value="ANULADO">Anulado</option>
                    </select>
                  )}
                </Th>
                <Th center>Acciones</Th>
              </THead>
              <TBody>
                {loading ? (
                  <LoadingRows cols={9} />
                ) : lotesFiltrados.length === 0 ? (
                  <EmptyRow cols={9} title={lotes.length === 0 ? 'No hay lotes registrados' : 'Sin resultados para los filtros aplicados'} />
                ) : (
                  lotesFiltrados.map(l => (
                    <tr key={l.id} className="border-b border-[#f0f5f5] hover:bg-[#f8fbfb]">
                      <Td>
                        <span className="font-mono text-[11px] font-semibold text-[#1a2e2e]">{l.numero}</span>
                      </Td>
                      <Td>{fmtFecha(l.fecha_entrada)}</Td>
                      <Td>{l.galpon_nombre}</Td>
                      <Td right>{fmt(l.cantidad_inicial)}</Td>
                      <Td right>
                        <span className={l.cantidad_mortalidad > 0 ? 'text-red-600 font-semibold' : 'text-[#aebfbf]'}>
                          {fmt(l.cantidad_mortalidad)}
                        </span>
                      </Td>
                      <Td right>
                        <span className="font-semibold text-emerald-700">{fmt(l.cantidad_actual)}</span>
                      </Td>
                      <Td right>
                        <span className={`text-[12px] font-semibold ${l.mortalidad_pct > 5 ? 'text-red-600' : 'text-[#1a2e2e]'}`}>
                          {l.mortalidad_pct}%
                        </span>
                      </Td>
                      <Td center>
                        <Badge variant={estadoBadge(l.estado)} dot={l.estado === 'ACTIVO'}>{l.estado_label}</Badge>
                      </Td>
                      <Td center>
                        <button
                          onClick={() => setLoteActivo(l)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#012d1d] border border-[#c8d8d8] hover:bg-[#e8f5f0] transition-colors"
                        >
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
