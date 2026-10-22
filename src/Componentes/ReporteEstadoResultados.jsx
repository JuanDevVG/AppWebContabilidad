import { useState } from 'react';
import { Download, Printer, ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getReporteEstadoResultados } from '../utils/apiService';
import { BtnPrimary, BtnSecondary, AlertError, PageHeader, Spinner } from '../ui/index.jsx';

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }
function ymd(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }
function diasEnMes(y, m) { return new Date(y, m, 0).getDate(); }

function periodos() {
  const hoy  = new Date();
  const y    = hoy.getFullYear();
  const m    = hoy.getMonth() + 1;

  const mesAnterior  = m === 1 ? 12 : m - 1;
  const yearMesAnt   = m === 1 ? y - 1 : y;

  const q  = Math.ceil(m / 3);
  const qAnterior = q === 1 ? 4 : q - 1;
  const yqAnt     = q === 1 ? y - 1 : y;
  const qMeses    = { 1: [1,3], 2: [4,6], 3: [7,9], 4: [10,12] };
  const [qm1, qm2]     = qMeses[q];
  const [qam1, qam2]   = qMeses[qAnterior];

  return [
    {
      id: 'mes_actual',
      label: `Mes actual (${pad(m)}/${y})`,
      fi: ymd(y, m, 1), ff: ymd(y, m, diasEnMes(y, m)),
      ci: ymd(yearMesAnt, mesAnterior, 1), cf: ymd(yearMesAnt, mesAnterior, diasEnMes(yearMesAnt, mesAnterior)),
      compLabel: `${pad(mesAnterior)}/${yearMesAnt}`,
    },
    {
      id: 'mes_anterior',
      label: `Mes anterior (${pad(mesAnterior)}/${yearMesAnt})`,
      fi: ymd(yearMesAnt, mesAnterior, 1), ff: ymd(yearMesAnt, mesAnterior, diasEnMes(yearMesAnt, mesAnterior)),
      ci: ymd(yearMesAnt, mesAnterior === 1 ? 12 : mesAnterior - 1, 1),
      cf: ymd(yearMesAnt, mesAnterior === 1 ? 12 : mesAnterior - 1, diasEnMes(yearMesAnt, mesAnterior === 1 ? 12 : mesAnterior - 1)),
      compLabel: `${pad(mesAnterior === 1 ? 12 : mesAnterior - 1)}/${mesAnterior === 1 ? yearMesAnt - 1 : yearMesAnt}`,
    },
    {
      id: 'trim_actual',
      label: `Trimestre actual (Q${q} ${y})`,
      fi: ymd(y, qm1, 1), ff: ymd(y, qm2, diasEnMes(y, qm2)),
      ci: ymd(yqAnt, qam1, 1), cf: ymd(yqAnt, qam2, diasEnMes(yqAnt, qam2)),
      compLabel: `Q${qAnterior} ${yqAnt}`,
    },
    {
      id: 'trim_anterior',
      label: `Trimestre anterior (Q${qAnterior} ${yqAnt})`,
      fi: ymd(yqAnt, qam1, 1), ff: ymd(yqAnt, qam2, diasEnMes(yqAnt, qam2)),
      ci: ymd(qAnterior === 1 ? yqAnt - 1 : yqAnt, qAnterior === 1 ? 10 : (qAnterior - 2) * 3 + 1, 1),
      cf: ymd(qAnterior === 1 ? yqAnt - 1 : yqAnt, qAnterior === 1 ? 12 : qAnterior * 3 - 3, diasEnMes(qAnterior === 1 ? yqAnt - 1 : yqAnt, qAnterior === 1 ? 12 : qAnterior * 3 - 3)),
      compLabel: `Q${qAnterior === 1 ? 4 : qAnterior - 1} ${qAnterior === 1 ? yqAnt - 1 : yqAnt}`,
    },
    {
      id: 'anio_actual',
      label: `Año actual (${y})`,
      fi: ymd(y, 1, 1), ff: ymd(y, 12, 31),
      ci: ymd(y - 1, 1, 1), cf: ymd(y - 1, 12, 31),
      compLabel: `${y - 1}`,
    },
    {
      id: 'anio_anterior',
      label: `Año anterior (${y - 1})`,
      fi: ymd(y - 1, 1, 1), ff: ymd(y - 1, 12, 31),
      ci: ymd(y - 2, 1, 1), cf: ymd(y - 2, 12, 31),
      compLabel: `${y - 2}`,
    },
  ];
}

