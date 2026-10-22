import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  PageHeader, ContentCard, CardHeader, CardTitle,
  Th, Td, THead, TBody, EmptyRow, LoadingRows,
} from '../ui/index.jsx';
import { getLotes, getLoteCostos } from '../utils/apiService';

// ─── Paleta dinámica por categoría ───────────────────────────────────────────

const PALETA = [
  { kw: ['_inicial', 'pollito', 'ave inicial'], color: '#012d1d', light: '#e8f5f0', icon: 'egg' },
  { kw: ['aliment', 'concentr', 'forraje', 'maíz', 'soya'], color: '#10b981', light: '#ecfdf5', icon: 'nutrition' },
  { kw: ['medic', 'vacu', 'vitamin', 'antibiot', 'sanid'], color: '#3b82f6', light: '#eff6ff', icon: 'vaccines' },
  { kw: ['servic', 'electric', 'agua', 'gas', 'energ', 'combustib'], color: '#8b5cf6', light: '#f5f3ff', icon: 'bolt' },
  { kw: ['mano', 'obra', 'labor', 'person', 'operar', 'trabaj'], color: '#f59e0b', light: '#fffbeb', icon: 'person' },
  { kw: ['_beneficio', 'benefic', 'faen', 'proce', 'sacrif'], color: '#0891b2', light: '#ecfeff', icon: 'cut' },
];
const ESTILO_DEFECTO = { color: '#94a3b8', light: '#f8fafc', icon: 'more_horiz' };

function getEstilo(key, label) {
  const texto = `${key} ${label}`.toLowerCase();
  for (const p of PALETA) {
    if (p.kw.some(kw => texto.includes(kw))) return p;
  }
  return ESTILO_DEFECTO;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt  = (n) => Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
const fmtN = (n) => Number(n).toLocaleString('es-CO');

function fmtCompact(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)    return `$${(n / 1_000).toFixed(1)}k`;
  return fmt(n);
}

function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

const R = 72, CX = 100, CY = 100;
const CIRC = 2 * Math.PI * R;
const SW = 24, GAP = 3;

