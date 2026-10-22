import { useState, useEffect, useCallback } from 'react';
import {
  PageHeader, ContentCard, CardHeader, CardTitle,
  BtnPrimary, BtnSecondary, Th, Td, THead, TBody,
} from '../ui/index.jsx';
import { getLotes, getRentabilidad } from '../utils/apiService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtCompact(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`;
  return fmt(v);
}

const fmtPct = (n) => `${Number(n || 0).toFixed(2)}%`;

function exportarCSV(datos) {
  if (!datos?.periodos?.length) return;

  const allCats = [];
  datos.periodos.forEach((p) => {
    p.costos_detalle.forEach((d) => {
      if (!allCats.includes(d.categoria)) allCats.push(d.categoria);
    });
  });

  const header = ['Período', 'Ingresos', ...allCats, 'Costo Total', 'Utilidad Bruta', 'Margen %'];
  const rows = datos.periodos.map((p) => {
    const catMap = Object.fromEntries(p.costos_detalle.map((d) => [d.categoria, d.monto]));
    return [
      p.label,
      p.ingresos,
      ...allCats.map((c) => catMap[c] ?? '0.00'),
      p.costos_total,
      p.utilidad_bruta,
      p.margen_pct + '%',
    ];
  });
  const totals = datos.totales;
  rows.push([
    'TOTAL',
    totals.ingresos,
    ...allCats.map(() => ''),
    totals.costos_total,
    totals.utilidad_bruta,
    totals.margen_pct + '%',
  ]);

  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${v}"`).join(','))
    .join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `rentabilidad_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, accent, negative }) {
  return (
    <div className="bg-white border border-[#e4ecec] rounded-xl p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
        <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-widest leading-none mb-1.5">
          {label}
        </p>
        <p className={`text-[18px] font-bold leading-tight ${negative ? 'text-red-600' : 'text-[#1a2e2e]'}`}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-[#aebfbf] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ periodos }) {
  const [hovered, setHovered] = useState(null);

  const LP = 72, RP = 16, TP = 12, BP = 52;
  const PLOT_H  = 170;
  const BAR_W   = 18, BAR_GAP = 5, GROUP_MARGIN = 28;
  const GROUP_W = BAR_W * 2 + BAR_GAP + GROUP_MARGIN;
  const PLOT_W  = Math.max(380, periodos.length * GROUP_W + GROUP_MARGIN);
  const VB_W    = LP + PLOT_W + RP;
  const VB_H    = TP + PLOT_H + BP;

  const maxVal = Math.max(
    ...periodos.flatMap((p) => [parseFloat(p.ingresos), parseFloat(p.costos_total)]),
    1,
  );

  const TICKS = 5;
  const yPos  = (v) => TP + PLOT_H - (v / maxVal) * PLOT_H;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={{ minWidth: VB_W, width: '100%', maxHeight: 260 }}
        preserveAspectRatio="xMinYMid meet"
      >
        {/* Grid lines + Y labels */}
        {Array.from({ length: TICKS + 1 }, (_, i) => {
          const frac = i / TICKS;
          const y    = TP + PLOT_H - frac * PLOT_H;
          return (
            <g key={i}>
              <line x1={LP} y1={y} x2={LP + PLOT_W} y2={y} stroke="#eef3f3" strokeWidth={0.8} />
              <text x={LP - 5} y={y + 3.5} textAnchor="end" fontSize={8} fill="#9ab0b0">
                {fmtCompact(frac * maxVal)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {periodos.map((p, i) => {
          const gx   = LP + GROUP_MARGIN / 2 + i * GROUP_W;
          const ingH = Math.max(0, (parseFloat(p.ingresos)    / maxVal) * PLOT_H);
          const cosH = Math.max(0, (parseFloat(p.costos_total) / maxVal) * PLOT_H);
          const cidIng  = `${i}-ing`;
          const cidCost = `${i}-cost`;

          return (
            <g key={i}>
              {/* Ingresos bar */}
              <rect
                x={gx}
                y={yPos(parseFloat(p.ingresos))}
                width={BAR_W}
                height={ingH}
                fill={hovered === cidIng ? '#059669' : '#10b981'}
                rx={2}
                style={{ cursor: 'pointer', transition: 'fill 0.12s' }}
                onMouseEnter={() => setHovered(cidIng)}
                onMouseLeave={() => setHovered(null)}
              />
              {/* Costo bar */}
              <rect
                x={gx + BAR_W + BAR_GAP}
                y={yPos(parseFloat(p.costos_total))}
                width={BAR_W}
                height={cosH}
                fill={hovered === cidCost ? '#d97706' : '#f59e0b'}
                rx={2}
                style={{ cursor: 'pointer', transition: 'fill 0.12s' }}
                onMouseEnter={() => setHovered(cidCost)}
                onMouseLeave={() => setHovered(null)}
              />

              {/* Tooltip on hover */}
              {hovered === cidIng && (
                <g>
                  <rect x={gx - 2} y={yPos(parseFloat(p.ingresos)) - 22} width={64} height={18} rx={3} fill="#012d1d" />
                  <text x={gx + 30} y={yPos(parseFloat(p.ingresos)) - 9} textAnchor="middle" fontSize={8} fill="#fff">
                    {fmtCompact(p.ingresos)}
                  </text>
                </g>
              )}
              {hovered === cidCost && (
                <g>
                  <rect x={gx + BAR_W + BAR_GAP - 2} y={yPos(parseFloat(p.costos_total)) - 22} width={64} height={18} rx={3} fill="#92400e" />
                  <text x={gx + BAR_W + BAR_GAP + 30} y={yPos(parseFloat(p.costos_total)) - 9} textAnchor="middle" fontSize={8} fill="#fff">
                    {fmtCompact(p.costos_total)}
                  </text>
                </g>
              )}

              {/* X label */}
              <text
                x={gx + BAR_W + BAR_GAP / 2}
                y={TP + PLOT_H + 14}
                textAnchor="middle"
                fontSize={8}
                fill="#6b8f8f"
              >
                {p.label.length > 12 ? p.label.slice(0, 11) + '…' : p.label}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={LP} y1={TP} x2={LP} y2={TP + PLOT_H} stroke="#dde8e8" strokeWidth={0.8} />
        <line x1={LP} y1={TP + PLOT_H} x2={LP + PLOT_W} y2={TP + PLOT_H} stroke="#dde8e8" strokeWidth={0.8} />

        {/* Legend */}
        <g transform={`translate(${LP}, ${TP + PLOT_H + 28})`}>
          <rect x={0}  y={0} width={10} height={10} rx={2} fill="#10b981" />
          <text x={14} y={8} fontSize={8} fill="#374040">Ingresos</text>
          <rect x={70} y={0} width={10} height={10} rx={2} fill="#f59e0b" />
          <text x={84} y={8} fontSize={8} fill="#374040">Costos</text>
        </g>
      </svg>
    </div>
  );
}

// ─── Cost Breakdown Donut ─────────────────────────────────────────────────────

const CAT_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#94a3b8',
];

const R = 68, CX = 96, CY = 96, CIRC = 2 * Math.PI * R, SW = 22, GAP = 2.5;

function Donut({ detalle }) {
  const [hov, setHov] = useState(null);
  const total = detalle.reduce((s, d) => s + parseFloat(d.monto), 0);

  let cum = 0;
  const segs = detalle.map((d, i) => {
    const ratio  = total > 0 ? parseFloat(d.monto) / total : 0;
    const full   = ratio * CIRC;
    const drawn  = Math.max(0, full - GAP);
    const seg    = { ...d, ratio, color: CAT_COLORS[i % CAT_COLORS.length], dasharray: `${drawn} ${CIRC - drawn}`, dashoffset: CIRC - cum };
    cum += full;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-[200px]">
        <svg viewBox="0 0 192 192" className="w-full">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f0f5f5" strokeWidth={SW} />
          {segs.map((s, i) => (
            <circle
              key={i} cx={CX} cy={CY} r={R} fill="none"
              stroke={s.color}
              strokeWidth={hov === i ? SW + 5 : SW}
              strokeLinecap="round"
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: 'stroke-width 0.13s', cursor: 'pointer' }}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            />
          ))}
          <text x={CX} y={CY - 8} textAnchor="middle" style={{ fill: '#6b8f8f', fontSize: 9, fontFamily: 'inherit' }}>
            {hov !== null ? segs[hov].categoria.slice(0, 12) : 'Total costos'}
          </text>
          <text x={CX} y={CY + 11} textAnchor="middle" style={{ fill: '#012d1d', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}>
            {hov !== null ? fmtCompact(segs[hov]?.monto) : fmtCompact(total)}
          </text>
          {hov !== null && (
            <text x={CX} y={CY + 25} textAnchor="middle" style={{ fill: '#aebfbf', fontSize: 9, fontFamily: 'inherit' }}>
              {(segs[hov].ratio * 100).toFixed(1)}%
            </text>
          )}
        </svg>
      </div>
      <div className="w-full divide-y divide-[#f0f5f5]">
        {segs.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 px-1 py-2 rounded cursor-default transition-colors ${hov === i ? 'bg-[#f5f8f8]' : ''}`}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="flex-1 text-[11px] text-[#374040] leading-tight truncate">{s.categoria}</span>
            <span className="text-[10px] text-[#6b8f8f] ml-1">{fmtPct(s.pct)}</span>
            <span className="text-[11px] font-mono font-semibold text-[#1a2e2e] w-[5rem] text-right">{fmt(s.monto)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty / Loading states ───────────────────────────────────────────────────

function EmptyState({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="material-symbols-outlined text-[40px] text-[#c8d8d8]">{icon}</span>
      <p className="text-[14px] font-semibold text-[#374040]">{title}</p>
      {sub && <p className="text-[12px] text-[#9ab0b0] text-center max-w-xs">{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RentabilidadLote() {
  const [modo,        setModo]        = useState('lote');
  const [lotes,       setLotes]       = useState([]);
  const [loteId,      setLoteId]      = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin,    setFechaFin]    = useState('');
  const [agruparPor,  setAgruparPor]  = useState('lote');
  const [datos,       setDatos]       = useState(null);
  const [cargando,    setCargando]    = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    getLotes().then((resp) => {
      const lista = resp?.items ?? resp ?? [];
      setLotes(lista);
      if (lista.length > 0) setLoteId(String(lista[0].id));
    }).catch(() => {});
  }, []);

  const consultar = useCallback(async () => {
    if (modo === 'lote' && !loteId) return;
    if (modo === 'periodo' && (!fechaInicio || !fechaFin)) return;

    setCargando(true);
    setError('');
    try {
      const params = modo === 'lote'
        ? { lote_id: loteId }
        : { fecha_inicio: fechaInicio, fecha_fin: fechaFin, agrupar_por: agruparPor };
      setDatos(await getRentabilidad(params));
    } catch (e) {
      setError(e.message || 'Error al cargar datos de rentabilidad.');
    } finally {
      setCargando(false);
    }
  }, [modo, loteId, fechaInicio, fechaFin, agruparPor]);

  useEffect(() => {
    if (modo === 'lote' && loteId) consultar();
  }, [loteId, modo]); // eslint-disable-line react-hooks/exhaustive-deps

  const tots = datos?.totales;
  const periodos = datos?.periodos ?? [];

  // Collect all unique cost categories for the summary table
  const allCats = [];
  periodos.forEach((p) => {
    p.costos_detalle.forEach((d) => {
      if (!allCats.includes(d.categoria)) allCats.push(d.categoria);
    });
  });

  const utilidadNeg = tots && parseFloat(tots.utilidad_bruta) < 0;

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

        {/* Header */}
        <PageHeader
          title="Rentabilidad por Lote / Período"
          subtitle="Análisis de ingresos, costos y utilidad bruta por lote de producción o período"
        >
          <BtnSecondary
            onClick={() => exportarCSV(datos)}
            disabled={!datos || cargando}
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Exportar CSV / Excel
          </BtnSecondary>
        </PageHeader>

        {/* ── Filters ── */}
        <ContentCard className="mb-5">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <div className="px-5 pb-5 flex flex-wrap gap-4 items-end">

            {/* Mode toggle */}
            <div>
              <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider mb-1.5">Modo</p>
              <div className="flex rounded-md border border-[#dde8e8] overflow-hidden">
                {[['lote', 'Por Lote'], ['periodo', 'Por Período']].map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { setModo(val); setDatos(null); }}
                    className={`px-4 py-[7px] text-[12px] font-semibold transition-colors ${
                      modo === val
                        ? 'bg-[#012d1d] text-white'
                        : 'bg-white text-[#4a6060] hover:bg-[#f0f5f5]'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Lote selector */}
            {modo === 'lote' && (
              <div>
                <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider mb-1.5">Lote</p>
                <select
                  value={loteId}
                  onChange={(e) => setLoteId(e.target.value)}
                  className="text-[13px] text-[#1a2e2e] bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 min-w-[200px]"
                >
                  {lotes.map((l) => (
                    <option key={l.id} value={l.id}>
                      Lote {l.numero} · {l.galpon_nombre ?? l.galpon ?? ''}{l.estado === 'ACTIVO' ? ' ● Activo' : ''}
                    </option>
                  ))}
                  {lotes.length === 0 && <option value="">Sin lotes</option>}
                </select>
              </div>
            )}

            {/* Date range */}
            {modo === 'periodo' && (
              <>
                <div>
                  <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider mb-1.5">Desde</p>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="text-[13px] text-[#1a2e2e] bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider mb-1.5">Hasta</p>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="text-[13px] text-[#1a2e2e] bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider mb-1.5">Agrupar por</p>
                  <select
                    value={agruparPor}
                    onChange={(e) => setAgruparPor(e.target.value)}
                    className="text-[13px] text-[#1a2e2e] bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] focus:outline-none focus:border-[#012d1d]"
                  >
                    <option value="lote">Lote</option>
                    <option value="mes">Mes</option>
                  </select>
                </div>
                <BtnPrimary onClick={consultar} loading={cargando}>
                  <span className="material-symbols-outlined text-[16px]">search</span>
                  Consultar
                </BtnPrimary>
              </>
            )}
          </div>
        </ContentCard>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        {/* Loading */}
        {cargando && (
          <div className="flex items-center justify-center py-20 gap-3 text-[#6b8f8f]">
            <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
            <span className="text-[14px]">Calculando rentabilidad…</span>
          </div>
        )}

        {/* Empty */}
        {!cargando && !datos && !error && (
          <EmptyState
            icon="query_stats"
            title="Selecciona un lote o rango de fechas"
            sub="Elige un lote en el selector de arriba o define un período para ver el análisis de rentabilidad."
          />
        )}

        {/* No periods */}
        {!cargando && datos && periodos.length === 0 && (
          <EmptyState
            icon="bar_chart"
            title="Sin datos para este filtro"
            sub="No hay costos ni ingresos registrados en el período seleccionado."
          />
        )}

        {/* ── Data ── */}
        {!cargando && datos && periodos.length > 0 && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <KpiCard
                icon="trending_up" label="Ingresos Totales"
                value={fmt(tots.ingresos)}
                sub={`${periodos.length} período${periodos.length > 1 ? 's' : ''}`}
                accent="bg-emerald-600"
              />
              <KpiCard
                icon="payments" label="Costo Total"
                value={fmt(tots.costos_total)}
                sub={`${allCats.length} categoría${allCats.length !== 1 ? 's' : ''}`}
                accent="bg-amber-500"
              />
              <KpiCard
                icon="account_balance" label="Utilidad Bruta"
                value={fmt(tots.utilidad_bruta)}
                sub={utilidadNeg ? 'Resultado negativo' : 'Resultado positivo'}
                accent={utilidadNeg ? 'bg-red-500' : 'bg-[#012d1d]'}
                negative={utilidadNeg}
              />
              <KpiCard
                icon="percent" label="Margen Bruto"
                value={fmtPct(tots.margen_pct)}
                sub="Sobre ingresos totales"
                accent={parseFloat(tots.margen_pct) < 0 ? 'bg-red-500' : 'bg-violet-600'}
                negative={parseFloat(tots.margen_pct) < 0}
              />
            </div>

            {/* Summary table + Donut */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5 items-start">

              {/* ── Summary table ── */}
              <div className="xl:col-span-2">
                <ContentCard>
                  <CardHeader>
                    <CardTitle>Resumen por Período</CardTitle>
                    <span className="text-[12px] text-[#6b8f8f]">{periodos.length} período{periodos.length > 1 ? 's' : ''}</span>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <THead>
                        <Th>Período</Th>
                        <Th right>Ingresos</Th>
                        {allCats.map((c) => (
                          <Th key={c} right>{c}</Th>
                        ))}
                        <Th right>Costo Total</Th>
                        <Th right>Utilidad</Th>
                        <Th center>Margen</Th>
                      </THead>
                      <TBody>
                        {periodos.map((p, i) => {
                          const catMap = Object.fromEntries(p.costos_detalle.map((d) => [d.categoria, d.monto]));
                          const util   = parseFloat(p.utilidad_bruta);
                          return (
                            <tr key={i} className="hover:bg-[#fafcfc] transition-colors">
                              <Td>
                                <div className="font-semibold text-[#1a2e2e]">{p.label}</div>
                                {p.galpon && (
                                  <div className="text-[11px] text-[#9ab0b0]">{p.galpon}</div>
                                )}
                              </Td>
                              <Td right mono>{fmt(p.ingresos)}</Td>
                              {allCats.map((c) => (
                                <Td key={c} right mono muted>{fmt(catMap[c] ?? 0)}</Td>
                              ))}
                              <Td right mono>{fmt(p.costos_total)}</Td>
                              <Td right mono>
                                <span className={util < 0 ? 'text-red-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                                  {fmt(p.utilidad_bruta)}
                                </span>
                              </Td>
                              <Td center>
                                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                  parseFloat(p.margen_pct) < 0
                                    ? 'bg-red-50 text-red-700'
                                    : parseFloat(p.margen_pct) < 10
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {fmtPct(p.margen_pct)}
                                </span>
                              </Td>
                            </tr>
                          );
                        })}

                        {/* Totals row */}
                        <tr className="bg-[#f0f5f5] border-t-2 border-[#dde8e8] font-semibold">
                          <td className="px-4 py-3 text-[13px] text-[#374040]">Total General</td>
                          <td className="px-4 py-3 text-right text-[13px] font-bold text-[#1a2e2e] font-mono">{fmt(tots.ingresos)}</td>
                          {allCats.map((c) => (
                            <td key={c} className="px-4 py-3 text-right text-[12px] text-[#6b8f8f] font-mono">—</td>
                          ))}
                          <td className="px-4 py-3 text-right text-[13px] font-bold text-[#1a2e2e] font-mono">{fmt(tots.costos_total)}</td>
                          <td className="px-4 py-3 text-right text-[13px] font-bold font-mono">
                            <span className={parseFloat(tots.utilidad_bruta) < 0 ? 'text-red-600' : 'text-emerald-700'}>
                              {fmt(tots.utilidad_bruta)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[12px] font-bold ${
                              parseFloat(tots.margen_pct) < 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {fmtPct(tots.margen_pct)}
                            </span>
                          </td>
                        </tr>
                      </TBody>
                    </table>
                  </div>
                </ContentCard>
              </div>

              {/* ── Donut: cost breakdown of first / selected period ── */}
              <div>
                <ContentCard>
                  <CardHeader>
                    <CardTitle>Distribución de Costos</CardTitle>
                    <span className="text-[11px] text-[#6b8f8f]">
                      {periodos.length === 1 ? periodos[0].label : 'Primer período'}
                    </span>
                  </CardHeader>
                  <div className="p-4">
                    {periodos[0]?.costos_detalle?.length > 0 ? (
                      <Donut detalle={periodos[0].costos_detalle} />
                    ) : (
                      <EmptyState icon="donut_small" title="Sin desglose" sub="" />
                    )}
                  </div>
                </ContentCard>
              </div>
            </div>

            {/* ── Bar chart ── */}
            <ContentCard>
              <CardHeader>
                <CardTitle>Ingresos vs Costos</CardTitle>
                <span className="text-[12px] text-[#6b8f8f]">Comparativo por período</span>
              </CardHeader>
              <div className="p-5">
                <BarChart periodos={periodos} />
              </div>
            </ContentCard>
          </>
        )}
      </div>
    </main>
  );
}
