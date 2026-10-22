import { useState, useEffect, useMemo } from 'react';
import { Download, Printer, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react';
import { getReporteCompras, getProveedores, getCategoriasCatalogo } from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, AlertError, PageHeader, ContentCard, Spinner,
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
function toArray(r) {
  return Array.isArray(r) ? r : r?.results ?? r?.items ?? [];
}

function exportarCSV(grupos, resumen, fechaInicio, fechaFin) {
  const BOM = '﻿';
  const sep = ';';
  const headers = [
    'Proveedor', 'Fecha', 'N° OC', 'Código', 'Producto',
    'Categoría', 'Unidad', 'Cantidad', 'Costo Unitario', 'Total',
  ];
  const filas = [];
  grupos.forEach(({ proveedor, items, subtotal }) => {
    items.forEach((f) => {
      filas.push([
        proveedor, f.fecha, f.oc_numero, f.producto_codigo, f.producto,
        f.categoria, f.unidad, f.cantidad, f.precio_unitario, f.total,
      ]);
    });
    filas.push(['SUBTOTAL ' + proveedor, '', '', '', '', '', '', '', '', subtotal]);
  });
  filas.push(['TOTAL GENERAL', '', '', '', '', '', '', '', '', resumen.total_monto]);
  const csv = [headers, ...filas]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(sep))
    .join('\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte_compras_${fechaInicio}_${fechaFin}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function KpiCard({ icon, label, value, sub, color = 'text-[#012d1d]' }) {
  return (
    <div className="bg-white rounded-xl border border-[#dde8e8] shadow-sm px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-[#f0faf5] flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[20px] text-[#012d1d]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wide">{label}</p>
        <p className={`text-[18px] font-bold ${color} leading-tight font-mono`}>{value}</p>
        {sub && <p className="text-[11px] text-[#aebfbf] mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function GrupoProveedor({ proveedor, items, subtotal, collapsed, onToggle }) {
  return (
    <>
      {/* Fila de encabezado de proveedor */}
      <tr
        className="cursor-pointer select-none"
        style={{ background: '#e8f4ef' }}
        onClick={onToggle}
      >
        <td colSpan={6} className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            {collapsed
              ? <ChevronRight className="w-3.5 h-3.5 text-[#012d1d]" />
              : <ChevronDown className="w-3.5 h-3.5 text-[#012d1d]" />
            }
            <span className="text-[12.5px] font-bold text-[#012d1d]">{proveedor}</span>
            <span className="ml-1 text-[11px] text-[#6b8f8f]">({items.length} línea{items.length !== 1 ? 's' : ''})</span>
          </div>
        </td>
        <td className="px-2.5 py-2.5 text-right text-[12.5px] font-bold font-mono text-[#012d1d]">
          {fmt(subtotal)}
        </td>
      </tr>

      {/* Filas de detalle */}
      {!collapsed && items.map((f, i) => (
        <tr
          key={`${f.oc_id}-${f.producto_id}-${i}`}
          className={`border-b border-[#f0f5f5] hover:bg-[#f5faf8] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafcfc]'}`}
        >
          <td className="px-3 py-2 text-[12px] text-[#6b8f8f] pl-8 whitespace-nowrap">{f.fecha}</td>
          <td className="px-2.5 py-2 text-[12px] text-[#374040] font-mono whitespace-nowrap">{f.oc_numero}</td>
          <td className="px-2.5 py-2 text-[12px] overflow-hidden">
            <div className="text-[12px] text-[#1a2e2e] font-medium leading-tight truncate">{f.producto}</div>
            <div className="text-[10.5px] text-[#aebfbf] truncate">{f.producto_codigo}</div>
          </td>
          <td className="px-2.5 py-2 text-[12px] text-[#6b8f8f] truncate overflow-hidden">{f.categoria}</td>
          <td className="px-2.5 py-2 text-[12px] text-right font-mono text-[#374040] whitespace-nowrap">
            {fmt(f.cantidad)} {f.unidad}
          </td>
          <td className="px-2.5 py-2 text-[12px] text-right font-mono text-[#374040] whitespace-nowrap">
            {fmt(f.precio_unitario)}
          </td>
          <td className="px-2.5 py-2 text-[12px] text-right font-bold font-mono text-[#1a2e2e] whitespace-nowrap">
            {fmt(f.total)}
          </td>
        </tr>
      ))}
    </>
  );
}

export default function ReporteCompras() {
  const [proveedores, setProveedores] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [fechaInicio, setFechaInicio] = useState(primerDiaMes());
  const [fechaFin, setFechaFin]       = useState(hoy());
  const [proveedorId, setProveedorId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  const [data, setData]         = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');

  // Estado de colapso por proveedor
  const [colapsados, setColapsados] = useState({});

  useEffect(() => {
    Promise.allSettled([getProveedores(), getCategoriasCatalogo()]).then(([rProv, rCat]) => {
      if (rProv.status === 'fulfilled') setProveedores(toArray(rProv.value));
      if (rCat.status === 'fulfilled') setCategorias(toArray(rCat.value));
    });
  }, []);

  async function consultar() {
    setCargando(true);
    setError('');
    setData(null);
    setColapsados({});
    try {
      const resp = await getReporteCompras({
        fecha_inicio: fechaInicio,
        fecha_fin:    fechaFin,
        proveedor_id: proveedorId,
        categoria_id: categoriaId,
      });
      setData(resp);
    } catch (err) {
      setError(err.message || 'Error al generar el reporte');
    } finally {
      setCargando(false);
    }
  }

  // Agrupar filas por proveedor
  const grupos = useMemo(() => {
    if (!data?.filas) return [];
    const mapa = {};
    for (const f of data.filas) {
      if (!mapa[f.proveedor]) mapa[f.proveedor] = { proveedor: f.proveedor, items: [], subtotal: 0 };
      mapa[f.proveedor].items.push(f);
      mapa[f.proveedor].subtotal += Number(f.total);
    }
    return Object.values(mapa).sort((a, b) => a.proveedor.localeCompare(b.proveedor));
  }, [data]);

  function toggleGrupo(prov) {
    setColapsados((prev) => ({ ...prev, [prov]: !prev[prov] }));
  }

  const resumen = data?.resumen ?? {};

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #reporte-compras, #reporte-compras * { visibility: visible; }
          #reporte-compras { position: fixed; inset: 0; padding: 16px; font-size: 10px; }
          .no-print { display: none !important; }
          th, td { padding: 3px 6px !important; font-size: 10px !important; }
        }
      `}</style>

      <main id="reporte-compras" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

          <PageHeader
            title="Reporte de Compras"
            subtitle="Órdenes de compra agrupadas por proveedor con subtotales"
          >
            {data && (
              <div className="flex gap-2 no-print">
                <BtnSecondary onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </BtnSecondary>
                <BtnSecondary onClick={() => exportarCSV(grupos, resumen, fechaInicio, fechaFin)}>
                  <Download className="w-3.5 h-3.5" />
                  Exportar CSV
                </BtnSecondary>
              </div>
            )}
          </PageHeader>

          {/* Filtros */}
          <ContentCard className="mb-4 no-print">
            <div className="px-4 py-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              {/* Fecha inicio */}
              <div>
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
              <div>
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
              {/* Proveedor */}
              <div>
                <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                  Proveedor
                </label>
                <div className="relative">
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className="w-full bg-white border border-[#dde8e8] rounded-md pl-3 pr-8 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 appearance-none transition-colors"
                  >
                    <option value="">Todos</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
                </div>
              </div>
              {/* Categoría */}
              <div>
                <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                  Categoría
                </label>
                <div className="relative">
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full bg-white border border-[#dde8e8] rounded-md pl-3 pr-8 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 appearance-none transition-colors"
                  >
                    <option value="">Todas</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
                </div>
              </div>

              <BtnPrimary onClick={consultar} disabled={cargando} className="w-full">
                {cargando && <Spinner size="xs" className="text-white" />}
                Generar Reporte
              </BtnPrimary>
            </div>
          </ContentCard>

          {error && <AlertError onRetry={consultar}>{error}</AlertError>}

          {/* Estado inicial */}
          {!cargando && !data && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center no-print">
              <ShoppingCart className="w-10 h-10 text-[#c4d4d4] mb-3" strokeWidth={1.5} />
              <p className="text-[14px] font-medium text-[#6b8f8f]">Aplica los filtros para generar el reporte</p>
              <p className="text-[12px] text-[#aebfbf] mt-1">Mostrará las compras agrupadas por proveedor</p>
            </div>
          )}

          {cargando && (
            <div className="flex items-center justify-center gap-2 py-16 text-[#6b8f8f] no-print">
              <Spinner size="md" className="text-[#6b8f8f]" />
              <span className="text-[13px]">Generando reporte...</span>
            </div>
          )}

          {data && !cargando && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <KpiCard
                  icon="payments"
                  label="Total Compras"
                  value={`$${fmt(resumen.total_monto)}`}
                  sub={`${fechaInicio} al ${fechaFin}`}
                />
                <KpiCard
                  icon="receipt_long"
                  label="Órdenes de Compra"
                  value={resumen.total_ocs ?? 0}
                  sub={`${grupos.length} proveedor${grupos.length !== 1 ? 'es' : ''}`}
                />
                <KpiCard
                  icon="local_shipping"
                  label="Top Proveedor"
                  value={resumen.top_proveedor || '—'}
                  sub={resumen.top_proveedor ? `$${fmt(resumen.top_proveedor_monto)}` : ''}
                  color="text-[#012d1d]"
                />
              </div>

              {/* Tabla agrupada */}
              {grupos.length === 0 ? (
                <div className="text-center py-12 text-[13px] text-[#aebfbf]">
                  Sin compras en el período seleccionado
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#dde8e8] shadow-sm">
                  <table className="w-full border-collapse" style={{ minWidth: '780px', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '92px' }} />
                      <col style={{ width: '110px' }} />
                      <col />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '110px' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: 'linear-gradient(90deg, #012d1d 0%, #021f14 100%)' }}>
                        {['Fecha', 'N° OC', 'Producto', 'Categoría', 'Cantidad', 'Costo Unit.', 'Total'].map((h, i) => (
                          <th
                            key={h}
                            className={`px-2.5 py-2.5 text-[11px] font-semibold text-[#c8ddd8] uppercase tracking-wider whitespace-nowrap ${i >= 4 ? 'text-right' : 'text-left'}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grupos.map(({ proveedor, items, subtotal }) => (
                        <GrupoProveedor
                          key={proveedor}
                          proveedor={proveedor}
                          items={items}
                          subtotal={subtotal}
                          collapsed={!!colapsados[proveedor]}
                          onToggle={() => toggleGrupo(proveedor)}
                        />
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#012d1d' }}>
                        <td colSpan={6} className="px-2.5 py-2.5 text-[12px] font-bold text-white">
                          Total General
                        </td>
                        <td className="px-2.5 py-2.5 text-right text-[14px] font-bold font-mono text-emerald-300">
                          ${fmt(resumen.total_monto)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <p className="mt-3 text-[11px] text-[#aebfbf] text-right no-print">
                Generado el {new Date().toLocaleString('es-CO')}
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
