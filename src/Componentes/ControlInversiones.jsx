import { useState, useEffect, useCallback } from 'react';
import { PageHeader, ContentCard, CardHeader, CardTitle } from '../ui/index.jsx';
import {
  getExistencias, getCuentasPagar, getCuentasCobrar,
  getLotes, getRentabilidad,
} from '../utils/apiService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function sixMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

const fmt = (n) =>
  `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function fmtCompact(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

function diasVencidos(fechaVenc) {
  if (!fechaVenc) return 0;
  const diff = new Date(TODAY) - new Date(fechaVenc);
  return Math.max(0, Math.floor(diff / 86_400_000));
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, subAlert, accent, loading }) {
  return (
    <div className="bg-white border border-[#e4ecec] rounded-xl p-4 flex items-start gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        <span className="material-symbols-outlined text-[22px] text-white">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-widest leading-none mb-1.5">
          {label}
        </p>
        {loading ? (
          <div className="h-6 w-24 bg-[#eef3f3] rounded animate-pulse" />
        ) : (
          <p className="text-[20px] font-bold text-[#1a2e2e] leading-tight">{value}</p>
        )}
        {sub && (
          <p className={`text-[11px] mt-0.5 ${subAlert ? 'text-red-500 font-medium' : 'text-[#aebfbf]'}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Line Chart (SVG) ────────────────────────────────────────────────────────

function LineChart({ periodos, loading }) {
  const LP = 44, RP = 10, TP = 12, BP = 32;
  const PLOT_H = 120, PLOT_W = 260;
  const VB_W = LP + PLOT_W + RP, VB_H = TP + PLOT_H + BP;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <span className="material-symbols-outlined text-[28px] text-[#c8d8d8] animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!periodos || periodos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-[#c8d8d8]">
        <span className="material-symbols-outlined text-[32px]">show_chart</span>
        <span className="text-[12px]">Sin datos en los últimos 6 meses</span>
      </div>
    );
  }

  const maxVal = Math.max(
    ...periodos.flatMap((p) => [parseFloat(p.ingresos), parseFloat(p.costos_total)]),
    1,
  );

  const xStep  = PLOT_W / Math.max(periodos.length - 1, 1);
  const yScale = (v) => TP + PLOT_H - (parseFloat(v) / maxVal) * PLOT_H;
  const xPos   = (i) => LP + (periodos.length === 1 ? PLOT_W / 2 : i * xStep);

  const ptIng  = periodos.map((p, i) => `${xPos(i)},${yScale(p.ingresos)}`).join(' ');
  const ptCost = periodos.map((p, i) => `${xPos(i)},${yScale(p.costos_total)}`).join(' ');

  const TICKS = 4;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: TICKS + 1 }, (_, i) => {
        const frac = i / TICKS;
        const y    = TP + PLOT_H * (1 - frac);
        return (
          <g key={i}>
            <line x1={LP} y1={y} x2={LP + PLOT_W} y2={y} stroke="#eef3f3" strokeWidth={0.7} />
            <text x={LP - 4} y={y + 3} textAnchor="end" fontSize={7} fill="#9ab0b0">
              {fmtCompact(frac * maxVal)}
            </text>
          </g>
        );
      })}

      {/* Area fills */}
      <polygon
        points={`${xPos(0)},${TP + PLOT_H} ${ptIng} ${xPos(periodos.length - 1)},${TP + PLOT_H}`}
        fill="#10b981" fillOpacity={0.07}
      />
      <polygon
        points={`${xPos(0)},${TP + PLOT_H} ${ptCost} ${xPos(periodos.length - 1)},${TP + PLOT_H}`}
        fill="#f59e0b" fillOpacity={0.07}
      />

      <polyline points={ptIng}  fill="none" stroke="#10b981" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={ptCost} fill="none" stroke="#f59e0b" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />

      {periodos.map((p, i) => (
        <g key={i}>
          <circle cx={xPos(i)} cy={yScale(p.ingresos)}     r={2.8} fill="#10b981" />
          <circle cx={xPos(i)} cy={yScale(p.costos_total)} r={2.8} fill="#f59e0b" />
        </g>
      ))}

      {periodos.map((p, i) => (
        <text key={i} x={xPos(i)} y={TP + PLOT_H + 14} textAnchor="middle" fontSize={7} fill="#9ab0b0">
          {p.label}
        </text>
      ))}

      <line x1={LP} y1={TP} x2={LP} y2={TP + PLOT_H} stroke="#dde8e8" strokeWidth={0.7} />
      <line x1={LP} y1={TP + PLOT_H} x2={LP + PLOT_W} y2={TP + PLOT_H} stroke="#dde8e8" strokeWidth={0.7} />

      <g transform={`translate(${LP}, ${TP + PLOT_H + 24})`}>
        <rect x={0}  y={-5} width={8} height={8} rx={1.5} fill="#10b981" />
        <text x={11} y={2}  fontSize={7} fill="#6b8f8f">Ingresos</text>
        <rect x={60} y={-5} width={8} height={8} rx={1.5} fill="#f59e0b" />
        <text x={71} y={2}  fontSize={7} fill="#6b8f8f">Costos</text>
      </g>
    </svg>
  );
}

