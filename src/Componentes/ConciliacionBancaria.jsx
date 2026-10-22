// Conciliación por saldos (decisión deliberada): cada lado se marca como
// "revisado" independientemente; el cierre requiere que los saldos netos
// cuadren. No hay emparejamiento uno-a-uno entre movimiento y partida.
// Revisar si el volumen crece y se necesita matching explícito.

import { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare, Square, Plus, Trash2, X, Lock, Unlock,
  History, TrendingUp, TrendingDown, ChevronRight, AlertTriangle, ArrowLeft,
} from 'lucide-react';
import {
  getCuentasCajaBanco,
  getConciliaciones,
  createConciliacion,
  getConciliacionDetalle,
  cerrarConciliacion,
  reabrirConciliacion,
  descartarConciliacion,
  marcarMovimientoConciliado,
  createPartida,
  togglePartida,
  deletePartida,
  getMisPermisos,
} from '../utils/apiService.js';

const FMT = (n) =>
  parseFloat(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 });

const FECHA_LARGA = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Modal: agregar partida bancaria ──────────────────────────────────────────
function ModalPartida({ onSave, onClose, saving }) {
  const [form, setForm] = useState({
    fecha: '', descripcion: '', tipo: 'INGRESO', monto: '', referencia: '',
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#e2eded]">
          <h3 className="text-[15px] font-bold text-[#1a2e2e]">Agregar Partida Bancaria</h3>
          <button onClick={onClose} className="text-[#9eb8b8] hover:text-[#1a2e2e] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#6b8f8f] mb-1.5 uppercase tracking-wide">
              Tipo
            </label>
            <div className="flex rounded-lg overflow-hidden border border-[#d0e4e4]">
              {['INGRESO', 'EGRESO'].map((t) => (
                <button
                  key={t}
                  onClick={() => set('tipo', t)}
                  className={`flex-1 py-2 text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    form.tipo === t
                      ? t === 'INGRESO' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                      : 'bg-white text-[#6b8f8f] hover:bg-[#f5f8f8]'
                  }`}
                >
                  {t === 'INGRESO'
                    ? <TrendingUp className="w-3.5 h-3.5" />
                    : <TrendingDown className="w-3.5 h-3.5" />}
                  {t === 'INGRESO' ? 'Abono' : 'Cargo'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#6b8f8f] mb-1.5 uppercase tracking-wide">
                Fecha
              </label>
              <input
                type="date" value={form.fecha}
                onChange={(e) => set('fecha', e.target.value)}
                className="w-full h-9 px-3 text-[13px] border border-[#d0e4e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6b8f8f] mb-1.5 uppercase tracking-wide">
                Monto
              </label>
              <input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={form.monto}
                onChange={(e) => set('monto', e.target.value)}
                className="w-full h-9 px-3 text-[13px] border border-[#d0e4e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6b8f8f] mb-1.5 uppercase tracking-wide">
              Descripción
            </label>
            <input
              type="text" placeholder="Ej. Transferencia recibida"
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              className="w-full h-9 px-3 text-[13px] border border-[#d0e4e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6b8f8f] mb-1.5 uppercase tracking-wide">
              Referencia bancaria <span className="font-normal normal-case">(opcional)</span>
            </label>
            <input
              type="text" placeholder="Nro. de referencia"
              value={form.referencia}
              onChange={(e) => set('referencia', e.target.value)}
              className="w-full h-9 px-3 text-[13px] border border-[#d0e4e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
            />
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-[#6b8f8f] hover:text-[#1a2e2e] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="px-5 py-2 bg-[#0d9488] text-white text-[13px] font-semibold rounded-lg hover:bg-[#0b7a70] transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: reabrir conciliación ───────────────────────────────────────────────
function ModalReabrir({ onConfirm, onClose, saving }) {
  const [motivo, setMotivo] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-amber-200 bg-amber-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-[15px] font-bold text-amber-800">Reabrir Conciliación</h3>
          </div>
          <button onClick={onClose} className="text-amber-400 hover:text-amber-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-[13px] text-[#4a6f6f] leading-relaxed">
            Reabrir esta conciliación <strong>eliminará todas las marcas de conciliado</strong>{' '}
            en ambos paneles y registrará la acción en la bitácora con tu nombre y el motivo.
          </p>
          <div>
            <label className="block text-[11px] font-semibold text-[#6b8f8f] mb-1.5 uppercase tracking-wide">
              Motivo de reapertura <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Describe por qué se reabre esta conciliación..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2.5 text-[13px] border border-[#d0e4e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"
            />
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-[#6b8f8f] hover:text-[#1a2e2e] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => motivo.trim() && onConfirm(motivo.trim())}
            disabled={saving || !motivo.trim()}
            className="px-5 py-2 bg-amber-500 text-white text-[13px] font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-40"
          >
            {saving ? 'Reabriendo...' : 'Confirmar Reapertura'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Indicador de estado de diferencia (4 estados) ────────────────────────────
function IndicadorDiferencia({ movimientos, partidas, saldoBancoDec, saldoSistema, totalBancoPartidas }) {
  const hayMovimientos = movimientos.length > 0;
  const hayBanco = saldoBancoDec !== 0 || totalBancoPartidas !== 0;
  const saldoBancoFinal = saldoBancoDec !== 0 ? saldoBancoDec : totalBancoPartidas;
  const diferencia = saldoBancoFinal - saldoSistema;
  const esCuadrado = hayMovimientos && hayBanco && Math.abs(diferencia) < 0.005;

  if (!hayMovimientos) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
        <div className="text-center">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            Sin movimientos
          </p>
          <p className="text-[15px] font-bold text-slate-400 mt-0.5">
            No hay movimientos en el período
          </p>
        </div>
      </div>
    );
  }

  if (!hayBanco) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
        <div className="text-center">
          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
            Falta saldo banco
          </p>
          <p className="text-[15px] font-bold text-amber-700 mt-0.5">
            Ingresa el saldo según banco
          </p>
          <p className="text-[11px] text-amber-500 mt-0.5">
            Decláralo arriba o agrega partidas en el panel derecho
          </p>
        </div>
      </div>
    );
  }

  if (esCuadrado) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
        <div className="text-center">
          <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
            Diferencia no conciliada
          </p>
          <p className="text-[22px] font-bold text-emerald-700 mt-0.5">✓ Cuadrado</p>
          <p className="text-[11px] text-emerald-600">Los saldos coinciden exactamente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-2.5 rounded-xl bg-red-50 border border-red-200">
      <div className="text-center">
        <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
          Diferencia no conciliada
        </p>
        <p className="text-[22px] font-bold text-red-600 mt-0.5">
          ${FMT(Math.abs(diferencia))}
        </p>
        <p className="text-[11px] text-red-500">
          {diferencia > 0 ? 'Banco supera al sistema' : 'Sistema supera al banco'}
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ConciliacionBancaria() {
  const [cuentas, setCuentas] = useState([]);
  const [cuentaId, setCuentaId] = useState('');
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');
  const [saldoBanco, setSaldoBanco] = useState('');

  const [historial, setHistorial] = useState([]);
  const [conciliacion, setConciliacion] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [partidas, setPartidas] = useState([]);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [showAddPartida, setShowAddPartida] = useState(false);
  const [savingPartida, setSavingPartida] = useState(false);
  const [showReabrir, setShowReabrir] = useState(false);
  const [savingReabrir, setSavingReabrir] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const [errCierre, setErrCierre] = useState('');

  const [puedeReabrir, setPuedeReabrir] = useState(false);

  useEffect(() => {
    getCuentasCajaBanco().then((list) => {
      const bancos = list.filter((c) => c.tipo === 'BANCO');
      setCuentas(bancos);
      if (bancos.length === 1) setCuentaId(String(bancos[0].id));
    });
    getMisPermisos().then((data) => {
      const esAdmin = data.es_admin;
      const permReabrir = data.permisos?.['conta_concil_reabrir']?.puede_aprobar ?? false;
      setPuedeReabrir(esAdmin || permReabrir);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cuentaId) { setHistorial([]); return; }
    getConciliaciones({ cuenta_id: cuentaId }).then(setHistorial).catch(() => {});
  }, [cuentaId]);

  // ── Cálculos ───────────────────────────────────────────────────────────────
  const saldoSistema = useMemo(
    () => movimientos.reduce((s, m) => s + (m.tipo === 'INGRESO' ? +m.monto : -m.monto), 0),
    [movimientos],
  );

  const totalBancoPartidas = useMemo(
    () => partidas.reduce((s, p) => s + (p.tipo === 'INGRESO' ? +p.monto : -p.monto), 0),
    [partidas],
  );

  const saldoBancoDec = parseFloat(saldoBanco) || 0;
  const saldoBancoFinal = saldoBancoDec !== 0 ? saldoBancoDec : totalBancoPartidas;
  const diferencia = saldoBancoFinal - saldoSistema;
  const hayMovimientos = movimientos.length > 0;
  const hayBanco = saldoBancoDec !== 0 || totalBancoPartidas !== 0;
  const esCuadrado = hayMovimientos && hayBanco && Math.abs(diferencia) < 0.005;

  // Aviso cuando el saldo declarado y la suma de partidas existen pero difieren
  const discrepanciaBanco = saldoBancoDec !== 0 && totalBancoPartidas !== 0
    && Math.abs(saldoBancoDec - totalBancoPartidas) > 0.005;

  const cerrada = conciliacion?.estado === 'CERRADA';
  const reabierta = conciliacion?.estado === 'REABIERTA';

  // Tooltip para el botón Cerrar
  const tooltipCierre = (() => {
    if (!hayMovimientos) return 'No hay movimientos en el período — una conciliación vacía no puede cerrarse';
    if (!hayBanco) return 'Ingresa el saldo según banco antes de cerrar';
    if (!esCuadrado) return `Diferencia de $${FMT(Math.abs(diferencia))} pendiente — cuadra los saldos primero`;
    return '';
  })();

  // ── Acciones ───────────────────────────────────────────────────────────────
  async function cargarConciliacion(id) {
    setCargando(true);
    setError('');
    setErrCierre('');
    try {
      const detalle = await getConciliacionDetalle(id);
      setConciliacion(detalle);
      setMovimientos(detalle.movimientos || []);
      setPartidas(detalle.partidas || []);
      setSaldoBanco(
        detalle.saldo_banco_declarado && detalle.saldo_banco_declarado !== '0'
          ? detalle.saldo_banco_declarado
          : '',
      );
    } catch (e) {
      setError(e.message || 'Error al cargar la conciliación.');
    } finally {
      setCargando(false);
    }
  }

  async function handleIniciar() {
    if (!cuentaId || !periodoDesde || !periodoHasta) {
      setError('Selecciona una cuenta y completa el período.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const conc = await createConciliacion({
        cuenta_id: cuentaId,
        periodo_desde: periodoDesde,
        periodo_hasta: periodoHasta,
        saldo_banco_declarado: saldoBanco || '0',
      });
      await cargarConciliacion(conc.id);
      getConciliaciones({ cuenta_id: cuentaId }).then(setHistorial).catch(() => {});
    } catch (e) {
      setError(e.message || 'Error al iniciar la conciliación.');
      setCargando(false);
    }
  }

  function handleVolver() {
    setConciliacion(null);
    setMovimientos([]);
    setPartidas([]);
    setError('');
    setErrCierre('');
    setSaldoBanco('');
  }

  async function handleDescartar() {
    const n = partidas.length;
    const msg = n > 0
      ? `¿Descartar esta conciliación? Se perderán ${n} partida${n !== 1 ? 's' : ''} ingresada${n !== 1 ? 's' : ''}.`
      : '¿Descartar esta conciliación? La conciliación está vacía — no hay partidas que perder.';
    if (!window.confirm(msg)) return;
    setDescartando(true);
    try {
      await descartarConciliacion(conciliacion.id);
      getConciliaciones({ cuenta_id: cuentaId }).then(setHistorial).catch(() => {});
      handleVolver();
    } catch (e) {
      alert(e.message || 'Error al descartar la conciliación.');
    } finally {
      setDescartando(false);
    }
  }

  async function handleToggleMovimiento(movId, isChecked) {
    if (cerrada) return;
    setMovimientos((prev) =>
      prev.map((m) => (m.id === movId ? { ...m, conciliada: !isChecked } : m)),
    );
    try {
      await marcarMovimientoConciliado(conciliacion.id, movId, !isChecked);
    } catch {
      setMovimientos((prev) =>
        prev.map((m) => (m.id === movId ? { ...m, conciliada: isChecked } : m)),
      );
    }
  }

  async function handleTogglePartida(p) {
    if (cerrada) return;
    setPartidas((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, conciliada: !p.conciliada } : x)),
    );
    try {
      await togglePartida(p.id, !p.conciliada);
    } catch {
      setPartidas((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, conciliada: p.conciliada } : x)),
      );
    }
  }

  async function handleDeletePartida(id) {
    if (!window.confirm('¿Eliminar esta partida?')) return;
    try {
      await deletePartida(id);
      setPartidas((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert(e.message || 'Error al eliminar.');
    }
  }

  async function handleAddPartida(form) {
    setSavingPartida(true);
    try {
      const created = await createPartida(conciliacion.id, form);
      setPartidas((prev) => [...prev, created]);
      setShowAddPartida(false);
    } catch (e) {
      alert(e.message || 'Error al agregar la partida.');
    } finally {
      setSavingPartida(false);
    }
  }

  async function handleCerrar() {
    setErrCierre('');
    try {
      const result = await cerrarConciliacion(conciliacion.id);
      setConciliacion((prev) => ({
        ...prev,
        estado: 'CERRADA',
        cerrada_at: result.cerrada_at,
        cerrada_por: result.cerrada_por,
      }));
      getConciliaciones({ cuenta_id: cuentaId }).then(setHistorial).catch(() => {});
    } catch (e) {
      setErrCierre(e.message || 'Error al cerrar.');
    }
  }

  async function handleReabrir(motivo) {
    setSavingReabrir(true);
    try {
      const updated = await reabrirConciliacion(conciliacion.id, motivo);
      setConciliacion(updated);
      setMovimientos((prev) => prev.map((m) => ({ ...m, conciliada: false })));
      setPartidas((prev) => prev.map((p) => ({ ...p, conciliada: false })));
      setShowReabrir(false);
      getConciliaciones({ cuenta_id: cuentaId }).then(setHistorial).catch(() => {});
    } catch (e) {
      alert(e.message || 'Error al reabrir.');
    } finally {
      setSavingReabrir(false);
    }
  }

  const conciliadosSistema = movimientos.filter((m) => m.conciliada).length;
  const conciliadasBanco = partidas.filter((p) => p.conciliada).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-[#f5f8f8]">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-[#e2eded] px-6 py-4">
        <h1 className="text-[18px] font-bold text-[#1a2e2e]">Conciliación Bancaria</h1>
        <p className="text-[12px] text-[#6b8f8f] mt-0.5">
          Compara los movimientos del sistema contra el estado de cuenta bancario
        </p>
      </div>

      {/* Setup bar */}
      <div className="flex-shrink-0 bg-white border-b border-[#e2eded] px-6 py-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-[10px] font-semibold text-[#6b8f8f] mb-1 uppercase tracking-wide">
              Cuenta Bancaria
            </label>
            <select
              value={cuentaId}
              onChange={(e) => { setCuentaId(e.target.value); handleNueva(); }}
              disabled={!!conciliacion}
              className="h-9 pl-3 pr-8 text-[13px] font-medium text-[#1a2e2e] bg-[#f5f8f8] border border-[#d0e4e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30 disabled:opacity-50 min-w-[200px]"
            >
              <option value="">Seleccionar cuenta...</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}{c.banco ? ` — ${c.banco}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#6b8f8f] mb-1 uppercase tracking-wide">
              Desde
            </label>
            <input
              type="date" value={periodoDesde}
              onChange={(e) => setPeriodoDesde(e.target.value)}
              disabled={!!conciliacion}
              className="h-9 px-3 text-[13px] font-medium text-[#1a2e2e] bg-[#f5f8f8] border border-[#d0e4e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#6b8f8f] mb-1 uppercase tracking-wide">
              Hasta
            </label>
            <input
              type="date" value={periodoHasta}
              onChange={(e) => setPeriodoHasta(e.target.value)}
              disabled={!!conciliacion}
              className="h-9 px-3 text-[13px] font-medium text-[#1a2e2e] bg-[#f5f8f8] border border-[#d0e4e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#6b8f8f] mb-1 uppercase tracking-wide">
              Saldo según banco ($)
            </label>
            <input
              type="number" step="0.01" placeholder="0.00"
              value={saldoBanco}
              onChange={(e) => setSaldoBanco(e.target.value)}
              disabled={cerrada}
              className="h-9 px-3 text-[13px] font-medium text-[#1a2e2e] bg-[#f5f8f8] border border-[#d0e4e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30 w-36 disabled:opacity-50"
            />
          </div>

          {!conciliacion ? (
            <button
              onClick={handleIniciar}
              disabled={cargando}
              className="h-9 px-5 bg-[#0d9488] text-white text-[13px] font-semibold rounded-lg hover:bg-[#0b7a70] transition-colors disabled:opacity-50 self-end"
            >
              {cargando ? 'Cargando...' : 'Iniciar Conciliación'}
            </button>
          ) : (
            <div className="flex items-center gap-2 self-end">
              {/* Volver: siempre visible, no borra nada */}
              <button
                onClick={handleVolver}
                className="h-9 flex items-center gap-1.5 px-4 bg-[#f5f8f8] border border-[#d0e4e4] text-[#6b8f8f] text-[13px] font-semibold rounded-lg hover:bg-[#e8f0f0] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver
              </button>
              {/* Descartar: solo si no está cerrada */}
              {!cerrada && (
                <button
                  onClick={handleDescartar}
                  disabled={descartando}
                  className="h-9 px-4 bg-red-50 border border-red-200 text-red-600 text-[13px] font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {descartando ? 'Descartando...' : 'Descartar'}
                </button>
              )}
            </div>
          )}

          {error && <p className="text-[12px] text-red-500 self-end mb-1.5">{error}</p>}

          {conciliacion && (
            <div className={`ml-auto self-end flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold ${
              cerrada
                ? 'bg-slate-100 text-slate-500'
                : reabierta
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {cerrada
                ? <Lock className="w-3.5 h-3.5" />
                : reabierta
                  ? <Unlock className="w-3.5 h-3.5" />
                  : <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />}
              {cerrada ? 'Cerrada' : reabierta ? 'Reabierta' : 'Abierta'} — #{conciliacion.id}
            </div>
          )}
        </div>

        {/* Aviso de discrepancia entre saldo declarado y suma de partidas */}
        {discrepanciaBanco && !cerrada && (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              El saldo declarado (${FMT(saldoBancoDec)}) no coincide con la suma de partidas
              (${FMT(totalBancoPartidas)}). El saldo declarado es el valor que se usa para el
              cálculo. Revisa las partidas o corrige el saldo.
            </span>
          </div>
        )}
      </div>

      {conciliacion ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sello de cierre / reapertura */}
          {cerrada && (
            <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  Cerrada el{' '}
                  <strong className="text-slate-600">{FECHA_LARGA(conciliacion.cerrada_at)}</strong>
                  {conciliacion.cerrada_por && (
                    <> por <strong className="text-slate-600">{conciliacion.cerrada_por}</strong></>
                  )}
                </span>
              </div>
              {puedeReabrir && (
                <button
                  onClick={() => setShowReabrir(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Reabrir
                </button>
              )}
            </div>
          )}

          {reabierta && conciliacion.reabierta_at && (
            <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-2">
              <p className="text-[12px] text-amber-700">
                <Unlock className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                Reabierta el{' '}
                <strong>{FECHA_LARGA(conciliacion.reabierta_at)}</strong>
                {conciliacion.reabierta_por && (
                  <> por <strong>{conciliacion.reabierta_por}</strong></>
                )}
                {conciliacion.motivo_reapertura && (
                  <> — Motivo: <em>{conciliacion.motivo_reapertura}</em></>
                )}
              </p>
            </div>
          )}

          {/* Dos paneles */}
          <div className="flex-1 flex overflow-hidden">
            {/* Panel izquierdo: Movimientos del sistema */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-[#e2eded]">
              <div className="flex-shrink-0 px-5 py-2.5 bg-[#f0f7f7] border-b border-[#e2eded] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0d9488]" />
                <span className="text-[13px] font-bold text-[#1a2e2e]">Movimientos del Sistema</span>
                <span className="text-[11px] text-[#6b8f8f]">
                  {conciliadosSistema}/{movimientos.length} marcados
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {movimientos.length === 0 ? (
                  <div className="flex items-center justify-center h-full p-8">
                    <p className="text-[13px] text-[#6b8f8f] text-center">
                      No hay movimientos registrados en este período
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-white z-10 border-b border-[#e2eded]">
                      <tr>
                        <th className="w-10 px-3 py-2.5" />
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">Fecha</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">Descripción</th>
                        <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => handleToggleMovimiento(m.id, m.conciliada)}
                          className={`border-b border-[#f0f4f4] transition-colors ${
                            cerrada ? 'cursor-default' : 'cursor-pointer'
                          } ${m.conciliada ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-[#f8fbfb]'}`}
                        >
                          <td className="px-3 py-2.5">
                            {m.conciliada
                              ? <CheckSquare className="w-4 h-4 text-emerald-600" />
                              : <Square className="w-4 h-4 text-[#c5d8d8]" />}
                          </td>
                          <td className="px-3 py-2.5 text-[#4a6f6f] whitespace-nowrap">{m.fecha}</td>
                          <td className="px-3 py-2.5 text-[#1a2e2e]">
                            <div className="font-medium">{m.descripcion}</div>
                            {m.categoria && (
                              <div className="text-[10px] text-[#6b8f8f]">{m.categoria}</div>
                            )}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${
                            m.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {m.tipo === 'INGRESO' ? '+' : '−'}${FMT(m.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Panel derecho: Estado de cuenta bancario */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-shrink-0 px-5 py-2.5 bg-[#f0f7f7] border-b border-[#e2eded] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[13px] font-bold text-[#1a2e2e]">Estado de Cuenta Bancario</span>
                  <span className="text-[11px] text-[#6b8f8f]">
                    {conciliadasBanco}/{partidas.length} marcadas
                  </span>
                </div>
                {!cerrada && (
                  <button
                    onClick={() => setShowAddPartida(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d9488] text-white text-[12px] font-semibold rounded-lg hover:bg-[#0b7a70] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {partidas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
                    <p className="text-[13px] text-[#6b8f8f]">
                      Ingresa las partidas del estado de cuenta bancario para compararlas
                    </p>
                    {!cerrada && (
                      <button
                        onClick={() => setShowAddPartida(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d9488] text-white text-[12px] font-semibold rounded-lg hover:bg-[#0b7a70] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar primera partida
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-white z-10 border-b border-[#e2eded]">
                      <tr>
                        <th className="w-10 px-3 py-2.5" />
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">Fecha</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">Descripción</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">Ref.</th>
                        <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">Monto</th>
                        <th className="w-8 px-2 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {partidas.map((p) => (
                        <tr
                          key={p.id}
                          className={`group border-b border-[#f0f4f4] transition-colors ${
                            p.conciliada ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-[#f8fbfb]'
                          }`}
                        >
                          <td
                            className={`px-3 py-2.5 ${cerrada ? 'cursor-default' : 'cursor-pointer'}`}
                            onClick={() => handleTogglePartida(p)}
                          >
                            {p.conciliada
                              ? <CheckSquare className="w-4 h-4 text-blue-600" />
                              : <Square className="w-4 h-4 text-[#c5d8d8]" />}
                          </td>
                          <td className="px-3 py-2.5 text-[#4a6f6f] whitespace-nowrap">{p.fecha}</td>
                          <td className="px-3 py-2.5 font-medium text-[#1a2e2e]">{p.descripcion}</td>
                          <td className="px-3 py-2.5 text-[#6b8f8f]">{p.referencia || '—'}</td>
                          <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${
                            p.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {p.tipo === 'INGRESO' ? '+' : '−'}${FMT(p.monto)}
                          </td>
                          <td className="px-2 py-2.5">
                            {!cerrada && (
                              <button
                                onClick={() => handleDeletePartida(p.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#c5d8d8] hover:text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Barra inferior */}
          <div className="flex-shrink-0 bg-white border-t border-[#e2eded] px-6 py-3">
            <div className="flex items-center gap-6 flex-wrap">
              {/* Saldo sistema */}
              <div className="text-center min-w-[120px]">
                <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">Saldo Sistema</p>
                <p className="text-[18px] font-bold text-[#1a2e2e] mt-0.5">${FMT(saldoSistema)}</p>
                <p className="text-[10px] text-[#9eb8b8]">
                  {conciliadosSistema}/{movimientos.length} marcados
                </p>
              </div>

              <div className="text-[#c5d8d8] text-[18px] font-light select-none">vs</div>

              {/* Saldo banco */}
              <div className="text-center min-w-[120px]">
                <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">Saldo Banco</p>
                <p className="text-[18px] font-bold text-[#1a2e2e] mt-0.5">${FMT(saldoBancoFinal)}</p>
                <p className="text-[10px] text-[#9eb8b8]">
                  {saldoBancoDec !== 0
                    ? discrepanciaBanco
                      ? <span className="text-amber-500">⚠ declarado</span>
                      : 'declarado'
                    : `${conciliadasBanco}/${partidas.length} partidas`}
                </p>
              </div>

              {/* Indicador central */}
              <IndicadorDiferencia
                movimientos={movimientos}
                partidas={partidas}
                saldoBancoDec={saldoBancoDec}
                saldoSistema={saldoSistema}
                totalBancoPartidas={totalBancoPartidas}
              />

              {/* Botón cerrar / estado cerrado */}
              {!cerrada ? (
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={handleCerrar}
                    disabled={!esCuadrado}
                    title={tooltipCierre}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                      esCuadrado
                        ? 'bg-[#012d1d] text-white hover:bg-[#1a3d2d] shadow-sm'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Cerrar Conciliación
                  </button>
                  {!esCuadrado && tooltipCierre && (
                    <p className="text-[10px] text-[#9eb8b8] max-w-[220px] text-right leading-snug">
                      {tooltipCierre}
                    </p>
                  )}
                  {errCierre && (
                    <p className="text-[11px] text-red-500 max-w-[220px] text-right">{errCierre}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-[13px] font-semibold">
                  <Lock className="w-4 h-4" />
                  Conciliación Cerrada
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Estado inicial */
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#e8f4f4] flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-[#0d9488]">account_balance</span>
            </div>
            <h2 className="text-[16px] font-bold text-[#1a2e2e]">Iniciar Conciliación</h2>
            <p className="text-[13px] text-[#6b8f8f] max-w-xs leading-relaxed">
              Selecciona una cuenta bancaria, el período y el saldo según el estado de cuenta.
              Los movimientos del sistema se cargan automáticamente.
            </p>
            {cuentas.length === 0 && (
              <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 max-w-xs">
                No hay cuentas de tipo Banco. Agrega una en Caja y Bancos primero.
              </p>
            )}
          </div>

          {/* Sidebar historial */}
          {historial.length > 0 && (
            <div className="w-72 flex-shrink-0 border-l border-[#e2eded] bg-white flex flex-col overflow-hidden">
              <div className="flex-shrink-0 px-4 py-3 border-b border-[#e2eded] flex items-center gap-2">
                <History className="w-4 h-4 text-[#6b8f8f]" />
                <span className="text-[12px] font-bold text-[#1a2e2e] uppercase tracking-wide">
                  Historial
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
                {historial.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      setCuentaId(String(h.cuenta_id));
                      setPeriodoDesde(h.periodo_desde);
                      setPeriodoHasta(h.periodo_hasta);
                      cargarConciliacion(h.id);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f8f8] transition-colors border-b border-[#f0f4f4] text-left"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      h.estado === 'CERRADA'
                        ? 'bg-slate-400'
                        : h.estado === 'REABIERTA'
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#1a2e2e] truncate">
                        #{h.id} — {h.cuenta_nombre}
                      </p>
                      <p className="text-[11px] text-[#6b8f8f]">
                        {h.periodo_desde} → {h.periodo_hasta}
                      </p>
                      <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        h.estado === 'CERRADA'
                          ? 'bg-slate-100 text-slate-500'
                          : h.estado === 'REABIERTA'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {h.estado_display}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9eb8b8] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showAddPartida && (
        <ModalPartida
          onSave={handleAddPartida}
          onClose={() => setShowAddPartida(false)}
          saving={savingPartida}
        />
      )}

      {showReabrir && (
        <ModalReabrir
          onConfirm={handleReabrir}
          onClose={() => setShowReabrir(false)}
          saving={savingReabrir}
        />
      )}
    </main>
  );
}
