import { useState, useEffect } from 'react';
import { Download, Package, ChevronDown } from 'lucide-react';
import { getProductos, getKardexProducto } from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, Badge,
  AlertError, PageHeader, ContentCard,
  Th, Td, THead, TBody, Spinner,
} from '../ui/index.jsx';

function hoy() {
  return new Date().toISOString().split('T')[0];
}
function primerDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function fmt(n, decimals = 2) {
  return Number(n).toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function exportarCSV(kardex, tieneFiltroDeFecha) {
  const { producto, movimientos, saldo_anterior } = kardex;
  const BOM = '﻿';
  const sep = ';';
  const headers = [
    'Fecha', 'Tipo Documento', 'N° Documento', 'Responsable', 'Lote',
    'Cant. Entrada', 'Cant. Salida', 'Saldo', 'Costo Unitario', 'Valor Total',
    'Observaciones',
  ];
  const filaApertura = tieneFiltroDeFecha && Number(saldo_anterior) !== 0
    ? ['Saldo anterior al período', '', '', '', '', '', '', saldo_anterior, '', '', '']
    : null;
  const filas = movimientos.map((m) => [
    m.fecha,
    m.tipo_documento_display,
    m.numero_documento,
    m.responsable,
    m.lote,
    m.cantidad_entrada,
    m.cantidad_salida,
    m.saldo,
    m.costo_unitario,
    m.valor_total,
    m.observaciones,
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

export function KardexProducto() {
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  const [productoId, setProductoId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes());
  const [fechaFin, setFechaFin] = useState(hoy());

  const [kardex, setKardex] = useState(null);
  const [cargandoKardex, setCargandoKardex] = useState(false);
  const [errorKardex, setErrorKardex] = useState('');

  useEffect(() => {
    async function cargar() {
      setCargandoProductos(true);
      try {
        const data = await getProductos();
        setProductos((data.results ?? data).filter((p) => p.activo));
      } catch (_err) {
        // No crítico — el select quedará vacío
      } finally {
        setCargandoProductos(false);
      }
    }
    cargar();
  }, []);

  async function consultarKardex() {
    if (!productoId) return;
    setCargandoKardex(true);
    setErrorKardex('');
    setKardex(null);
    try {
      const data = await getKardexProducto({
        producto: productoId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      setKardex(data);
    } catch (err) {
      setErrorKardex(err.message || 'Error al consultar el kardex');
    } finally {
      setCargandoKardex(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

        <PageHeader
          title="Kardex por Producto"
          subtitle="Libro de movimientos de inventario con saldo acumulado"
        >
          {kardex && (
            <BtnSecondary onClick={() => exportarCSV(kardex, !!fechaInicio)}>
              <Download className="w-3.5 h-3.5" />
              Exportar Excel
            </BtnSecondary>
          )}
        </PageHeader>

        {/* Filtros */}
        <ContentCard className="mb-4">
          <div className="px-4 py-3.5 flex flex-col sm:flex-row gap-3 items-end">
            {/* Selector producto */}
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                Producto
              </label>
              <div className="relative">
                <select
                  value={productoId}
                  onChange={(e) => setProductoId(e.target.value)}
                  disabled={cargandoProductos}
                  className="w-full bg-white border border-[#dde8e8] rounded-md pl-3 pr-8 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 appearance-none transition-colors disabled:opacity-50"
                >
                  <option value="">
                    {cargandoProductos ? 'Cargando productos...' : 'Seleccionar producto...'}
                  </option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} &mdash; {p.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
              </div>
            </div>

            {/* Fecha inicio */}
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

            {/* Fecha fin */}
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
              onClick={consultarKardex}
              disabled={!productoId || cargandoKardex}
              className="flex-shrink-0"
            >
              {cargandoKardex && <Spinner size="xs" className="text-white" />}
              Consultar
            </BtnPrimary>
          </div>
        </ContentCard>

        {errorKardex && <AlertError onRetry={consultarKardex}>{errorKardex}</AlertError>}

        {/* Estado inicial */}
        {!cargandoKardex && !kardex && !errorKardex && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-10 h-10 text-[#c4d4d4] mb-3" strokeWidth={1.5} />
            <p className="text-[14px] font-medium text-[#6b8f8f]">
              Selecciona un producto y aplica el filtro
            </p>
            <p className="text-[12px] text-[#aebfbf] mt-1">
              El kardex mostrará los movimientos con saldo acumulado
            </p>
          </div>
        )}

        {/* Cargando */}
        {cargandoKardex && (
          <div className="flex items-center justify-center gap-2 py-16 text-[#6b8f8f]">
            <Spinner size="md" className="text-[#6b8f8f]" />
            <span className="text-[13px]">Calculando kardex...</span>
          </div>
        )}

        {/* Resultado */}
        {kardex && !cargandoKardex && (
          <>
            {/* Tarjetas resumen */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">
                  Total Entradas
                </p>
                <p className="text-[20px] font-bold text-emerald-700 mt-1 leading-tight">
                  {fmt(kardex.totales.total_entradas, 2)}
                  <span className="text-[12px] font-medium ml-1.5">{kardex.producto.unidad}</span>
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">
                  Total Salidas
                </p>
                <p className="text-[20px] font-bold text-amber-700 mt-1 leading-tight">
                  {fmt(kardex.totales.total_salidas, 2)}
                  <span className="text-[12px] font-medium ml-1.5">{kardex.producto.unidad}</span>
                </p>
              </div>
              <div className="bg-[#f0f5f5] border border-[#dde8e8] rounded-lg px-4 py-3">
                <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wide">
                  Saldo Final
                </p>
                <p className="text-[20px] font-bold text-[#1a2e2e] mt-1 leading-tight">
                  {fmt(kardex.totales.saldo_final, 2)}
                  <span className="text-[12px] font-medium text-[#6b8f8f] ml-1.5">{kardex.producto.unidad}</span>
                </p>
              </div>
            </div>

            {/* Tabla */}
            <ContentCard>
              <div className="px-4 py-3 border-b border-[#e4ecec] flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-[#1a2e2e]">
                    {kardex.producto.codigo} &mdash; {kardex.producto.nombre}
                  </p>
                  <p className="text-[12px] text-[#6b8f8f] mt-0.5">
                    {kardex.movimientos.length} movimientos en el período
                  </p>
                </div>
              </div>

              {kardex.movimientos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <Package className="w-8 h-8 text-[#c4d4d4] mb-2" strokeWidth={1.5} />
                  <p className="text-[13px] font-medium text-[#6b8f8f]">Sin movimientos en el período</p>
                  <p className="text-[12px] text-[#aebfbf] mt-0.5">
                    Saldo anterior al período: {fmt(kardex.saldo_anterior, 2)} {kardex.producto.unidad}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <THead>
                      <Th>Fecha</Th>
                      <Th>Tipo</Th>
                      <Th>N° Documento</Th>
                      <Th>Responsable</Th>
                      <Th>Lote</Th>
                      <Th right>Entrada</Th>
                      <Th right>Salida</Th>
                      <Th right>Saldo</Th>
                      <Th right>Costo Unit.</Th>
                      <Th right>Valor Total</Th>
                    </THead>
                    <TBody>
                      {/* Fila de saldo anterior si hay filtro de fecha */}
                      {Number(kardex.saldo_anterior) !== 0 && (
                        <tr className="bg-[#f5f8f8]">
                          <td colSpan={5} className="px-4 py-2.5 text-[12px] italic text-[#6b8f8f]">
                            Saldo anterior al período
                          </td>
                          <Td right><span className="text-[#aebfbf]">—</span></Td>
                          <Td right><span className="text-[#aebfbf]">—</span></Td>
                          <Td right>
                            <span className="font-bold text-[13px] text-[#6b8f8f]">
                              {fmt(kardex.saldo_anterior, 2)}
                            </span>
                          </Td>
                          <Td right><span className="text-[#aebfbf]">—</span></Td>
                          <Td right><span className="text-[#aebfbf]">—</span></Td>
                        </tr>
                      )}

                      {kardex.movimientos.map((m) => (
                        <tr key={m.id} className="hover:bg-[#fafcfc] transition-colors">
                          <Td mono muted className="text-[12px] whitespace-nowrap">{m.fecha}</Td>
                          <Td>
                            <Badge variant={m.badge_variant}>{m.tipo_documento_display}</Badge>
                          </Td>
                          <Td mono muted className="text-[12px]">{m.numero_documento}</Td>
                          <Td muted className="text-[12px]">{m.responsable}</Td>
                          <Td mono muted className="text-[12px]">{m.lote || '—'}</Td>
                          <Td right>
                            {Number(m.cantidad_entrada) > 0 ? (
                              <span className="text-emerald-600 font-semibold text-[13px]">
                                +{fmt(m.cantidad_entrada, 2)}
                              </span>
                            ) : (
                              <span className="text-[#aebfbf]">—</span>
                            )}
                          </Td>
                          <Td right>
                            {Number(m.cantidad_salida) > 0 ? (
                              <span className="text-amber-600 font-semibold text-[13px]">
                                &minus;{fmt(m.cantidad_salida, 2)}
                              </span>
                            ) : (
                              <span className="text-[#aebfbf]">—</span>
                            )}
                          </Td>
                          <Td right>
                            <span
                              className={`font-bold text-[13px] ${
                                Number(m.saldo) > 0 ? 'text-[#1a2e2e]' : 'text-[#aebfbf]'
                              }`}
                            >
                              {fmt(m.saldo, 2)}
                            </span>
                          </Td>
                          <Td right muted className="text-[12px]">
                            ${fmt(m.costo_unitario, 2)}
                          </Td>
                          <Td right className="font-medium text-[13px]">
                            ${fmt(m.valor_total, 0)}
                          </Td>
                        </tr>
                      ))}
                    </TBody>
                  </table>
                </div>
              )}

              <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
                {kardex.movimientos.length} movimientos &middot; Saldo anterior al período:{' '}
                {fmt(kardex.saldo_anterior, 2)} {kardex.producto.unidad}
              </div>
            </ContentCard>
          </>
        )}
      </div>
    </main>
  );
}

export default KardexProducto;