// ─── Mortality Bar Chart ──────────────────────────────────────────────────────

function MortalityChart({ lotes, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <span className="material-symbols-outlined text-[28px] text-[#c8d8d8] animate-spin">progress_activity</span>
      </div>
    );
  }

  const data = (lotes || [])
    .filter((l) => l.cantidad_inicial > 0)
    .map((l) => ({
      label:  `L-${l.numero}`,
      estado: l.estado,
      pct:    Math.min(100, (l.cantidad_mortalidad / l.cantidad_inicial) * 100),
    }))
    .slice(0, 8);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-[#c8d8d8]">
        <span className="material-symbols-outlined text-[32px]">bar_chart</span>
        <span className="text-[12px]">Sin lotes registrados</span>
      </div>
    );
  }

  const maxPct = Math.max(...data.map((d) => d.pct), 5);
  const ROW_H = 22, LP = 54, TRACK_W = 170, RP = 38;
  const VB_W  = LP + TRACK_W + RP;
  const VB_H  = data.length * ROW_H + 8;

  const barColor = (pct) =>
    pct > 7 ? '#ef4444' : pct > 3 ? '#f59e0b' : '#10b981';

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const y    = 4 + i * ROW_H;
        const barW = Math.max(2, (d.pct / maxPct) * TRACK_W);
        const col  = barColor(d.pct);
        return (
          <g key={i}>
            <rect x={LP} y={y + 4} width={TRACK_W} height={12} rx={3} fill="#f0f5f5" />
            <rect x={LP} y={y + 4} width={barW}     height={12} rx={3} fill={col} fillOpacity={0.85} />
            {d.estado === 'ACTIVO' && (
              <circle cx={LP - 14} cy={y + 10} r={3} fill="#10b981" />
            )}
            <text x={LP - 18} y={y + 13} textAnchor="end" fontSize={8} fill="#374040" fontWeight={500}>
              {d.label}
            </text>
            <text x={LP + barW + 5} y={y + 13} fontSize={8} fill={col} fontWeight={600}>
              {d.pct.toFixed(1)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Alerts Panel ─────────────────────────────────────────────────────────────

function AlertRow({ icon, iconColor, title, sub, badge, badgeColor }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-[#f4f8f8] last:border-0">
      <span className={`material-symbols-outlined text-[15px] flex-shrink-0 mt-0.5 ${iconColor}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[#1a2e2e] leading-tight truncate">{title}</p>
        {sub && <p className="text-[10px] text-[#9ab0b0] mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

function SectionHead({ icon, iconColor, label, count }) {
  return (
    <div className="flex items-center gap-1.5 pt-2 pb-1 first:pt-0">
      <span className={`material-symbols-outlined text-[13px] ${iconColor}`}>{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b8f8f]">{label}</span>
      {count > 0 && (
        <span className="ml-auto text-[10px] font-bold text-white bg-red-500 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );
}

function AlertsPanel({ stockAlerts, cpVencidas, ccVencidas, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <span className="material-symbols-outlined text-[28px] text-[#c8d8d8] animate-spin">progress_activity</span>
      </div>
    );
  }

  const total = stockAlerts.length + cpVencidas.length + ccVencidas.length;
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <span className="material-symbols-outlined text-[36px] text-emerald-300">check_circle</span>
        <span className="text-[12px] font-medium text-[#9ab0b0]">Sin alertas activas</span>
      </div>
    );
  }

  return (
    <div>
      {stockAlerts.length > 0 && (
        <>
          <SectionHead icon="inventory_2" iconColor="text-amber-500" label="Stock bajo" count={stockAlerts.length} />
          {stockAlerts.slice(0, 5).map((item, i) => (
            <AlertRow
              key={i}
              icon={item.estado === 'CRITICO' ? 'error' : 'warning'}
              iconColor={item.estado === 'CRITICO' ? 'text-red-500' : 'text-amber-500'}
              title={item.producto}
              sub={`${item.stock_actual} ${item.unidad} · mín ${item.stock_minimo}`}
              badge={item.estado}
              badgeColor={item.estado === 'CRITICO' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
            />
          ))}
          {stockAlerts.length > 5 && (
            <p className="text-[10px] text-[#9ab0b0] pb-1">+{stockAlerts.length - 5} más</p>
          )}
        </>
      )}

      {cpVencidas.length > 0 && (
        <>
          <SectionHead icon="payments" iconColor="text-red-500" label="C×P vencidas" count={cpVencidas.length} />
          {cpVencidas.slice(0, 4).map((item, i) => (
            <AlertRow
              key={i}
              icon="receipt_long"
              iconColor="text-red-400"
              title={item.proveedor}
              sub={`${item.numero_factura} · ${diasVencidos(item.fecha_vencimiento)}d vencida`}
              badge={fmt(item.saldo)}
              badgeColor="bg-red-50 text-red-700 border-red-200"
            />
          ))}
          {cpVencidas.length > 4 && (
            <p className="text-[10px] text-[#9ab0b0] pb-1">+{cpVencidas.length - 4} más</p>
          )}
        </>
      )}

      {ccVencidas.length > 0 && (
        <>
          <SectionHead icon="request_quote" iconColor="text-orange-500" label="C×C vencidas" count={ccVencidas.length} />
          {ccVencidas.slice(0, 4).map((item, i) => (
            <AlertRow
              key={i}
              icon="account_balance_wallet"
              iconColor="text-orange-400"
              title={item.cliente}
              sub={`${item.numero_factura} · ${diasVencidos(item.fecha_vencimiento)}d vencida`}
              badge={fmt(item.saldo)}
              badgeColor="bg-amber-50 text-amber-700 border-amber-200"
            />
          ))}
          {ccVencidas.length > 4 && (
            <p className="text-[10px] text-[#9ab0b0] pb-1">+{ccVencidas.length - 4} más</p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function ControlInversiones() {
  const [loading,   setLoading]   = useState(true);
  const [lastFetch, setLastFetch] = useState(null);

  const [valorInventario, setValorInventario] = useState(null);
  const [totalPagar,      setTotalPagar]      = useState(null);
  const [totalCobrar,     setTotalCobrar]     = useState(null);
  const [avesActivas,     setAvesActivas]     = useState(null);
  const [cpVencidasSum,   setCpVencidasSum]   = useState('0');
  const [ccVencidasSum,   setCcVencidasSum]   = useState('0');
  const [periodos,        setPeriodos]        = useState([]);
  const [lotesList,       setLotesList]       = useState([]);
  const [stockAlerts,     setStockAlerts]     = useState([]);
  const [cpVencidas,      setCpVencidas]      = useState([]);
  const [ccVencidas,      setCcVencidas]      = useState([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    const fecha_inicio = sixMonthsAgo();

    const [invR, cpR, ccR, lotesR, rentR] = await Promise.allSettled([
      getExistencias(),
      getCuentasPagar(),
      getCuentasCobrar(),
      getLotes(),
      getRentabilidad({ fecha_inicio, fecha_fin: TODAY, agrupar_por: 'mes' }),
    ]);

    if (invR.status === 'fulfilled') {
      setValorInventario(invR.value?.resumen?.valor_total ?? '0');
      setStockAlerts((invR.value?.items ?? []).filter((i) => i.estado === 'BAJO' || i.estado === 'CRITICO'));
    }

    if (cpR.status === 'fulfilled') {
      setTotalPagar(cpR.value?.resumen?.total_a_pagar ?? '0');
      setCpVencidasSum(cpR.value?.resumen?.vencidas ?? '0');
      setCpVencidas(
        (cpR.value?.items ?? []).filter(
          (f) => f.fecha_vencimiento && diasVencidos(f.fecha_vencimiento) > 0 && parseFloat(f.saldo) > 0,
        ),
      );
    }

    if (ccR.status === 'fulfilled') {
      setTotalCobrar(ccR.value?.resumen?.total_a_cobrar ?? '0');
      setCcVencidasSum(ccR.value?.resumen?.vencidas ?? '0');
      setCcVencidas(
        (ccR.value?.items ?? []).filter(
          (f) => f.fecha_vencimiento && diasVencidos(f.fecha_vencimiento) > 0 && parseFloat(f.saldo) > 0,
        ),
      );
    }

    if (lotesR.status === 'fulfilled') {
      const lista = lotesR.value?.items ?? [];
      setLotesList(lista);
      setAvesActivas(
        lista.filter((l) => l.estado === 'ACTIVO').reduce((s, l) => s + (l.cantidad_actual ?? 0), 0),
      );
    }

    if (rentR.status === 'fulfilled') {
      setPeriodos(rentR.value?.periodos ?? []);
    }

    setLastFetch(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const lotesActivos = lotesList.filter((l) => l.estado === 'ACTIVO').length;
  const totalAlertas = stockAlerts.length + cpVencidas.length + ccVencidas.length;

  const totIng  = periodos.reduce((s, p) => s + parseFloat(p.ingresos), 0);
  const totCost = periodos.reduce((s, p) => s + parseFloat(p.costos_total), 0);
  const totUtil = totIng - totCost;

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

        <PageHeader
          title="Dashboard · Capipollo"
          subtitle="Producción y Comercialización de Pollos de Engorde"
        >
          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="text-[11px] text-[#9ab0b0]">Act. {lastFetch}</span>
            )}
            {totalAlertas > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-md text-[11px] font-bold">
                <span className="material-symbols-outlined text-[13px]">notifications_active</span>
                {totalAlertas}
              </span>
            )}
            <button
              onClick={cargar}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-[6px] bg-white border border-[#dde8e8] text-[#374040] text-[12px] font-semibold rounded-md hover:bg-[#f0f5f5] transition-colors disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[15px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              Actualizar
            </button>
          </div>
        </PageHeader>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          <KpiCard
            icon="inventory_2" label="Valor de Inventario"
            value={valorInventario != null ? fmt(valorInventario) : '—'}
            sub={stockAlerts.length > 0 ? `${stockAlerts.length} producto${stockAlerts.length > 1 ? 's' : ''} con stock bajo` : 'Stock en niveles normales'}
            subAlert={stockAlerts.length > 0}
            accent="bg-[#012d1d]"
            loading={loading && valorInventario == null}
          />
          <KpiCard
            icon="payments" label="Total por Pagar"
            value={totalPagar != null ? fmt(totalPagar) : '—'}
            sub={parseFloat(cpVencidasSum) > 0 ? `${fmt(cpVencidasSum)} vencidas` : 'Sin vencimientos pendientes'}
            subAlert={parseFloat(cpVencidasSum) > 0}
            accent="bg-amber-500"
            loading={loading && totalPagar == null}
          />
          <KpiCard
            icon="account_balance_wallet" label="Total por Cobrar"
            value={totalCobrar != null ? fmt(totalCobrar) : '—'}
            sub={parseFloat(ccVencidasSum) > 0 ? `${fmt(ccVencidasSum)} vencidas` : 'Sin vencimientos pendientes'}
            subAlert={parseFloat(ccVencidasSum) > 0}
            accent="bg-sky-600"
            loading={loading && totalCobrar == null}
          />
          <KpiCard
            icon="egg" label="Aves Activas"
            value={avesActivas != null ? avesActivas.toLocaleString('es-MX') : '—'}
            sub={`${lotesActivos} lote${lotesActivos !== 1 ? 's' : ''} activo${lotesActivos !== 1 ? 's' : ''}`}
            accent="bg-emerald-600"
            loading={loading && avesActivas == null}
          />
        </div>

        {/* Three-column section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Ingresos vs Costos */}
          <ContentCard>
            <CardHeader>
              <CardTitle>Ingresos vs Costos</CardTitle>
              <span className="text-[10px] text-[#9ab0b0]">Últimos 6 meses</span>
            </CardHeader>
            <div className="px-4 pb-3">
              <LineChart periodos={periodos} loading={loading && periodos.length === 0} />
            </div>
            {!loading && periodos.length > 0 && (
              <div className="grid grid-cols-3 divide-x divide-[#f0f5f5] border-t border-[#f0f5f5]">
                {[
                  { l: 'Ingresos', v: totIng,  c: 'text-emerald-700' },
                  { l: 'Costos',   v: totCost, c: 'text-amber-600'   },
                  { l: 'Utilidad', v: totUtil, c: totUtil < 0 ? 'text-red-600' : 'text-[#012d1d]' },
                ].map(({ l, v, c }) => (
                  <div key={l} className="px-2 py-2.5 text-center">
                    <p className="text-[9px] font-semibold text-[#9ab0b0] uppercase tracking-wider">{l}</p>
                    <p className={`text-[12px] font-bold mt-0.5 ${c}`}>{fmtCompact(v)}</p>
                  </div>
                ))}
              </div>
            )}
          </ContentCard>

          {/* Mortalidad por Lote */}
          <ContentCard>
            <CardHeader>
              <CardTitle>Mortalidad por Lote</CardTitle>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-[#9ab0b0]">Activo</span>
              </div>
            </CardHeader>
            <div className="px-4 pb-3">
              <MortalityChart lotes={lotesList} loading={loading && lotesList.length === 0} />
            </div>
            {!loading && lotesList.length > 0 && (
              <div className="grid grid-cols-3 divide-x divide-[#f0f5f5] border-t border-[#f0f5f5]">
                {[
                  { l: '< 3%',  c: 'text-emerald-700', n: lotesList.filter((l) => l.cantidad_inicial > 0 && (l.cantidad_mortalidad / l.cantidad_inicial) < 0.03).length },
                  { l: '3–7%',  c: 'text-amber-600',   n: lotesList.filter((l) => { const r = l.cantidad_mortalidad / l.cantidad_inicial; return r >= 0.03 && r < 0.07; }).length },
                  { l: '> 7%',  c: 'text-red-600',     n: lotesList.filter((l) => l.cantidad_inicial > 0 && (l.cantidad_mortalidad / l.cantidad_inicial) >= 0.07).length },
                ].map(({ l, c, n }) => (
                  <div key={l} className="px-2 py-2.5 text-center">
                    <p className="text-[9px] font-semibold text-[#9ab0b0] uppercase tracking-wider">Mort. {l}</p>
                    <p className={`text-[14px] font-bold mt-0.5 ${c}`}>{n}</p>
                  </div>
                ))}
              </div>
            )}
          </ContentCard>

          {/* Alertas */}
          <ContentCard>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
              {totalAlertas > 0 && (
                <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold border border-red-200 rounded-full">
                  {totalAlertas}
                </span>
              )}
            </CardHeader>
            <div className="px-4 pb-3 max-h-[290px] overflow-y-auto custom-scrollbar">
              <AlertsPanel
                stockAlerts={stockAlerts}
                cpVencidas={cpVencidas}
                ccVencidas={ccVencidas}
                loading={loading}
              />
            </div>
            {!loading && (
              <div className="grid grid-cols-3 divide-x divide-[#f0f5f5] border-t border-[#f0f5f5]">
                {[
                  { l: 'Stock',   n: stockAlerts.length, c: stockAlerts.length > 0 ? 'text-amber-600'  : 'text-emerald-700' },
                  { l: 'C×P',     n: cpVencidas.length,  c: cpVencidas.length > 0  ? 'text-red-600'    : 'text-emerald-700' },
                  { l: 'C×C',     n: ccVencidas.length,  c: ccVencidas.length > 0  ? 'text-orange-600' : 'text-emerald-700' },
                ].map(({ l, n, c }) => (
                  <div key={l} className="px-2 py-2.5 text-center">
                    <p className="text-[9px] font-semibold text-[#9ab0b0] uppercase tracking-wider">{l}</p>
                    <p className={`text-[14px] font-bold mt-0.5 ${c}`}>{n}</p>
                  </div>
                ))}
              </div>
            )}
          </ContentCard>

        </div>
      </div>
    </main>
  );
}