function DonutChart({ groups, totalCost }) {
  const [hovered, setHovered] = useState(null);

  let cum = 0;
  const segs = groups.map((g) => {
    const ratio  = totalCost > 0 ? g.subtotal / totalCost : 0;
    const full   = ratio * CIRC;
    const drawn  = Math.max(0, full - GAP);
    const seg = { ...g, ratio, dasharray: `${drawn} ${CIRC - drawn}`, dashoffset: CIRC - cum };
    cum += full;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-full max-w-[210px]">
        <svg viewBox="0 0 200 200" className="w-full">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f0f5f5" strokeWidth={SW} />
          {segs.map((seg, i) => (
            <circle
              key={seg.key}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={hovered === i ? SW + 5 : SW}
              strokeLinecap="round"
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: 'stroke-width 0.15s ease', cursor: 'pointer' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <text x={CX} y={CY - 10} textAnchor="middle"
            style={{ fill: '#6b8f8f', fontSize: 10, fontWeight: 500, fontFamily: 'inherit' }}>
            {hovered !== null ? segs[hovered].label : 'Total'}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle"
            style={{ fill: '#012d1d', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }}>
            {hovered !== null ? fmtCompact(segs[hovered].subtotal) : fmtCompact(totalCost)}
          </text>
          {hovered !== null && (
            <text x={CX} y={CY + 27} textAnchor="middle"
              style={{ fill: '#aebfbf', fontSize: 10, fontFamily: 'inherit' }}>
              {(segs[hovered].ratio * 100).toFixed(1)}%
            </text>
          )}
        </svg>
      </div>
      <div className="w-full divide-y divide-[#f0f5f5]">
        {segs.map((seg, i) => (
          <div
            key={seg.key}
            className={`flex items-center gap-2.5 px-2 py-2.5 rounded-lg cursor-default transition-colors ${hovered === i ? 'bg-[#f5f8f8]' : ''}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="flex-1 text-[12px] text-[#374040] leading-none">{seg.label}</span>
            <span className="text-[11px] font-semibold text-[#1a2e2e]">
              {(seg.ratio * 100).toFixed(1)}%
            </span>
            <span className="text-[11px] text-[#6b8f8f] font-mono w-[5.5rem] text-right">
              {fmt(seg.subtotal)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, sub, accent }) {
  return (
    <div className="bg-white border border-[#e4ecec] rounded-xl p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
        <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-widest leading-none mb-1.5">
          {label}
        </p>
        <p className="text-[18px] font-bold text-[#1a2e2e] leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-[#aebfbf] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CostoPorLote() {
  const [lotes,    setLotes]    = useState([]);
  const [loteId,   setLoteId]   = useState(null);
  const [datos,    setDatos]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar lista de lotes al montar
  useEffect(() => {
    getLotes()
      .then(r => {
        const list = r.items ?? [];
        setLotes(list);
        if (list.length > 0) setLoteId(String(list[0].id));
      })
      .catch(() => setErrorMsg('No se pudo cargar la lista de lotes.'));
  }, []);

  // Cargar desglose de costos cuando cambia el lote seleccionado
  useEffect(() => {
    if (!loteId) return;
    setLoading(true);
    setErrorMsg('');
    getLoteCostos(loteId)
      .then(r => setDatos(r))
      .catch(e => setErrorMsg(e.message || 'Error al cargar los costos del lote.'))
      .finally(() => setLoading(false));
  }, [loteId]);

  // Construir grupos para la tabla y el donut
  const groups = useMemo(() => {
    if (!datos) return [];
    return datos.categorias
      .map(cat => {
        const estilo = getEstilo(cat.key, cat.label);
        return {
          ...estilo,
          key:      cat.key,
          label:    cat.label,
          subtotal: Number(cat.subtotal),
          items: cat.items.map(i => ({
            item:      i.item,
            cantidad:  Number(i.cantidad),
            unidad:    i.unidad,
            costoUnit: Number(i.costo_unit),
            total:     Number(i.total),
          })),
        };
      })
      .filter(g => g.subtotal > 0);
  }, [datos]);

  const totalCost    = groups.reduce((s, g) => s + g.subtotal, 0);
  const totalItems   = groups.reduce((s, g) => s + g.items.length, 0);
  const loteActual   = lotes.find(l => String(l.id) === loteId);
  const esActivo     = datos?.estado === 'ACTIVO';

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

        {/* Page header */}
        <PageHeader
          title="Costo por Lote"
          subtitle="Desglose detallado de costos agrupados por categoría"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={loteId ?? ''}
              onChange={e => setLoteId(e.target.value)}
              disabled={lotes.length === 0}
              className="text-[13px] font-medium text-[#1a2e2e] bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors disabled:opacity-50"
            >
              {lotes.length === 0 && <option value="">Sin lotes</option>}
              {lotes.map(l => (
                <option key={l.id} value={String(l.id)}>
                  Lote {l.numero} · {l.galpon_nombre}{l.estado === 'ACTIVO' ? ' ● Activo' : ''}
                </option>
              ))}
            </select>
            {datos && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                esActivo
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : datos.estado === 'CERRADO'
                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                    : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {esActivo && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                {datos.estado_label}
              </span>
            )}
          </div>
        </PageHeader>

        {errorMsg && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Summary cards */}
        {datos && !loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <SummaryCard
              icon="group"    label="Aves iniciales"
              value={fmtN(datos.cantidad_inicial)}
              sub={`Ingreso: ${fmtFecha(datos.fecha_entrada)}`}
              accent="bg-[#012d1d]"
            />
            <SummaryCard
              icon="schedule" label="Días de producción"
              value={`${datos.dias_activo} días`}
              sub={esActivo ? 'Lote en curso' : `${datos.mortalidad_pct}% mortalidad`}
              accent="bg-blue-600"
            />
            <SummaryCard
              icon="payments" label="Costo Total"
              value={fmt(datos.costo_total)}
              sub={`${totalItems} ítem${totalItems !== 1 ? 's' : ''} · ${groups.length} categoría${groups.length !== 1 ? 's' : ''}`}
              accent="bg-amber-500"
            />
            <SummaryCard
              icon="egg"      label="Costo por Ave"
              value={fmt(datos.costo_por_ave_inicial)}
              sub={datos.cantidad_actual > 0 ? `Actuales: ${fmt(datos.costo_por_ave_actual)}/ave` : 'Lote cerrado'}
              accent="bg-violet-600"
            />
          </div>
        )}

        {/* Table + Chart */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">

          {/* Tabla de desglose */}
          <div className="xl:col-span-2">
            <ContentCard>
              <CardHeader>
                <CardTitle>Desglose de Costos</CardTitle>
                <span className="text-[12px] text-[#6b8f8f]">
                  {loading ? 'Cargando…' : datos ? `${totalItems} ítem${totalItems !== 1 ? 's' : ''} registrados` : '—'}
                </span>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <THead>
                    <Th>Artículo</Th>
                    <Th center>Cantidad</Th>
                    <Th right>Costo Unit.</Th>
                    <Th right>Total</Th>
                  </THead>
                  <TBody>
                    {loading ? (
                      <LoadingRows cols={4} />
                    ) : groups.length === 0 ? (
                      <EmptyRow cols={4} title="Sin costos registrados para este lote" />
                    ) : (
                      <>
                        {groups.map(g => (
                          <Fragment key={g.key}>
                            {/* Fila de categoría */}
                            <tr style={{ background: g.light }}>
                              <td colSpan={4} className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />
                                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: g.color }}>
                                    {g.label}
                                  </span>
                                  <span className="ml-auto text-[12px] font-semibold text-[#1a2e2e]">
                                    {fmt(g.subtotal)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {/* Filas de ítems */}
                            {g.items.map((item, j) => (
                              <tr key={j} className="hover:bg-[#fafcfc] transition-colors">
                                <Td>
                                  <span className="flex items-center gap-2 pl-5">
                                    <span className="material-symbols-outlined text-[15px] flex-shrink-0"
                                      style={{ color: g.color, opacity: 0.7 }}>
                                      {g.icon}
                                    </span>
                                    {item.item}
                                  </span>
                                </Td>
                                <Td center muted>
                                  {fmtN(item.cantidad)} {item.unidad}
                                </Td>
                                <Td right mono>{fmt(item.costoUnit)}</Td>
                                <Td right mono>{fmt(item.total)}</Td>
                              </tr>
                            ))}
                          </Fragment>
                        ))}

                        {/* Total general */}
                        <tr className="bg-[#f5f8f8] border-t-2 border-[#dde8e8]">
                          <td colSpan={3} className="px-4 py-3 text-[13px] font-semibold text-[#374040]">
                            Total General
                          </td>
                          <td className="px-4 py-3 text-right text-[14px] font-bold text-[#012d1d] font-mono">
                            {fmt(totalCost)}
                          </td>
                        </tr>
                      </>
                    )}
                  </TBody>
                </table>
              </div>
            </ContentCard>
          </div>

          {/* Donut chart */}
          <div>
            <ContentCard>
              <CardHeader>
                <CardTitle>Distribución por Categoría</CardTitle>
              </CardHeader>
              <div className="p-5">
                {loading ? (
                  <div className="flex items-center justify-center h-40 text-[13px] text-[#6b8f8f]">
                    Cargando…
                  </div>
                ) : groups.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-[13px] text-[#aebfbf]">
                    Sin datos
                  </div>
                ) : (
                  <DonutChart groups={groups} totalCost={totalCost} />
                )}
              </div>
            </ContentCard>
          </div>

        </div>
      </div>
    </main>
  );
}
