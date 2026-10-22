import { useState, useEffect, useMemo } from 'react';
import { Download, Printer, ChevronDown } from 'lucide-react';
import { getLotes, getReporteIndicadoresProduccion } from '../utils/apiService';
import { BtnPrimary, BtnSecondary, AlertError, PageHeader, ContentCard, Spinner } from '../ui/index.jsx';

function hoy() { return new Date().toISOString().split('T')[0]; }
function hace6meses() {
  const d = new Date(); d.setMonth(d.getMonth() - 6);
  return d.toISOString().split('T')[0];
}
function fmt(n, dec = 2) {
  return Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function toArray(r) { return Array.isArray(r) ? r : r?.results ?? r?.items ?? []; }

// ─── Exportar CSV ──────────────────────────────────────────────────────────────
function exportarCSV(lotes, resumen) {
  const BOM = '﻿'; const sep = ';';
  const headers = ['Lote','Galpón','Fecha Entrada','Estado','Aves Iniciales',
    'Mortalidad','Mort %','Kg Totales','Costo Total','Costo/kg','GDP (g/día)','Días Prod.'];
  const filas = lotes.map((l) => [
    l.numero, l.galpon, l.fecha_entrada, l.estado, l.cantidad_inicial,
    l.cantidad_mortalidad, l.mortalidad_pct, l.total_kg, l.costo_total,
    l.costo_por_kg, l.gdp_g, l.dias_produccion,
  ]);
  const csv = [headers, ...filas]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(sep))
    .join('\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `indicadores_produccion_${hoy()}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, unit, sub, warn }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm px-5 py-4 flex items-start gap-4 ${warn ? 'border-amber-200' : 'border-[#dde8e8]'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${warn ? 'bg-amber-50' : 'bg-[#f0faf5]'}`}>
        <span className={`material-symbols-outlined text-[20px] ${warn ? 'text-amber-600' : 'text-[#012d1d]'}`}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wide">{label}</p>
        <p className={`text-[22px] font-bold leading-tight font-mono ${warn ? 'text-amber-700' : 'text-[#012d1d]'}`}>
          {value}<span className="text-[13px] font-normal text-[#6b8f8f] ml-1">{unit}</span>
        </p>
        {sub && <p className="text-[11px] text-[#aebfbf] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Gráfica de barras: mortalidad por lote ────────────────────────────────────
function BarChartMortalidad({ lotes }) {
  const [hover, setHover] = useState(null);
  const W = 600; const H = 180; const PAD = { top: 16, right: 20, bottom: 40, left: 50 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  if (!lotes.length) return null;
  const maxVal = Math.max(...lotes.map((l) => Number(l.mortalidad_pct)), 1);
  const barW   = Math.min(40, (innerW / lotes.length) * 0.65);
  const gap    = innerW / lotes.length;

  function color(pct) {
    const v = Number(pct);
    if (v < 3) return '#34d399';
    if (v < 6) return '#f59e0b';
    return '#ef4444';
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].filter((p) => p <= maxVal * 1.1 + 1).map((p) => {
        const y = PAD.top + innerH - (p / (maxVal * 1.1)) * innerH;
        return (
          <g key={p}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y} y2={y} stroke="#f0f5f5" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} fontSize={9} fill="#aebfbf" textAnchor="end">{p}%</text>
          </g>
        );
      })}

      {/* Barras */}
      {lotes.map((l, i) => {
        const pct = Number(l.mortalidad_pct);
        const barH = (pct / (maxVal * 1.1)) * innerH;
        const x    = PAD.left + i * gap + gap / 2 - barW / 2;
        const y    = PAD.top + innerH - barH;
        const isH  = hover === i;
        return (
          <g key={l.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={x} y={y} width={barW} height={barH} fill={color(pct)} opacity={isH ? 1 : 0.85} rx={3} />
            {isH && (
              <g>
                <rect x={x - 20} y={y - 30} width={60} height={20} rx={4} fill="#1a2e2e" opacity={0.9} />
                <text x={x + barW / 2 - 20 + 10} y={y - 16} fontSize={10} fill="white" textAnchor="middle">
                  {pct}% · {l.cantidad_mortalidad} av.
                </text>
              </g>
            )}
            <text
              x={x + barW / 2} y={PAD.top + innerH + 14}
              fontSize={8} fill="#6b8f8f" textAnchor="middle"
              style={{ maxWidth: gap - 4 }}
            >
              {l.numero.length > 10 ? l.numero.slice(-8) : l.numero}
            </text>
          </g>
        );
      })}

      {/* Eje X */}
      <line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="#dde8e8" />
      {/* Eje Y */}
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + innerH} stroke="#dde8e8" />
    </svg>
  );
}

// ─── Gráfica de línea: costo/kg por lote (ordenado por fecha_entrada) ──────────
function LineChartCostoKg({ lotes }) {
  const [hover, setHover] = useState(null);
  const W = 600; const H = 180; const PAD = { top: 20, right: 24, bottom: 40, left: 60 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const pts = lotes.filter((l) => Number(l.costo_por_kg) > 0);
  if (pts.length < 1) return (
    <p className="text-center text-[12px] text-[#aebfbf] py-6">Sin datos de costo/kg (se requieren beneficios registrados)</p>
  );

  const vals  = pts.map((l) => Number(l.costo_por_kg));
  const minV  = Math.min(...vals);
  const maxV  = Math.max(...vals, minV + 1);
  const range = maxV - minV || 1;

  function xp(i) { return PAD.left + (i / Math.max(pts.length - 1, 1)) * innerW; }
  function yp(v) { return PAD.top + innerH - ((v - minV) / range) * innerH; }

  const polyline = pts.map((l, i) => `${xp(i)},${yp(Number(l.costo_por_kg))}`).join(' ');
  const area     = `M${xp(0)},${PAD.top + innerH} ` +
    pts.map((l, i) => `L${xp(i)},${yp(Number(l.costo_por_kg))}`).join(' ') +
    ` L${xp(pts.length - 1)},${PAD.top + innerH} Z`;

  const gridVals = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Grid */}
      {Array.from({ length: gridVals + 1 }, (_, k) => {
        const v = minV + (range / gridVals) * k;
        const y = yp(v);
        return (
          <g key={k}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y} y2={y} stroke="#f0f5f5" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} fontSize={9} fill="#aebfbf" textAnchor="end">
              ${fmt(v, 0)}
            </text>
          </g>
        );
      })}

      {/* Área */}
      <path d={area} fill="#012d1d" opacity={0.08} />
      {/* Línea */}
      <polyline points={polyline} fill="none" stroke="#012d1d" strokeWidth={2} strokeLinejoin="round" />

      {/* Puntos */}
      {pts.map((l, i) => {
        const cx = xp(i); const cy = yp(Number(l.costo_por_kg));
        const isH = hover === i;
        return (
          <g key={l.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle cx={cx} cy={cy} r={isH ? 6 : 4} fill={isH ? '#012d1d' : '#1a6640'} stroke="white" strokeWidth={1.5} />
            {isH && (
              <g>
                <rect x={cx - 40} y={cy - 36} width={80} height={24} rx={4} fill="#1a2e2e" opacity={0.9} />
                <text x={cx} y={cy - 20} fontSize={10} fill="white" textAnchor="middle">
                  {l.numero}
                </text>
                <text x={cx} y={cy - 10} fontSize={9} fill="#5eead4" textAnchor="middle">
                  ${fmt(l.costo_por_kg)}/kg
                </text>
              </g>
            )}
            <text x={cx} y={PAD.top + innerH + 14} fontSize={8} fill="#6b8f8f" textAnchor="middle">
              {l.numero.length > 10 ? l.numero.slice(-8) : l.numero}
            </text>
          </g>
        );
      })}

      <line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="#dde8e8" />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + innerH} stroke="#dde8e8" />
    </svg>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function ReporteIndicadoresProduccion() {
  const [modo, setModo]           = useState('fecha');   // 'lote' | 'fecha'
  const [lotesList, setLotesList] = useState([]);
  const [loteId, setLoteId]       = useState('');
  const [fechaInicio, setFechaInicio] = useState(hace6meses());
  const [fechaFin, setFechaFin]       = useState(hoy());

  const [data, setData]       = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    getLotes().then((r) => setLotesList(toArray(r))).catch(() => {});
  }, []);

  async function consultar() {
    setCargando(true); setError(''); setData(null);
    try {
      const params = modo === 'lote'
        ? { lote_id: loteId }
        : { fecha_inicio: fechaInicio, fecha_fin: fechaFin };
      const resp = await getReporteIndicadoresProduccion(params);
      setData(resp);
    } catch (err) {
      setError(err.message || 'Error al generar el reporte');
    } finally { setCargando(false); }
  }

  const lotes   = data?.lotes   ?? [];
  const resumen = data?.resumen ?? {};
  const puedeConsultar = modo === 'lote' ? !!loteId : true;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #rep-ind, #rep-ind * { visibility: visible; }
          #rep-ind { position: fixed; inset: 0; padding: 16px; }
          .no-print { display: none !important; }
          th, td { padding: 3px 6px !important; font-size: 10px !important; }
        }
      `}</style>

      <main id="rep-ind" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

          <PageHeader
            title="Indicadores de Producción"
            subtitle="Mortalidad, costo/kg y ganancia diaria por lote"
          >
            {data && (
              <div className="flex gap-2 no-print">
                <BtnSecondary onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </BtnSecondary>
                <BtnSecondary onClick={() => exportarCSV(lotes, resumen)}>
                  <Download className="w-3.5 h-3.5" />
                  Exportar CSV
                </BtnSecondary>
              </div>
            )}
          </PageHeader>

          {/* Filtros */}
          <ContentCard className="mb-4 no-print">
            <div className="px-4 py-3.5 space-y-3">
              {/* Toggle modo */}
              <div className="flex gap-1 bg-[#f5f8f8] rounded-lg p-1 w-fit">
                {[{ id: 'fecha', label: 'Por rango de fechas' }, { id: 'lote', label: 'Por lote' }].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => { setModo(id); setData(null); }}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                      modo === id ? 'bg-white text-[#012d1d] shadow-sm' : 'text-[#6b8f8f] hover:text-[#374040]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 items-end">
                {modo === 'lote' ? (
                  <div className="flex-1 min-w-[260px]">
                    <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                      Lote <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={loteId}
                        onChange={(e) => setLoteId(e.target.value)}
                        className="w-full bg-white border border-[#dde8e8] rounded-md pl-3 pr-8 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] appearance-none"
                      >
                        <option value="">Seleccionar lote...</option>
                        {lotesList.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.numero} — {l.galpon_nombre} ({l.estado})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-44">
                      <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">Desde (entrada)</label>
                      <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                        className="w-full bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d]" />
                    </div>
                    <div className="w-44">
                      <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">Hasta (entrada)</label>
                      <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                        className="w-full bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d]" />
                    </div>
                  </>
                )}
                <BtnPrimary onClick={consultar} disabled={!puedeConsultar || cargando} className="flex-shrink-0">
                  {cargando && <Spinner size="xs" className="text-white" />}
                  Generar
                </BtnPrimary>
              </div>
            </div>
          </ContentCard>

          {error && <AlertError onRetry={consultar}>{error}</AlertError>}

          {!cargando && !data && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center no-print">
              <span className="material-symbols-outlined text-[48px] text-[#c4d4d4] mb-3">agriculture</span>
              <p className="text-[14px] font-medium text-[#6b8f8f]">Selecciona el filtro y genera el reporte</p>
            </div>
          )}

          {cargando && (
            <div className="flex items-center justify-center gap-2 py-20 text-[#6b8f8f]">
              <Spinner size="md" className="text-[#6b8f8f]" /> <span className="text-[13px]">Calculando indicadores...</span>
            </div>
          )}

          {data && !cargando && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard
                  icon="crisis_alert"
                  label="Total Mortalidad"
                  value={fmt(resumen.total_mortalidad, 0)}
                  unit="aves"
                  sub={`de ${fmt(lotes.reduce((s, l) => s + l.cantidad_inicial, 0), 0)} iniciales`}
                  warn={Number(resumen.mortalidad_pct) >= 5}
                />
                <KpiCard
                  icon="percent"
                  label="Tasa Mortalidad"
                  value={resumen.mortalidad_pct}
                  unit="%"
                  sub={Number(resumen.mortalidad_pct) < 3 ? 'Dentro del rango normal' : 'Revisar condiciones'}
                  warn={Number(resumen.mortalidad_pct) >= 5}
                />
                <KpiCard
                  icon="scale"
                  label="Costo / kg"
                  value={`$${fmt(resumen.costo_por_kg, 0)}`}
                  unit=""
                  sub={`Total ${fmt(resumen.total_kg, 0)} kg producidos`}
                />
                <KpiCard
                  icon="trending_up"
                  label="GDP Promedio"
                  value={fmt(resumen.gdp_g, 1)}
                  unit="g/día"
                  sub="Ganancia diaria por ave"
                />
              </div>

              {/* Gráficas */}
              {lotes.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                  <div className="bg-white rounded-xl border border-[#dde8e8] shadow-sm p-4">
                    <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-3">
                      Mortalidad por lote (%)
                    </p>
                    <BarChartMortalidad lotes={lotes} />
                  </div>
                  <div className="bg-white rounded-xl border border-[#dde8e8] shadow-sm p-4">
                    <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-3">
                      Costo / kg por lote
                    </p>
                    <LineChartCostoKg lotes={lotes} />
                  </div>
                </div>
              )}

              {/* Tabla de lotes */}
              {lotes.length === 0 ? (
                <p className="text-center text-[13px] text-[#aebfbf] py-10">Sin lotes en el rango seleccionado</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#dde8e8] shadow-sm">
                  <table className="w-full border-collapse" style={{ minWidth: '900px', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '70px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '70px' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: 'linear-gradient(90deg, #012d1d 0%, #021f14 100%)' }}>
                        {['Lote','Galpón','Entrada','Estado','Aves','Mort.','Mort %','Kg Total','Costo Total','$/kg','GDP (g)'].map((h, i) => (
                          <th key={h} className={`px-2.5 py-2.5 text-[10.5px] font-semibold text-[#c8ddd8] uppercase tracking-wide whitespace-nowrap ${i >= 4 ? 'text-right' : 'text-left'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lotes.map((l, i) => {
                        const mortPct = Number(l.mortalidad_pct);
                        const mortColor = mortPct >= 8 ? 'text-red-600 font-bold' : mortPct >= 5 ? 'text-amber-600 font-semibold' : 'text-emerald-700';
                        return (
                          <tr key={l.id} className={`border-b border-[#f0f5f5] hover:bg-[#f5faf8] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafcfc]'}`}>
                            <td className="px-2.5 py-2 text-[12px] font-mono font-semibold text-[#012d1d] truncate">{l.numero}</td>
                            <td className="px-2.5 py-2 text-[12px] text-[#374040] truncate">{l.galpon}</td>
                            <td className="px-2.5 py-2 text-[12px] text-[#6b8f8f] whitespace-nowrap">{l.fecha_entrada}</td>
                            <td className="px-2.5 py-2">
                              <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded ${l.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {l.estado}
                              </span>
                            </td>
                            <td className="px-2.5 py-2 text-right text-[12px] font-mono text-[#374040]">{fmt(l.cantidad_inicial, 0)}</td>
                            <td className={`px-2.5 py-2 text-right text-[12px] font-mono ${mortColor}`}>{fmt(l.cantidad_mortalidad, 0)}</td>
                            <td className={`px-2.5 py-2 text-right text-[12px] font-mono ${mortColor}`}>{l.mortalidad_pct}%</td>
                            <td className="px-2.5 py-2 text-right text-[12px] font-mono text-[#374040]">{fmt(l.total_kg)}</td>
                            <td className="px-2.5 py-2 text-right text-[12px] font-mono text-[#374040]">${fmt(l.costo_total, 0)}</td>
                            <td className="px-2.5 py-2 text-right text-[12px] font-bold font-mono text-[#012d1d]">${fmt(l.costo_por_kg, 0)}</td>
                            <td className="px-2.5 py-2 text-right text-[12px] font-mono text-[#374040]">
                              {Number(l.gdp_g) > 0 ? fmt(l.gdp_g, 1) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#012d1d' }}>
                        <td colSpan={4} className="px-2.5 py-2.5 text-[12px] font-bold text-white">
                          Total ({lotes.length} lotes)
                        </td>
                        <td className="px-2.5 py-2.5 text-right text-[12px] font-bold font-mono text-[#c8ddd8]">
                          {fmt(lotes.reduce((s, l) => s + l.cantidad_inicial, 0), 0)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right text-[12px] font-bold font-mono text-red-300">
                          {fmt(resumen.total_mortalidad, 0)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right text-[12px] font-bold font-mono text-red-300">
                          {resumen.mortalidad_pct}%
                        </td>
                        <td className="px-2.5 py-2.5 text-right text-[12px] font-bold font-mono text-[#c8ddd8]">
                          {fmt(resumen.total_kg)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right text-[12px] font-bold font-mono text-emerald-300">
                          ${fmt(resumen.total_costo, 0)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right text-[13px] font-bold font-mono text-emerald-300">
                          ${fmt(resumen.costo_por_kg, 0)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right text-[12px] font-bold font-mono text-[#c8ddd8]">
                          {Number(resumen.gdp_g) > 0 ? `${resumen.gdp_g}g` : '—'}
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
