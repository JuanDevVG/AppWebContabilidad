import { useState, useEffect, useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import { getCuentasPagar, getCuentasCobrar } from '../utils/apiService';
import { BtnPrimary, BtnSecondary, AlertError, PageHeader, Spinner } from '../ui/index.jsx';

const HOY = new Date();
HOY.setHours(0, 0, 0, 0);

function diasVencidos(fechaVenc) {
  if (!fechaVenc) return 0;
  const fv = new Date(fechaVenc);
  fv.setHours(0, 0, 0, 0);
  return Math.floor((HOY - fv) / 86_400_000);
}

function bucket(dias) {
  if (dias <= 0) return 'corriente';
  if (dias <= 30) return 'd1_30';
  if (dias <= 60) return 'd31_60';
  if (dias <= 90) return 'd61_90';
  return 'd90plus';
}

const BUCKETS = ['corriente', 'd1_30', 'd31_60', 'd61_90', 'd90plus'];
const LABELS  = ['Corriente', '1–30 días', '31–60 días', '61–90 días', '90+ días'];

// Color de celda según bucket (solo aplica si hay monto)
const BUCKET_STYLE = {
  corriente: { cell: '',                        text: 'text-[#374040]' },
  d1_30:     { cell: 'bg-amber-50',             text: 'text-amber-700 font-semibold' },
  d31_60:    { cell: 'bg-orange-50',            text: 'text-orange-700 font-semibold' },
  d61_90:    { cell: 'bg-red-50',               text: 'text-red-600 font-semibold' },
  d90plus:   { cell: 'bg-red-100',              text: 'text-red-800 font-bold' },
};

const HEADER_STYLE = {
  corriente: 'text-[#c8ddd8]',
  d1_30:     'text-amber-300',
  d31_60:    'text-orange-300',
  d61_90:    'text-red-300',
  d90plus:   'text-red-200',
};

function fmt(n) {
  const v = Number(n || 0);
  if (v === 0) return '—';
  return v.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtTotal(n) {
  return Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function calcularGrupos(items, nombreKey) {
  const mapa = {};
  for (const item of items) {
    const saldo = Number(item.saldo || 0);
    if (saldo <= 0) continue;
    const nombre = item[nombreKey] || 'Sin nombre';
    if (!mapa[nombre]) {
      mapa[nombre] = { nombre, corriente: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 };
    }
    const b = bucket(diasVencidos(item.fecha_vencimiento));
    mapa[nombre][b]    += saldo;
    mapa[nombre].total += saldo;
  }
  return Object.values(mapa).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function calcularTotales(grupos) {
  const t = { corriente: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 };
  for (const g of grupos) BUCKETS.forEach((b) => { t[b] += g[b]; t.total += b === 'corriente' ? 0 : 0; });
  t.total = BUCKETS.reduce((s, b) => s + t[b], 0);
  return t;
}

function exportarCSV(grupos, tab, totales) {
  const BOM = '﻿';
  const sep = ';';
  const headers = [tab === 'cxp' ? 'Proveedor' : 'Cliente', ...LABELS, 'Total'];
  const filas = grupos.map((g) => [
    g.nombre,
    ...BUCKETS.map((b) => Number(g[b]).toFixed(2)),
    Number(g.total).toFixed(2),
  ]);
  filas.push(['TOTAL', ...BUCKETS.map((b) => Number(totales[b]).toFixed(2)), Number(totales.total).toFixed(2)]);
  const csv = [headers, ...filas]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(sep))
    .join('\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aging_${tab}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function AgingTable({ grupos, tab }) {
  const totales = useMemo(() => calcularTotales(grupos), [grupos]);
  const nombreCol = tab === 'cxp' ? 'Proveedor' : 'Cliente';

  if (grupos.length === 0) {
    return (
      <div className="text-center py-14 text-[13px] text-[#aebfbf]">
        No hay saldos pendientes
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#dde8e8] shadow-sm">
      <table className="w-full border-collapse" style={{ minWidth: '780px', tableLayout: 'fixed' }}>
        <colgroup>
          <col />
          {BUCKETS.map((b) => <col key={b} style={{ width: '120px' }} />)}
          <col style={{ width: '130px' }} />
        </colgroup>
        <thead>
          <tr style={{ background: 'linear-gradient(90deg, #012d1d 0%, #021f14 100%)' }}>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-[#c8ddd8] uppercase tracking-wider">
              {nombreCol}
            </th>
            {BUCKETS.map((b, i) => (
              <th key={b} className={`px-2.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${HEADER_STYLE[b]}`}>
                {LABELS[i]}
              </th>
            ))}
            <th className="px-2.5 py-2.5 text-right text-[11px] font-semibold text-white uppercase tracking-wider">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g, i) => (
            <tr key={g.nombre} className={`border-b border-[#f0f5f5] ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafcfc]'} hover:bg-[#f5faf8] transition-colors`}>
              <td className="px-3 py-2 text-[12.5px] font-medium text-[#1a2e2e] truncate">{g.nombre}</td>
              {BUCKETS.map((b) => {
                const val = g[b];
                const { cell, text } = BUCKET_STYLE[b];
                return (
                  <td key={b} className={`px-2.5 py-2 text-right text-[12px] font-mono ${cell} ${val > 0 ? text : 'text-[#d4e4e4]'}`}>
                    {val > 0 ? fmt(val) : '—'}
                  </td>
                );
              })}
              <td className="px-2.5 py-2 text-right text-[12.5px] font-bold font-mono text-[#012d1d]">
                {fmtTotal(g.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#012d1d' }}>
            <td className="px-3 py-2.5 text-[12px] font-bold text-white">Total</td>
            {BUCKETS.map((b, i) => (
              <td key={b} className={`px-2.5 py-2.5 text-right text-[12px] font-bold font-mono ${
                b === 'corriente' ? 'text-[#c8ddd8]' :
                b === 'd1_30'    ? 'text-amber-300' :
                b === 'd31_60'   ? 'text-orange-300' :
                b === 'd61_90'   ? 'text-red-300' : 'text-red-200'
              }`}>
                {totales[b] > 0 ? fmtTotal(totales[b]) : '—'}
              </td>
            ))}
            <td className="px-2.5 py-2.5 text-right text-[13px] font-bold font-mono text-emerald-300">
              {fmtTotal(totales.total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function KpiChip({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg border border-[#dde8e8] px-4 py-3 flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
      <div>
        <p className="text-[10.5px] font-semibold text-[#6b8f8f] uppercase tracking-wide">{label}</p>
        <p className="text-[14px] font-bold text-[#1a2e2e] font-mono leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function ReporteCxPCxC() {
  const [tab, setTab] = useState('cxp');

  const [itemsCxP, setItemsCxP] = useState([]);
  const [itemsCxC, setItemsCxC] = useState([]);
  const [cargando, setCargando]  = useState(true);
  const [error, setError]        = useState('');

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError('');
      try {
        const [r1, r2, r3, r4] = await Promise.allSettled([
          getCuentasPagar({ estado: 'PENDIENTE' }),
          getCuentasPagar({ estado: 'PARCIAL'  }),
          getCuentasCobrar({ estado: 'PENDIENTE' }),
          getCuentasCobrar({ estado: 'PARCIAL'  }),
        ]);

        const cxpItems = [
          ...(r1.status === 'fulfilled' ? (r1.value?.items ?? []) : []),
          ...(r2.status === 'fulfilled' ? (r2.value?.items ?? []) : []),
        ];
        const cxcItems = [
          ...(r3.status === 'fulfilled' ? (r3.value?.items ?? []) : []),
          ...(r4.status === 'fulfilled' ? (r4.value?.items ?? []) : []),
        ];

        // Deduplicar por id en caso de solapamiento
        setItemsCxP(Object.values(Object.fromEntries(cxpItems.map((i) => [i.id, i]))));
        setItemsCxC(Object.values(Object.fromEntries(cxcItems.map((i) => [i.id, i]))));
      } catch (err) {
        setError(err.message || 'Error al cargar los datos');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  const gruposCxP = useMemo(() => calcularGrupos(itemsCxP, 'proveedor'), [itemsCxP]);
  const gruposCxC = useMemo(() => calcularGrupos(itemsCxC, 'cliente'),   [itemsCxC]);

  const grupos    = tab === 'cxp' ? gruposCxP : gruposCxC;
  const totales   = useMemo(() => calcularTotales(grupos), [grupos]);

  const vencidoTotal = (totales.d1_30 + totales.d31_60 + totales.d61_90 + totales.d90plus);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #reporte-cxpcxc, #reporte-cxpcxc * { visibility: visible; }
          #reporte-cxpcxc { position: fixed; inset: 0; padding: 16px; }
          .no-print { display: none !important; }
          th, td { padding: 3px 6px !important; font-size: 10px !important; }
        }
      `}</style>

      <main id="reporte-cxpcxc" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

          <PageHeader
            title="Antigüedad CxP y CxC"
            subtitle="Saldos pendientes clasificados por días de vencimiento"
          >
            {!cargando && !error && (
              <div className="flex gap-2 no-print">
                <BtnSecondary onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </BtnSecondary>
                <BtnSecondary onClick={() => exportarCSV(grupos, tab, totales)}>
                  <Download className="w-3.5 h-3.5" />
                  Exportar CSV
                </BtnSecondary>
              </div>
            )}
          </PageHeader>

          {error && <AlertError>{error}</AlertError>}

          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-20 text-[#6b8f8f]">
              <Spinner size="md" className="text-[#6b8f8f]" />
              <span className="text-[13px]">Cargando datos...</span>
            </div>
          ) : !error && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-5 bg-white border border-[#dde8e8] rounded-lg p-1 w-fit no-print">
                {[
                  { id: 'cxp', label: 'Cuentas por Pagar', icon: 'payments' },
                  { id: 'cxc', label: 'Cuentas por Cobrar', icon: 'account_balance_wallet' },
                ].map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold transition-all duration-150 ${
                      tab === id
                        ? 'bg-[#012d1d] text-white shadow-sm'
                        : 'text-[#6b8f8f] hover:text-[#1a2e2e] hover:bg-[#f0f5f5]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[17px]">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              {/* KPI chips */}
              <div className="flex flex-wrap gap-3 mb-5">
                <KpiChip label="Total pendiente" value={`$${fmtTotal(totales.total)}`} color="bg-[#012d1d]" />
                <KpiChip label="Corriente"        value={`$${fmtTotal(totales.corriente)}`} color="bg-emerald-500" />
                <KpiChip label="1–30 días"        value={`$${fmtTotal(totales.d1_30)}`}   color="bg-amber-400" />
                <KpiChip label="31–60 días"       value={`$${fmtTotal(totales.d31_60)}`}  color="bg-orange-500" />
                <KpiChip label="61–90 días"       value={`$${fmtTotal(totales.d61_90)}`}  color="bg-red-500" />
                <KpiChip label="90+ días"         value={`$${fmtTotal(totales.d90plus)}`} color="bg-red-800" />
              </div>

              {/* Barra de composición */}
              {totales.total > 0 && (
                <div className="mb-5 bg-white rounded-xl border border-[#dde8e8] shadow-sm px-5 py-4">
                  <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-2">
                    Composición del saldo
                  </p>
                  <div className="flex h-4 rounded-full overflow-hidden gap-px">
                    {BUCKETS.map((b, i) => {
                      const pct = (totales[b] / totales.total) * 100;
                      if (pct < 0.5) return null;
                      const colors = ['bg-emerald-400', 'bg-amber-400', 'bg-orange-500', 'bg-red-500', 'bg-red-800'];
                      return (
                        <div
                          key={b}
                          className={`${colors[i]} transition-all`}
                          style={{ width: `${pct}%` }}
                          title={`${LABELS[i]}: ${pct.toFixed(1)}%`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {BUCKETS.map((b, i) => {
                      const pct = totales.total > 0 ? (totales[b] / totales.total) * 100 : 0;
                      const colors = ['text-emerald-600', 'text-amber-600', 'text-orange-600', 'text-red-600', 'text-red-800'];
                      return (
                        <span key={b} className={`text-[10.5px] font-medium ${colors[i]}`}>
                          {LABELS[i]}: {pct.toFixed(1)}%
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tabla de antigüedad */}
              <AgingTable grupos={grupos} tab={tab} />

              {vencidoTotal > 0 && (
                <p className="mt-3 text-[11.5px] text-red-500 font-semibold">
                  ⚠ Saldo vencido total: ${fmtTotal(vencidoTotal)}
                </p>
              )}

              <p className="mt-2 text-[11px] text-[#aebfbf] text-right no-print">
                Corte al {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
