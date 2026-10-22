import { useState, useEffect } from 'react';
import { Download, Printer, Package, ChevronDown } from 'lucide-react';
import { getProductos, getKardexProducto } from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, AlertError, PageHeader, ContentCard,
  Spinner,
} from '../ui/index.jsx';

function hoy() {
  return new Date().toISOString().split('T')[0];
}
function primerDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function fmt(n, dec = 2) {
  return Number(n || 0).toLocaleString('es-CO', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function exportarCSV(kardex, tieneFecha) {
  const { producto, movimientos, saldo_anterior } = kardex;
  const BOM = '﻿';
  const sep = ';';
  const headers = [
    'Fecha', 'Tipo Documento', 'N° Documento', 'Responsable', 'Lote',
    'Cant. Entrada', 'Cant. Salida', 'Saldo', 'Costo Unitario', 'Valor Total', 'Observaciones',
  ];
  const filaApertura =
    tieneFecha && Number(saldo_anterior) !== 0
      ? ['Saldo anterior al período', '', '', '', '', '', '', saldo_anterior, '', '', '']
      : null;
  const filas = movimientos.map((m) => [
    m.fecha, m.tipo_documento_display, m.numero_documento, m.responsable,
    m.lote, m.cantidad_entrada, m.cantidad_salida, m.saldo,
    m.costo_unitario, m.valor_total, m.observaciones,
  ]);
  const todas = filaApertura ? [filaApertura, ...filas] : filas;
  const csv = [headers, ...todas]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(sep))
    .join('\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kardex_${producto.codigo}_${hoy()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ColHeader({ children, right }) {
  return (
    <th
      className={`px-2.5 py-2.5 text-[11px] font-semibold text-[#c8ddd8] uppercase tracking-wider whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  );
}

function Cell({ children, right, mono, muted, className = '' }) {
  return (
    <td
      className={`px-2.5 py-2 text-[12px] whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${mono ? 'font-mono' : ''} ${muted ? 'text-[#aebfbf]' : 'text-[#1a2e2e]'} ${className}`}
    >
      {children}
    </td>
  );
}

export default function ReporteKardex() {
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  const [productoId, setProductoId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes());
  const [fechaFin, setFechaFin] = useState(hoy());

  const [kardex, setKardex] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const data = await getProductos();
        setProductos((data.results ?? data).filter((p) => p.activo));
      } catch (_) {}
      finally { setCargandoProductos(false); }
    }
    cargar();
  }, []);

  async function consultar() {
    if (!productoId) return;
    setCargando(true);
    setError('');
    setKardex(null);
    try {
      const data = await getKardexProducto({
        producto: productoId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      setKardex(data);
    } catch (err) {
      setError(err.message || 'Error al consultar el kardex');
    } finally {
      setCargando(false);
    }
  }

  const tieneFiltroDeFecha = !!fechaInicio;
  const mostrarApertura = kardex && tieneFiltroDeFecha && Number(kardex.saldo_anterior) !== 0;

  const totalEntradas = kardex?.totales?.total_entradas ?? 0;
  const totalSalidas = kardex?.totales?.total_salidas ?? 0;
  const saldoFinal = kardex?.totales?.saldo_final ?? 0;

  return (
    <>
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #reporte-kardex, #reporte-kardex * { visibility: visible; }
          #reporte-kardex { position: fixed; inset: 0; padding: 16px; font-size: 11px; }
          .no-print { display: none !important; }
          table { font-size: 10px; }
          th, td { padding: 4px 6px !important; }
        }
      `}</style>

      <main id="reporte-kardex" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

          <PageHeader
            title="Reporte Kardex"
            subtitle="Movimientos de inventario por producto con saldo acumulado"
          >
            {kardex && (
              <div className="flex gap-2 no-print">
                <BtnSecondary onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </BtnSecondary>
                <BtnSecondary onClick={() => exportarCSV(kardex, tieneFiltroDeFecha)}>
                  <Download className="w-3.5 h-3.5" />
                  Exportar CSV
                </BtnSecondary>
              </div>
            )}
          </PageHeader>

          {/* Filtros */}
          <ContentCard className="mb-4 no-print">
            <div className="px-4 py-3.5 flex flex-col sm:flex-row gap-3 items-end">
              {/* Producto */}
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                  Producto <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <select
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    disabled={cargandoProductos}
                    className="w-full bg-white border border-[#dde8e8] rounded-md pl-3 pr-8 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 appearance-none transition-colors disabled:opacity-50"
                  >
                    <option value="">
                      {cargandoProductos ? 'Cargando...' : 'Seleccionar producto...'}
                    </option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} — {p.nombre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
                </div>
              </div>

              {/* Desde */}
              <div className="w-40 flex-shrink-0">
                <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                  Desde
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
                />
              </div>

              {/* Hasta */}
              <div className="w-40 flex-shrink-0">
                <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                  Hasta
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
                />
              </div>

              <BtnPrimary
                onClick={consultar}
                disabled={!productoId || cargando}
                className="flex-shrink-0"
              >
                {cargando && <Spinner size="xs" className="text-white" />}
                Consultar
              </BtnPrimary>
            </div>
          </ContentCard>

          {error && <AlertError onRetry={consultar}>{error}</AlertError>}

          {/* Estado inicial */}
          {!cargando && !kardex && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center no-print">
              <Package className="w-10 h-10 text-[#c4d4d4] mb-3" strokeWidth={1.5} />
              <p className="text-[14px] font-medium text-[#6b8f8f]">Selecciona un producto y aplica el filtro</p>
              <p className="text-[12px] text-[#aebfbf] mt-1">El reporte mostrará los movimientos con saldo acumulado</p>
            </div>
          )}

          {cargando && (
            <div className="flex items-center justify-center gap-2 py-16 text-[#6b8f8f] no-print">
              <Spinner size="md" className="text-[#6b8f8f]" />
              <span className="text-[13px]">Calculando kardex...</span>
            </div>
          )}

          {/* Resultado */}
          {kardex && !cargando && (
            <>
              {/* Encabezado del reporte */}
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-[15px] font-bold text-[#1a2e2e]">
                    {kardex.producto.codigo} &mdash; {kardex.producto.nombre}
                  </h2>
                  <p className="text-[12px] text-[#6b8f8f] mt-0.5">
                    Unidad: <span className="font-medium text-[#374040]">{kardex.producto.unidad}</span>
                    {fechaInicio && (
                      <>
                        {' · '}Período: <span className="font-medium text-[#374040]">{fechaInicio}</span>
                        {' al '}
                        <span className="font-medium text-[#374040]">{fechaFin || 'hoy'}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* KPIs rápidos */}
                <div className="flex gap-3">
                  {[
                    { label: 'Entradas', value: fmt(totalEntradas), color: 'text-emerald-700' },
                    { label: 'Salidas', value: fmt(totalSalidas), color: 'text-red-600' },
                    { label: 'Saldo Final', value: fmt(saldoFinal), color: 'text-[#012d1d]' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-lg border border-[#dde8e8] px-3 py-2 text-center min-w-[80px]">
                      <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">{label}</p>
                      <p className={`text-[14px] font-bold ${color} font-mono mt-0.5`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabla */}
              <div className="overflow-x-auto rounded-xl border border-[#dde8e8] shadow-sm">
                <table className="w-full border-collapse" style={{ minWidth: '860px' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(90deg, #012d1d 0%, #021f14 100%)' }}>
                      <ColHeader>Fecha</ColHeader>
                      <ColHeader>Tipo Documento</ColHeader>
                      <ColHeader>N° Documento</ColHeader>
                      <ColHeader>Responsable</ColHeader>
                      <ColHeader>Lote</ColHeader>
                      <ColHeader right>Entrada</ColHeader>
                      <ColHeader right>Salida</ColHeader>
                      <ColHeader right>Saldo</ColHeader>
                      <ColHeader right>Costo Unit.</ColHeader>
                      <ColHeader right>Valor Total</ColHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Fila de saldo de apertura */}
                    {mostrarApertura && (
                      <tr className="border-b border-[#dde8e8]" style={{ background: '#fff8e1' }}>
                        <td colSpan={5} className="px-2.5 py-2 text-[12px] font-semibold text-[#7a6000] italic">
                          ★ Saldo anterior al período
                        </td>
                        <Cell right mono className="text-[#aebfbf]">—</Cell>
                        <Cell right mono className="text-[#aebfbf]">—</Cell>
                        <td className="px-2.5 py-2 text-right text-[12.5px] font-bold font-mono text-[#7a6000]">
                          {fmt(kardex.saldo_anterior)}
                        </td>
                        <Cell right mono className="text-[#aebfbf]">—</Cell>
                        <Cell right mono className="text-[#aebfbf]">—</Cell>
                      </tr>
                    )}

                    {kardex.movimientos.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-[13px] text-[#aebfbf]">
                          Sin movimientos en el período seleccionado
                        </td>
                      </tr>
                    )}

                    {kardex.movimientos.map((m, i) => {
                      const esEntrada = Number(m.cantidad_entrada) > 0;
                      return (
                        <tr
                          key={m.id}
                          className={`border-b border-[#f0f5f5] transition-colors hover:bg-[#f5faf8] ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafcfc]'}`}
                        >
                          <Cell>{m.fecha}</Cell>
                          <Cell>
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${
                                esEntrada
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-600'
                              }`}
                            >
                              {m.tipo_documento_display}
                            </span>
                          </Cell>
                          <Cell muted={m.numero_documento === '—'}>{m.numero_documento}</Cell>
                          <Cell muted={m.responsable === '—'}>{m.responsable}</Cell>
                          <Cell muted={!m.lote}>{m.lote || '—'}</Cell>
                          <Cell right mono className={Number(m.cantidad_entrada) > 0 ? 'text-emerald-700 font-semibold' : 'text-[#aebfbf]'}>
                            {Number(m.cantidad_entrada) > 0 ? fmt(m.cantidad_entrada) : '—'}
                          </Cell>
                          <Cell right mono className={Number(m.cantidad_salida) > 0 ? 'text-red-600 font-semibold' : 'text-[#aebfbf]'}>
                            {Number(m.cantidad_salida) > 0 ? fmt(m.cantidad_salida) : '—'}
                          </Cell>
                          <Cell right mono className="font-bold text-[#012d1d]">
                            {fmt(m.saldo)}
                          </Cell>
                          <Cell right mono>{fmt(m.costo_unitario)}</Cell>
                          <Cell right mono className="font-semibold">{fmt(m.valor_total)}</Cell>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Totales */}
                  <tfoot>
                    <tr style={{ background: '#012d1d' }}>
                      <td colSpan={5} className="px-2.5 py-2.5 text-[12px] font-bold text-white">
                        Totales del período
                      </td>
                      <td className="px-2.5 py-2.5 text-right text-[13px] font-bold font-mono text-emerald-300">
                        {fmt(totalEntradas)}
                      </td>
                      <td className="px-2.5 py-2.5 text-right text-[13px] font-bold font-mono text-red-300">
                        {fmt(totalSalidas)}
                      </td>
                      <td className="px-2.5 py-2.5 text-right text-[13px] font-bold font-mono text-white">
                        {fmt(saldoFinal)}
                      </td>
                      <td className="px-2.5 py-2.5" />
                      <td className="px-2.5 py-2.5" />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Nota pie */}
              <p className="mt-3 text-[11px] text-[#aebfbf] text-right">
                Generado el {new Date().toLocaleString('es-CO')}
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