// ─── Formato numérico ─────────────────────────────────────────────────────────

function fmt(n) {
  const v = Number(n || 0);
  return v.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function pct(valor, base) {
  if (!base || Number(base) === 0) return '—';
  return (Number(valor) / Number(base) * 100).toFixed(1) + '%';
}
function variacion(actual, anterior) {
  const a = Number(actual || 0);
  const b = Number(anterior || 0);
  if (b === 0) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportarCSV(data, periodoLabel, compLabel) {
  const BOM = '﻿';
  const sep = ';';
  const ingresoTotal = Number(data.ingresos.total_actual);

  const filas = [
    [`Estado de Resultados — ${periodoLabel} vs ${compLabel}`],
    [],
    ['Concepto', `${periodoLabel} ($)`, '% Ing.', `${compLabel} ($)`, '% Ing. (ant.)', 'Var %'],
    [],
    ['INGRESOS'],
    ...data.ingresos.lineas.map((l) => [
      `  ${l.nombre}`, l.actual, pct(l.actual, ingresoTotal), l.anterior, pct(l.anterior, Number(data.ingresos.total_anterior)), '',
    ]),
    ['TOTAL INGRESOS', data.ingresos.total_actual, '100%', data.ingresos.total_anterior, '100%', ''],
    [],
    ['COSTO DE VENTAS'],
    ...data.costos.lineas.map((l) => [
      `  ${l.nombre}`, l.actual, pct(l.actual, ingresoTotal), l.anterior, '', '',
    ]),
    ['TOTAL COSTO DE VENTAS', data.costos.total_actual, pct(data.costos.total_actual, ingresoTotal), data.costos.total_anterior, '', ''],
    [],
    ['UTILIDAD BRUTA', data.utilidad_bruta.actual, pct(data.utilidad_bruta.actual, ingresoTotal), data.utilidad_bruta.anterior, '', ''],
    [],
    ['GASTOS OPERATIVOS'],
    ...data.gastos.lineas.map((l) => [
      `  ${l.nombre}`, l.actual, pct(l.actual, ingresoTotal), l.anterior, '', '',
    ]),
    ['TOTAL GASTOS', data.gastos.total_actual, pct(data.gastos.total_actual, ingresoTotal), data.gastos.total_anterior, '', ''],
    [],
    ['UTILIDAD NETA', data.utilidad_neta.actual, pct(data.utilidad_neta.actual, ingresoTotal), data.utilidad_neta.anterior, '', ''],
  ];

  const csv = filas
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(sep))
    .join('\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `estado_resultados_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function VarBadge({ actual, anterior }) {
  const v = variacion(actual, anterior);
  if (v === null) return <span className="text-[#aebfbf] text-[11px]">—</span>;
  const positivo = v >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${positivo ? 'text-emerald-600' : 'text-red-500'}`}>
      {positivo ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function SeccionHeader({ label, colspan = 6 }) {
  return (
    <tr>
      <td
        colSpan={colspan}
        className="px-4 pt-5 pb-1 text-[10.5px] font-bold uppercase tracking-widest text-[#6b8f8f]"
      >
        {label}
      </td>
    </tr>
  );
}

function LineaRow({ codigo, nombre, actual, anterior, ingresoActual, ingresoAnterior, indent = false }) {
  return (
    <tr className="hover:bg-[#f5faf8] transition-colors border-b border-[#f5f5f5]">
      <td className={`px-4 py-1.5 text-[12px] text-[#374040] ${indent ? 'pl-8' : ''}`}>
        <span className="text-[10px] text-[#aebfbf] mr-2 font-mono">{codigo}</span>
        {nombre}
      </td>
      <td className="px-3 py-1.5 text-right text-[12px] font-mono text-[#1a2e2e]">{fmt(actual)}</td>
      <td className="px-3 py-1.5 text-right text-[11px] text-[#6b8f8f]">{pct(actual, ingresoActual)}</td>
      <td className="px-3 py-1.5 text-right text-[12px] font-mono text-[#6b8f8f]">{fmt(anterior)}</td>
      <td className="px-3 py-1.5 text-right text-[11px] text-[#aebfbf]">{pct(anterior, ingresoAnterior)}</td>
      <td className="px-3 py-1.5 text-right"><VarBadge actual={actual} anterior={anterior} /></td>
    </tr>
  );
}

function SubtotalRow({ label, actual, anterior, ingresoActual, ingresoAnterior, highlight = false }) {
  return (
    <tr className={`border-t border-[#dde8e8] ${highlight ? 'bg-[#f0f9f4]' : 'bg-[#fafcfc]'}`}>
      <td className={`px-4 py-2 text-[12.5px] font-bold ${highlight ? 'text-[#012d1d]' : 'text-[#374040]'}`}>
        {label}
      </td>
      <td className={`px-3 py-2 text-right text-[13px] font-bold font-mono ${highlight ? 'text-[#012d1d]' : 'text-[#374040]'}`}>
        {fmt(actual)}
      </td>
      <td className={`px-3 py-2 text-right text-[11.5px] font-semibold ${highlight ? 'text-[#012d1d]' : 'text-[#6b8f8f]'}`}>
        {pct(actual, ingresoActual)}
      </td>
      <td className="px-3 py-2 text-right text-[13px] font-bold font-mono text-[#6b8f8f]">
        {fmt(anterior)}
      </td>
      <td className="px-3 py-2 text-right text-[11.5px] text-[#aebfbf]">
        {pct(anterior, ingresoAnterior)}
      </td>
      <td className="px-3 py-2 text-right"><VarBadge actual={actual} anterior={anterior} /></td>
    </tr>
  );
}

function DivisorRow({ label }) {
  return (
    <tr>
      <td colSpan={6} className="px-4 py-0">
        <div className="border-t-2 border-[#012d1d]/20 my-1" />
      </td>
    </tr>
  );
}

function ResultadoFinal({ label, actual, anterior, ingresoActual, ingresoAnterior, positivo }) {
  const esPositivo = Number(actual) >= 0;
  return (
    <tr style={{ background: '#012d1d' }}>
      <td className="px-4 py-3 text-[13px] font-bold text-white">{label}</td>
      <td className={`px-3 py-3 text-right text-[14px] font-bold font-mono ${esPositivo ? 'text-emerald-300' : 'text-red-300'}`}>
        {fmt(actual)}
      </td>
      <td className="px-3 py-3 text-right text-[12px] font-semibold text-white/60">
        {pct(actual, ingresoActual)}
      </td>
      <td className={`px-3 py-3 text-right text-[13px] font-bold font-mono ${Number(anterior) >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
        {fmt(anterior)}
      </td>
      <td className="px-3 py-3 text-right text-[11px] text-white/40">
        {pct(anterior, ingresoAnterior)}
      </td>
      <td className="px-3 py-3 text-right"><VarBadge actual={actual} anterior={anterior} /></td>
    </tr>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const OPCIONES = periodos();

export default function ReporteEstadoResultados() {
  const [periodoId, setPeriodoId] = useState(OPCIONES[0].id);
  const [data, setData]           = useState(null);
  const [cargando, setCargando]   = useState(false);
  const [error, setError]         = useState('');

  const opcion = OPCIONES.find((o) => o.id === periodoId) ?? OPCIONES[0];

  async function consultar() {
    setCargando(true);
    setError('');
    setData(null);
    try {
      const resp = await getReporteEstadoResultados({
        fecha_inicio: opcion.fi,
        fecha_fin:    opcion.ff,
        comp_inicio:  opcion.ci,
        comp_fin:     opcion.cf,
      });
      setData(resp);
    } catch (err) {
      setError(err.message || 'Error al generar el reporte');
    } finally {
      setCargando(false);
    }
  }

  const ia = data ? Number(data.ingresos.total_actual)   : 0;
  const ip = data ? Number(data.ingresos.total_anterior) : 0;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #reporte-er, #reporte-er * { visibility: visible; }
          #reporte-er { position: fixed; inset: 0; padding: 20px; }
          .no-print { display: none !important; }
          th, td { padding: 3px 8px !important; font-size: 10px !important; }
        }
      `}</style>

      <main id="reporte-er" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

          <PageHeader
            title="Estado de Resultados"
            subtitle="Ingresos, costos y gastos comparados entre períodos"
          >
            {data && (
              <div className="flex gap-2 no-print">
                <BtnSecondary onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </BtnSecondary>
                <BtnSecondary onClick={() => exportarCSV(data, opcion.label, opcion.compLabel)}>
                  <Download className="w-3.5 h-3.5" />
                  Exportar CSV
                </BtnSecondary>
              </div>
            )}
          </PageHeader>

          {/* Selector de período */}
          <div className="bg-white border border-[#dde8e8] rounded-xl shadow-sm px-4 py-3.5 mb-4 flex flex-wrap items-end gap-3 no-print">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                Período
              </label>
              <div className="relative">
                <select
                  value={periodoId}
                  onChange={(e) => setPeriodoId(e.target.value)}
                  className="w-full bg-white border border-[#dde8e8] rounded-md pl-3 pr-8 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 appearance-none transition-colors"
                >
                  {OPCIONES.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
              </div>
            </div>
            <div className="text-[12px] text-[#6b8f8f] pb-2">
              Comparado con: <span className="font-semibold text-[#374040]">{opcion.compLabel}</span>
            </div>
            <BtnPrimary onClick={consultar} disabled={cargando}>
              {cargando && <Spinner size="xs" className="text-white" />}
              Generar
            </BtnPrimary>
          </div>

          {error && <AlertError onRetry={consultar}>{error}</AlertError>}

          {!cargando && !data && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center no-print">
              <span className="material-symbols-outlined text-[48px] text-[#c4d4d4] mb-3">bar_chart</span>
              <p className="text-[14px] font-medium text-[#6b8f8f]">Selecciona un período y genera el reporte</p>
              <p className="text-[12px] text-[#aebfbf] mt-1">Requiere asientos contables registrados en el período</p>
            </div>
          )}

          {cargando && (
            <div className="flex items-center justify-center gap-2 py-20 text-[#6b8f8f]">
              <Spinner size="md" className="text-[#6b8f8f]" />
              <span className="text-[13px]">Calculando estado de resultados...</span>
            </div>
          )}

          {data && !cargando && (
            <>
              {/* Encabezado del estado */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-[#1a2e2e]">Estado de Resultados</h2>
                  <p className="text-[12px] text-[#6b8f8f] mt-0.5">
                    {data.periodo.inicio} al {data.periodo.fin}
                    {data.comparativo && (
                      <span className="ml-2 text-[#aebfbf]">vs {data.comparativo.inicio} al {data.comparativo.fin}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Tabla financiera */}
              <div className="overflow-x-auto rounded-xl border border-[#dde8e8] shadow-sm bg-white">
                <table className="w-full border-collapse" style={{ minWidth: '680px' }}>
                  {/* Encabezado de columnas */}
                  <thead>
                    <tr style={{ background: 'linear-gradient(90deg, #012d1d 0%, #021f14 100%)' }}>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#c8ddd8] uppercase tracking-wider">
                        Concepto
                      </th>
                      <th className="px-3 py-3 text-right text-[11px] font-semibold text-[#c8ddd8] uppercase tracking-wider whitespace-nowrap">
                        {opcion.label.split('(')[1]?.replace(')', '') ?? 'Actual'}
                      </th>
                      <th className="px-3 py-3 text-right text-[11px] font-semibold text-[#c8ddd8] uppercase tracking-wider">
                        % Ing.
                      </th>
                      <th className="px-3 py-3 text-right text-[11px] font-semibold text-[#6b8f]/60 text-white/50 uppercase tracking-wider whitespace-nowrap">
                        {opcion.compLabel}
                      </th>
                      <th className="px-3 py-3 text-right text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                        % Ing.
                      </th>
                      <th className="px-3 py-3 text-right text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                        Var %
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* ── INGRESOS ── */}
                    <SeccionHeader label="Ingresos" />
                    {data.ingresos.lineas.map((l) => (
                      <LineaRow
                        key={l.codigo}
                        codigo={l.codigo} nombre={l.nombre}
                        actual={l.actual} anterior={l.anterior}
                        ingresoActual={ia} ingresoAnterior={ip}
                        indent
                      />
                    ))}
                    {data.ingresos.lineas.length === 0 && (
                      <tr><td colSpan={6} className="px-8 py-2 text-[12px] text-[#aebfbf] italic">Sin movimientos</td></tr>
                    )}
                    <SubtotalRow
                      label="Total Ingresos"
                      actual={data.ingresos.total_actual}
                      anterior={data.ingresos.total_anterior}
                      ingresoActual={ia} ingresoAnterior={ip}
                    />

                    <DivisorRow />

                    {/* ── COSTO DE VENTAS ── */}
                    <SeccionHeader label="Costo de Ventas" />
                    {data.costos.lineas.map((l) => (
                      <LineaRow
                        key={l.codigo}
                        codigo={l.codigo} nombre={l.nombre}
                        actual={l.actual} anterior={l.anterior}
                        ingresoActual={ia} ingresoAnterior={ip}
                        indent
                      />
                    ))}
                    {data.costos.lineas.length === 0 && (
                      <tr><td colSpan={6} className="px-8 py-2 text-[12px] text-[#aebfbf] italic">Sin movimientos</td></tr>
                    )}
                    <SubtotalRow
                      label="Total Costo de Ventas"
                      actual={data.costos.total_actual}
                      anterior={data.costos.total_anterior}
                      ingresoActual={ia} ingresoAnterior={ip}
                    />

                    <DivisorRow />

                    {/* ── UTILIDAD BRUTA ── */}
                    <SubtotalRow
                      label="Utilidad Bruta"
                      actual={data.utilidad_bruta.actual}
                      anterior={data.utilidad_bruta.anterior}
                      ingresoActual={ia} ingresoAnterior={ip}
                      highlight
                    />

                    <DivisorRow />

                    {/* ── GASTOS OPERATIVOS ── */}
                    <SeccionHeader label="Gastos Operativos" />
                    {data.gastos.lineas.map((l) => (
                      <LineaRow
                        key={l.codigo}
                        codigo={l.codigo} nombre={l.nombre}
                        actual={l.actual} anterior={l.anterior}
                        ingresoActual={ia} ingresoAnterior={ip}
                        indent
                      />
                    ))}
                    {data.gastos.lineas.length === 0 && (
                      <tr><td colSpan={6} className="px-8 py-2 text-[12px] text-[#aebfbf] italic">Sin movimientos</td></tr>
                    )}
                    <SubtotalRow
                      label="Total Gastos Operativos"
                      actual={data.gastos.total_actual}
                      anterior={data.gastos.total_anterior}
                      ingresoActual={ia} ingresoAnterior={ip}
                    />
                  </tbody>

                  <tfoot>
                    <ResultadoFinal
                      label="Utilidad Neta"
                      actual={data.utilidad_neta.actual}
                      anterior={data.utilidad_neta.anterior}
                      ingresoActual={ia}
                      ingresoAnterior={ip}
                    />
                  </tfoot>
                </table>
              </div>

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
