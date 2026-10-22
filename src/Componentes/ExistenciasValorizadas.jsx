import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { PageHeader, ContentCard, BtnPrimary, BtnSecondary } from '../ui/index.jsx';
import { getExistenciasValorizadas, getCategoriasCatalogo, getGalpones } from '../utils/apiService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

// Normaliza respuestas de DRF: array puro, {results:[...]}, o {items:[...]}
const toArray = (r) => (Array.isArray(r) ? r : r?.results ?? r?.items ?? []);

const fmtN = (n, dec = 2) =>
  Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtM = (n) =>
  `$${fmtN(n, 2)}`;

function exportarCSV(datos, filtros) {
  const header = ['Código', 'Producto', 'Categoría', 'Unidad', 'Cantidad', 'Costo Prom. Unit.', 'Valor Total'];
  const rows = (datos.items || []).map((r) => [
    r.codigo,
    r.producto,
    r.categoria,
    r.unidad,
    r.cantidad,
    r.costo_promedio,
    r.valor_total,
  ]);
  rows.push(['', '', '', 'TOTAL', '', '', datos.totales?.valor_total ?? '']);

  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const nombre = `existencias_valorizadas_${filtros.fecha_hasta || TODAY}.csv`;
  const blob   = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ExistenciasValorizadas() {
  const [fechaHasta,   setFechaHasta]   = useState(TODAY);
  const [categoriaId,  setCategoriaId]  = useState('');
  const [galponId,     setGalponId]     = useState('');
  const [categorias,   setCategorias]   = useState([]);
  const [galpones,     setGalpones]     = useState([]);
  const [datos,        setDatos]        = useState(null);
  const [cargando,     setCargando]     = useState(false);
  const [error,        setError]        = useState('');
  const tableRef = useRef(null);

  // Load filter options (defensive: DRF may return array, {results:[]}, or {items:[]})
  useEffect(() => {
    getCategoriasCatalogo().then((r) => setCategorias(toArray(r))).catch(() => {});
    getGalpones().then((r) => setGalpones(toArray(r))).catch(() => {});
  }, []);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const params = { fecha_hasta: fechaHasta };
      if (categoriaId) params.categoria_id = categoriaId;
      if (galponId)    params.galpon_id    = galponId;
      setDatos(await getExistenciasValorizadas(params));
    } catch (e) {
      setError(e.message || 'Error al generar el reporte.');
    } finally {
      setCargando(false);
    }
  }, [fechaHasta, categoriaId, galponId]);

  // Auto-load on mount
  useEffect(() => { consultar(); }, []);

  const items    = datos?.items ?? [];
  const totales  = datos?.totales ?? {};
  const sinStock = items.filter((i) => parseFloat(i.cantidad) <= 0).length;
  const conStock = items.length - sinStock;

  // Group by category for the category subtotals
  const categoriaGrupos = {};
  items.forEach((item) => {
    if (!categoriaGrupos[item.categoria]) {
      categoriaGrupos[item.categoria] = { items: [], valor: 0, categoria_id: item.categoria_id };
    }
    categoriaGrupos[item.categoria].items.push(item);
    categoriaGrupos[item.categoria].valor += parseFloat(item.valor_total);
  });

  const handlePrint = () => window.print();

  return (
    <>
      {/* Print styles injected inline */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #reporte-print-root { display: block !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          #reporte-print-root table { font-size: 10px; }
          #reporte-print-root th, #reporte-print-root td { padding: 4px 6px; }
          @page { margin: 15mm; size: A4 landscape; }
        }
        .print-only { display: none; }
      `}</style>

      <main className="flex-1 flex flex-col overflow-hidden" id="reporte-print-root">
        <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

          {/* Header */}
          <PageHeader
            title="Existencias Valorizadas"
            subtitle="Reporte de inventario con costo promedio ponderado al corte de fecha"
          >
            <div className="flex items-center gap-2 no-print">
              <BtnSecondary onClick={handlePrint} disabled={!datos || cargando}>
                <span className="material-symbols-outlined text-[16px]">print</span>
                Imprimir
              </BtnSecondary>
              <BtnPrimary onClick={() => datos && exportarCSV(datos, { fecha_hasta: fechaHasta })} disabled={!datos || cargando}>
                <span className="material-symbols-outlined text-[16px]">download</span>
                Exportar CSV / Excel
              </BtnPrimary>
            </div>
          </PageHeader>

          {/* Print header (only visible when printing) */}
          <div className="print-only mb-4">
            <h1 className="text-lg font-bold">Capipollo — Existencias Valorizadas</h1>
            <p className="text-sm text-gray-600">
              Corte al: {fechaHasta}
              {categoriaId && categorias.find((c) => String(c.id) === categoriaId)
                ? ` · Categoría: ${categorias.find((c) => String(c.id) === categoriaId).nombre}`
                : ''}
              {galponId && galpones.find((g) => String(g.id) === galponId)
                ? ` · Galpón: ${galpones.find((g) => String(g.id) === galponId).nombre}`
                : ''}
            </p>
          </div>

          {/* Filters */}
          <ContentCard className="mb-5 no-print">
            <div className="px-5 py-4 flex flex-wrap gap-4 items-end">

              <div>
                <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider mb-1.5">
                  Corte de fecha
                </p>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  max={TODAY}
                  className="text-[13px] text-[#1a2e2e] bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider mb-1.5">
                  Categoría
                </p>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="text-[13px] text-[#1a2e2e] bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 min-w-[180px]"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider mb-1.5">
                  Galpón
                </p>
                <select
                  value={galponId}
                  onChange={(e) => setGalponId(e.target.value)}
                  className="text-[13px] text-[#1a2e2e] bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 min-w-[180px]"
                >
                  <option value="">Todos los galpones</option>
                  {galpones.map((g) => (
                    <option key={g.id} value={g.id}>{g.nombre}</option>
                  ))}
                </select>
              </div>

              <BtnPrimary onClick={consultar} loading={cargando}>
                <span className="material-symbols-outlined text-[16px]">search</span>
                Generar Reporte
              </BtnPrimary>

              {datos && !cargando && (
                <div className="ml-auto flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-[#9ab0b0] uppercase tracking-wider">Productos</p>
                    <p className="text-[16px] font-bold text-[#1a2e2e]">{conStock}</p>
                  </div>
                  <div className="w-px h-8 bg-[#e4ecec]" />
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-[#9ab0b0] uppercase tracking-wider">Sin stock</p>
                    <p className="text-[16px] font-bold text-[#9ab0b0]">{sinStock}</p>
                  </div>
                  <div className="w-px h-8 bg-[#e4ecec]" />
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-[#9ab0b0] uppercase tracking-wider">Valor Total</p>
                    <p className="text-[18px] font-bold text-[#012d1d]">{fmtM(totales.valor_total)}</p>
                  </div>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 flex items-center gap-2 no-print">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {/* Loading */}
          {cargando && (
            <div className="flex items-center justify-center py-20 gap-3 text-[#6b8f8f] no-print">
              <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
              <span className="text-[14px]">Calculando existencias…</span>
            </div>
          )}

          {/* Report Table */}
          {!cargando && datos && (
            <div ref={tableRef}>

              {/* Print summary */}
              <div className="print-only mb-3 p-3 bg-gray-50 border rounded text-sm flex gap-8">
                <span><strong>Corte:</strong> {datos.fecha_hasta}</span>
                <span><strong>Productos:</strong> {items.length}</span>
                <span><strong>Valor Total:</strong> {fmtM(totales.valor_total)}</span>
              </div>

              <div className="bg-white border border-[#e4ecec] rounded-xl overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[#012d1d] text-white">
                      <th className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wider">Código</th>
                      <th className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wider">Producto</th>
                      <th className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wider">Categoría</th>
                      <th className="px-4 py-3 text-center font-semibold text-[11px] uppercase tracking-wider">Unidad</th>
                      <th className="px-4 py-3 text-right font-semibold text-[11px] uppercase tracking-wider">Cantidad</th>
                      <th className="px-4 py-3 text-right font-semibold text-[11px] uppercase tracking-wider">Costo Prom. Unit.</th>
                      <th className="px-4 py-3 text-right font-semibold text-[11px] uppercase tracking-wider">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(categoriaGrupos).map(([catNombre, grupo]) => (
                      <Fragment key={catNombre}>
                        {/* Category header */}
                        <tr className="bg-[#f0f7f4]">
                          <td colSpan={7} className="px-4 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#012d1d] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">folder</span>
                                {catNombre}
                              </span>
                              <span className="text-[11px] font-semibold text-[#012d1d]">
                                {fmtM(grupo.valor)}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Product rows */}
                        {grupo.items.map((item, i) => {
                          const qty = parseFloat(item.cantidad);
                          const sinStockRow = qty <= 0;
                          return (
                            <tr
                              key={item.id}
                              className={`border-b border-[#f4f8f8] transition-colors ${
                                sinStockRow
                                  ? 'bg-[#fafafa] text-[#c0c8c8]'
                                  : i % 2 === 0 ? 'bg-white hover:bg-[#fafcfc]' : 'bg-[#fbfcfc] hover:bg-[#fafcfc]'
                              }`}
                            >
                              <td className="px-4 py-2.5 font-mono text-[11px] text-[#6b8f8f]">{item.codigo}</td>
                              <td className="px-4 py-2.5">
                                <span className="font-medium text-[#1a2e2e]">{item.producto}</span>
                                {sinStockRow && (
                                  <span className="ml-2 text-[9px] font-bold text-[#c0c8c8] uppercase tracking-wider">sin stock</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-[#6b8f8f]">{item.categoria}</td>
                              <td className="px-4 py-2.5 text-center text-[#6b8f8f]">{item.unidad}</td>
                              <td className={`px-4 py-2.5 text-right font-mono font-semibold ${sinStockRow ? 'text-[#c0c8c8]' : 'text-[#1a2e2e]'}`}>
                                {fmtN(item.cantidad, 2)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-[#6b8f8f]">
                                {sinStockRow ? '—' : fmtM(item.costo_promedio)}
                              </td>
                              <td className={`px-4 py-2.5 text-right font-mono font-bold ${sinStockRow ? 'text-[#c0c8c8]' : 'text-[#1a2e2e]'}`}>
                                {sinStockRow ? '—' : fmtM(item.valor_total)}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}

                    {/* Empty */}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-[#9ab0b0] text-[13px]">
                          No hay productos con los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Footer totals */}
                  {items.length > 0 && (
                    <tfoot>
                      <tr className="bg-[#012d1d] text-white">
                        <td colSpan={4} className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider">
                          Total General — {items.length} producto{items.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] font-bold font-mono">
                          {/* No meaningful total for mixed-unit quantities */}
                          —
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] text-emerald-300">
                          Corte: {datos.fecha_hasta}
                        </td>
                        <td className="px-4 py-3 text-right text-[16px] font-bold font-mono text-emerald-300">
                          {fmtM(totales.valor_total)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Footer note */}
              <p className="mt-3 text-[11px] text-[#9ab0b0] text-right no-print">
                Costo promedio ponderado calculado sobre entradas al {datos.fecha_hasta}
              </p>
              <p className="mt-1 text-[11px] text-[#9ab0b0] text-right print-only">
                Generado por Capipollo ERP · {new Date().toLocaleString('es-MX')}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
