import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Paperclip, CreditCard } from 'lucide-react';
import { getCuentasPagar, getProveedores, registrarPago, getCuentasCajaBanco } from '../utils/apiService';
import {
  BtnPrimary, BtnGhost, Badge,
  AlertError, AlertSuccess,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
} from '../ui/index.jsx';

const ESTADO_BADGE = {
  PENDIENTE: 'warning',
  PARCIAL:   'info',
  PAGADA:    'active',
};
const ESTADO_LABEL = {
  PENDIENTE: 'Pendiente',
  PARCIAL:   'Pago parcial',
  PAGADA:    'Pagada',
};
const METODOS = [
  { value: 'EFECTIVO',      label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia bancaria' },
  { value: 'CHEQUE',        label: 'Cheque' },
  { value: 'TARJETA',       label: 'Tarjeta' },
  { value: 'OTRO',          label: 'Otro' },
];

function fmt(n) {
  return Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function diasVencimiento(iso) {
  if (!iso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(iso + 'T00:00:00');
  return Math.round((venc - hoy) / 86400000);
}

const PAGO_INIT = {
  fecha_pago:          '',
  monto:               '',
  metodo_pago:         '',
  cuenta_caja_banco_id: '',
  referencia:          '',
  notas:               '',
  comprobante:         null,
};

// Acceso directo a la pantalla donde se corrige cada error de configuración.
const DESTINO_ERROR = {
  CAJA_SIN_CUENTA_CONTABLE: { vista: 'contabilidad_caja', label: 'Ir a Caja y Bancos' },
  SIN_CUENTA_PATRIMONIO:    { vista: 'config_empresa',    label: 'Ir a Configuración → Parámetros de Empresa' },
};

function ModalPago({ factura, onClose, onPagado, cuentasCaja, onNavegar }) {
  const [form, setForm]         = useState({ ...PAGO_INIT, fecha_pago: new Date().toISOString().slice(0, 10) });
  const [errores, setErrores]   = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCodigo, setErrorCodigo] = useState(null);
  const destino = DESTINO_ERROR[errorCodigo];
  const [guardando, setGuardando] = useState(false);
  const fileRef = useRef();

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function validar() {
    const e = {};
    if (!form.fecha_pago)                       e.fecha_pago           = 'Requerido';
    if (!form.monto || Number(form.monto) <= 0) e.monto                = 'Debe ser mayor a cero';
    if (!form.metodo_pago)                      e.metodo_pago          = 'Requerido';
    if (!form.cuenta_caja_banco_id)             e.cuenta_caja_banco_id = 'Requerido';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = validar();
    if (Object.keys(e2).length) { setErrores(e2); return; }
    setGuardando(true);
    setErrorMsg('');
    setErrorCodigo(null);
    try {
      const res = await registrarPago(factura.id, {
        fecha_pago:          form.fecha_pago,
        monto:               form.monto,
        metodo_pago:         form.metodo_pago,
        cuenta_caja_banco_id: Number(form.cuenta_caja_banco_id),
        referencia:          form.referencia,
        notas:               form.notas,
        comprobante_nombre:  form.comprobante?.name || '',
      });
      onPagado(res);
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar el pago');
      setErrorCodigo(err.data?.codigo ?? null);
    } finally {
      setGuardando(false);
    }
  }

  const saldo = Number(factura.saldo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4ecec]">
          <div>
            <p className="text-[13px] font-bold text-[#1a2e2e]">Registrar Pago</p>
            <p className="text-[11px] text-[#6b8f8f] mt-0.5">
              {factura.numero_factura} · {factura.proveedor} · Saldo: <span className="font-semibold text-[#1a2e2e]">${fmt(saldo)}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f0f5f5] text-[#6b8f8f]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {errorMsg && (
            <AlertError>
              {errorMsg}
              {destino && onNavegar && (
                <button
                  type="button"
                  onClick={() => onNavegar(destino.vista)}
                  className="block mt-1.5 font-semibold underline"
                >
                  {destino.label}
                </button>
              )}
            </AlertError>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Fecha */}
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                Fecha de pago <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.fecha_pago}
                onChange={e => set('fecha_pago', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 ${errores.fecha_pago ? 'border-red-400' : 'border-[#c8d8d8]'}`}
              />
              {errores.fecha_pago && <p className="text-[11px] text-red-500 mt-0.5">{errores.fecha_pago}</p>}
            </div>

            {/* Monto */}
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                Monto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#6b8f8f]">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={saldo}
                  value={form.monto}
                  onChange={e => set('monto', e.target.value)}
                  placeholder={fmt(saldo)}
                  className={`w-full border rounded-lg pl-7 pr-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 ${errores.monto ? 'border-red-400' : 'border-[#c8d8d8]'}`}
                />
              </div>
              {errores.monto && <p className="text-[11px] text-red-500 mt-0.5">{errores.monto}</p>}
              <button
                type="button"
                onClick={() => set('monto', String(saldo))}
                className="text-[10px] text-[#012d1d] hover:underline mt-0.5"
              >
                Pagar saldo completo
              </button>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
              Método de pago <span className="text-red-500">*</span>
            </label>
            <select
              value={form.metodo_pago}
              onChange={e => set('metodo_pago', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 ${errores.metodo_pago ? 'border-red-400' : 'border-[#c8d8d8]'}`}
            >
              <option value="">Seleccionar…</option>
              {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {errores.metodo_pago && <p className="text-[11px] text-red-500 mt-0.5">{errores.metodo_pago}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Cuenta de caja/banco */}
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">
                Cuenta de pago <span className="text-red-500">*</span>
              </label>
              <select
                value={form.cuenta_caja_banco_id}
                onChange={e => set('cuenta_caja_banco_id', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 ${errores.cuenta_caja_banco_id ? 'border-red-400' : 'border-[#c8d8d8]'}`}
              >
                <option value="">— Seleccionar —</option>
                {cuentasCaja.map(c => (
                  <option key={c.id} value={c.id} disabled={!c.cuenta_contable_id}>
                    {c.nombre} ({c.tipo_display}){!c.cuenta_contable_id ? ' — sin cuenta contable (vincúlala en Caja y Bancos)' : ''}
                  </option>
                ))}
              </select>
              {errores.cuenta_caja_banco_id && (
                <p className="text-[11px] text-red-500 mt-0.5">{errores.cuenta_caja_banco_id}</p>
              )}
            </div>

            {/* Referencia */}
            <div>
              <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Referencia / N° transferencia</label>
              <input
                type="text"
                value={form.referencia}
                onChange={e => set('referencia', e.target.value)}
                placeholder="Número de transacción"
                className="w-full border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Notas</label>
            <textarea
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              rows={2}
              className="w-full border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 resize-none"
            />
          </div>

          {/* Comprobante */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a2e2e] mb-1">Adjuntar comprobante</label>
            <input ref={fileRef} type="file" className="hidden" onChange={e => set('comprobante', e.target.files[0] || null)} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#c8d8d8] rounded-lg text-[12px] text-[#6b8f8f] hover:border-[#012d1d] hover:text-[#012d1d] transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                {form.comprobante ? form.comprobante.name : 'Seleccionar archivo'}
              </button>
              {form.comprobante && (
                <button type="button" onClick={() => set('comprobante', null)} className="text-[#6b8f8f] hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#e4ecec]">
          <BtnGhost onClick={onClose} disabled={guardando}>Cancelar</BtnGhost>
          <BtnPrimary onClick={handleSubmit} disabled={guardando}>
            <CreditCard className="w-3.5 h-3.5" />
            {guardando ? 'Guardando…' : 'Registrar pago'}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

export default function CuentasPagar({ onNavegar }) {
  const [data, setData]               = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [cuentasCaja, setCuentasCaja] = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [error, setError]             = useState('');
  const [exito, setExito]             = useState('');

  const [search, setSearch]                   = useState('');
  const [filtroEstado, setFiltroEstado]       = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');

  const [modalFactura, setModalFactura] = useState(null);

  useEffect(() => { cargar(); cargarProveedores(); cargarCuentasCaja(); }, []);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const res = await getCuentasPagar();
      setData(res);
    } catch (err) {
      setError(err.message || 'Error al cargar cuentas por pagar');
    } finally {
      setCargando(false);
    }
  }

  async function cargarProveedores() {
    try {
      const res = await getProveedores();
      setProveedores(res.results ?? res);
    } catch (_) {}
  }

  async function cargarCuentasCaja() {
    try {
      const res = await getCuentasCajaBanco();
      setCuentasCaja(res);
    } catch (_) {}
  }

  const itemsFiltrados = useMemo(() => {
    if (!data) return [];
    let lista = data.items;
    if (filtroEstado)    lista = lista.filter(f => f.estado === filtroEstado);
    if (filtroProveedor) lista = lista.filter(f => f.proveedor_id === Number(filtroProveedor));
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(f =>
        f.numero_factura.toLowerCase().includes(q) ||
        f.proveedor.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [data, filtroEstado, filtroProveedor, search]);

  function limpiarFiltros() {
    setSearch('');
    setFiltroEstado('');
    setFiltroProveedor('');
  }

  function handlePagado(resultado) {
    setModalFactura(null);
    setExito(`Pago registrado correctamente. Saldo restante: $${fmt(resultado.saldo)}`);
    cargar();
    setTimeout(() => setExito(''), 5000);
  }

  const resumen = data?.resumen;
  const hayFiltros = search || filtroEstado || filtroProveedor;

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <PageHeader title="Cuentas por Pagar" />

        {exito && <AlertSuccess className="mb-4">{exito}</AlertSuccess>}
        {error && <AlertError className="mb-4">{error}</AlertError>}

        {/* Tarjetas resumen */}
        {resumen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-white border border-[#e4ecec] rounded-lg px-4 py-3">
              <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wide">Total a Pagar</p>
              <p className="text-[22px] font-bold text-[#1a2e2e] mt-1 leading-tight">
                ${fmt(resumen.total_a_pagar)}
              </p>
              <p className="text-[11px] text-[#aebfbf] mt-0.5">Facturas pendientes + parciales</p>
            </div>

            <div className={`border rounded-lg px-4 py-3 ${Number(resumen.vence_semana) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#e4ecec]'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${Number(resumen.vence_semana) > 0 ? 'text-amber-600' : 'text-[#6b8f8f]'}`}>
                Vence Esta Semana
              </p>
              <p className={`text-[22px] font-bold mt-1 leading-tight ${Number(resumen.vence_semana) > 0 ? 'text-amber-700' : 'text-[#aebfbf]'}`}>
                ${fmt(resumen.vence_semana)}
              </p>
              <p className="text-[11px] text-[#aebfbf] mt-0.5">Próximos 7 días</p>
            </div>

            <div className={`border rounded-lg px-4 py-3 ${Number(resumen.vencidas) > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#e4ecec]'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${Number(resumen.vencidas) > 0 ? 'text-red-600' : 'text-[#6b8f8f]'}`}>
                Vencidas
              </p>
              <p className={`text-[22px] font-bold mt-1 leading-tight ${Number(resumen.vencidas) > 0 ? 'text-red-700' : 'text-[#aebfbf]'}`}>
                ${fmt(resumen.vencidas)}
              </p>
              <p className="text-[11px] text-[#aebfbf] mt-0.5">Con fecha de vencimiento pasada</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <ContentCard className="mb-4">
          <div className="p-4 flex flex-wrap gap-3 items-end">
            {/* Buscador */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b8f8f]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por factura o proveedor…"
                className="w-full pl-8 pr-3 py-2 border border-[#c8d8d8] rounded-lg text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30"
              />
            </div>

            {/* Estado */}
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PARCIAL">Pago parcial</option>
              <option value="PAGADA">Pagada</option>
            </select>

            {/* Proveedor */}
            <select
              value={filtroProveedor}
              onChange={e => setFiltroProveedor(e.target.value)}
              className="border border-[#c8d8d8] rounded-lg px-3 py-2 text-[13px] text-[#1a2e2e] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 min-w-[160px]"
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>

            {hayFiltros && (
              <BtnGhost onClick={limpiarFiltros}>
                <X className="w-3.5 h-3.5" /> Limpiar
              </BtnGhost>
            )}
          </div>
        </ContentCard>

        {/* Tabla */}
        <ContentCard>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <THead>
                <Th>Factura</Th>
                <Th>Proveedor</Th>
                <Th>Fecha Factura</Th>
                <Th>Vencimiento</Th>
                <Th right>Total</Th>
                <Th right>Pagado</Th>
                <Th right>Saldo</Th>
                <Th>Estado</Th>
                <Th center>Acciones</Th>
              </THead>
              <TBody>
                {cargando ? (
                  <LoadingRows cols={9} />
                ) : itemsFiltrados.length === 0 ? (
                  <EmptyRow cols={9} title={hayFiltros ? 'Sin resultados para los filtros aplicados' : 'No hay facturas por pagar'} />
                ) : (
                  itemsFiltrados.map(f => {
                    const dias = diasVencimiento(f.fecha_vencimiento);
                    const vencida = dias !== null && dias < 0 && f.estado !== 'PAGADA';
                    return (
                      <tr key={f.id} className="border-b border-[#f0f5f5] hover:bg-[#f8fbfb]">
                        <Td>
                          <span className="font-mono text-[12px] font-medium text-[#1a2e2e]">
                            {f.numero_factura}
                          </span>
                          {f.orden_compra_numero && (
                            <p className="text-[10px] text-[#aebfbf]">OC: {f.orden_compra_numero}</p>
                          )}
                        </Td>
                        <Td>{f.proveedor}</Td>
                        <Td>{fmtFecha(f.fecha)}</Td>
                        <Td>
                          <span className={vencida ? 'text-red-600 font-semibold' : ''}>
                            {fmtFecha(f.fecha_vencimiento)}
                          </span>
                          {f.fecha_vencimiento && f.estado !== 'PAGADA' && (
                            <p className={`text-[10px] mt-0.5 ${dias < 0 ? 'text-red-500' : dias <= 7 ? 'text-amber-500' : 'text-[#aebfbf]'}`}>
                              {dias < 0 ? `Vencida hace ${Math.abs(dias)} día(s)` : dias === 0 ? 'Vence hoy' : `${dias} día(s)`}
                            </p>
                          )}
                        </Td>
                        <Td right>
                          <span className="font-medium">${fmt(f.total_pagar)}</span>
                        </Td>
                        <Td right>
                          <span className="text-green-700">${fmt(f.monto_pagado)}</span>
                        </Td>
                        <Td right>
                          <span className={`font-semibold ${Number(f.saldo) > 0 ? 'text-[#1a2e2e]' : 'text-[#aebfbf]'}`}>
                            ${fmt(f.saldo)}
                          </span>
                        </Td>
                        <Td>
                          <Badge variant={ESTADO_BADGE[f.estado] || 'neutral'}>
                            {ESTADO_LABEL[f.estado] || f.estado}
                          </Badge>
                        </Td>
                        <Td center>
                          {f.estado !== 'PAGADA' && (
                            <button
                              onClick={() => setModalFactura(f)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#012d1d] bg-[#e8f5ee] hover:bg-[#c8e8d8] rounded-lg transition-colors"
                            >
                              <CreditCard className="w-3 h-3" />
                              Pagar
                            </button>
                          )}
                        </Td>
                      </tr>
                    );
                  })
                )}
              </TBody>
            </table>
          </div>
          {!cargando && itemsFiltrados.length > 0 && (
            <div className="px-4 py-2 text-[12px] text-[#6b8f8f] border-t border-[#f0f5f5]">
              {itemsFiltrados.length} factura(s)
              {hayFiltros && ` (filtradas de ${data?.items?.length ?? 0})`}
            </div>
          )}
        </ContentCard>
      </div>

      {modalFactura && (
        <ModalPago
          factura={modalFactura}
          onClose={() => setModalFactura(null)}
          onPagado={handlePagado}
          cuentasCaja={cuentasCaja}
          onNavegar={onNavegar}
        />
      )}
    </main>
  );
}
