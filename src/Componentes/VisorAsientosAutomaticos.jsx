import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { ChevronRight, Download, Search, X } from 'lucide-react';
import {
  PageHeader, ContentCard, CardHeader, CardTitle,
  BtnPrimary, BtnSecondary, BtnGhost,
  Field, FieldInput, FieldSelect,
  AlertError,
  Th, Td, THead, TBody, EmptyRow, LoadingRows,
} from '../ui/index.jsx';
import {
  getAsientosAutomaticos, getAsientoAutomaticoDetalle,
} from '../utils/apiService.js';

// ── Constants ────────────────────────────────────────────────────────────────

const MODULOS = [
  { value: 'COMPRAS',    label: 'Compras' },
  { value: 'VENTAS',     label: 'Ventas' },
  { value: 'INVENTARIO', label: 'Inventario' },
  { value: 'PAGOS',      label: 'Pagos' },
  { value: 'TESORERIA',  label: 'Tesorería' },
];

const MODULO_CLS = {
  COMPRAS:    'bg-blue-100 text-blue-700 ring-blue-200',
  VENTAS:     'bg-emerald-100 text-emerald-700 ring-emerald-200',
  INVENTARIO: 'bg-amber-100 text-amber-700 ring-amber-200',
  PAGOS:      'bg-violet-100 text-violet-700 ring-violet-200',
  TESORERIA:  'bg-teal-100 text-teal-700 ring-teal-200',
};

function fmt(n) {
  const v = parseFloat(n);
  if (isNaN(v)) return '—';
  return v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModuloBadge({ modulo, label }) {
  const cls = MODULO_CLS[modulo] || 'bg-gray-100 text-gray-600 ring-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${cls}`}>
      {label}
    </span>
  );
}

function FilasLineas({ lineas, cargando }) {
  if (cargando) {
    return (
      <tr>
        <td colSpan={8} className="px-6 py-3 bg-[#f0f7f4] text-[12px] text-[#6b8f8f] italic border-b border-[#e8f0ed]">
          Cargando líneas contables…
        </td>
      </tr>
    );
  }
  if (!lineas?.length) {
    return (
      <tr>
        <td colSpan={8} className="px-6 py-3 bg-[#f0f7f4] text-[12px] text-[#6b8f8f] italic border-b border-[#e8f0ed]">
          Este asiento no tiene líneas registradas.
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td colSpan={8} className="px-4 pb-3 pt-0 bg-[#f5faf7] border-b border-[#e8f0ed]">
        <div className="rounded-lg overflow-hidden border border-[#c8ddd6]">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#e2f0ea]">
                <th className="px-3 py-2 text-left font-semibold text-[#1a4731] w-24">Código</th>
                <th className="px-3 py-2 text-left font-semibold text-[#1a4731]">Cuenta</th>
                <th className="px-3 py-2 text-left font-semibold text-[#1a4731]">Descripción</th>
                <th className="px-3 py-2 text-right font-semibold text-[#1a4731] w-32">Débito</th>
                <th className="px-3 py-2 text-right font-semibold text-[#1a4731] w-32">Crédito</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr
                  key={l.id}
                  className={`border-t border-[#d8ece3] ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafcfb]'} hover:bg-[#f0f7f4]`}
                >
                  <td className="px-3 py-1.5 font-mono text-[11px] text-[#1a4731]">{l.cuenta_codigo}</td>
                  <td className="px-3 py-1.5 text-[#1a2e2e]">{l.cuenta_nombre}</td>
                  <td className="px-3 py-1.5 text-[#6b8f8f]">{l.descripcion || '—'}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-[#1a4731]">
                    {parseFloat(l.debe) > 0 ? fmt(l.debe) : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-[#6b4731]">
                    {parseFloat(l.haber) > 0 ? fmt(l.haber) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VisorAsientosAutomaticos() {
  const [asientos, setAsientos]   = useState([]);
  const [cargando, setCargando]   = useState(false);
  const [error, setError]         = useState(null);

  // Filter form state
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [modulo, setModulo]         = useState('');
  const [busqueda, setBusqueda]     = useState('');

  // Expandable rows
  const [expandidos, setExpandidos]         = useState(new Set());
  const [lineasCache, setLineasCache]       = useState({});
  const [cargandoLineas, setCargandoLineas] = useState({});

  const cargar = useCallback(async (params = {}) => {
    setCargando(true);
    setError(null);
    try {
      const data = await getAsientosAutomaticos(params);
      setAsientos(Array.isArray(data) ? data : []);
      setExpandidos(new Set());
      setLineasCache({});
    } catch (e) {
      setError(e.message || 'Error al cargar los asientos automáticos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function buscar() {
    const params = {};
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    if (modulo)     params.modulo      = modulo;
    cargar(params);
  }

  function limpiar() {
    setFechaDesde('');
    setFechaHasta('');
    setModulo('');
    setBusqueda('');
    cargar();
  }

  const filtrado = useMemo(() => {
    if (!busqueda.trim()) return asientos;
    const q = busqueda.toLowerCase();
    return asientos.filter((a) =>
      a.numero_asiento.toLowerCase().includes(q) ||
      a.descripcion.toLowerCase().includes(q) ||
      a.documento_origen.toLowerCase().includes(q) ||
      a.generado_por.toLowerCase().includes(q)
    );
  }, [asientos, busqueda]);

  async function toggleRow(id) {
    const next = new Set(expandidos);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      if (!(id in lineasCache)) {
        setCargandoLineas((prev) => ({ ...prev, [id]: true }));
        try {
          const det = await getAsientoAutomaticoDetalle(id);
          setLineasCache((prev) => ({ ...prev, [id]: det.lineas || [] }));
        } catch {
          setLineasCache((prev) => ({ ...prev, [id]: [] }));
        } finally {
          setCargandoLineas((prev) => ({ ...prev, [id]: false }));
        }
      }
    }
    setExpandidos(next);
  }

  function exportarCSV() {
    const cols = [
      'Nro. Asiento', 'Fecha', 'Módulo', 'Doc. Origen',
      'Descripción', 'Monto Total', 'Generado por',
    ];
    const rows = filtrado.map((a) => [
      a.numero_asiento,
      a.fecha,
      a.modulo_display,
      a.documento_origen,
      a.descripcion,
      a.total_monto,
      a.generado_por,
    ]);
    const csv = [cols, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = `asientos_automaticos_${new Date().toISOString().slice(0, 10)}.csv`;
    el.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-[#f5f8f8]">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 max-w-[1400px] mx-auto space-y-4">

          <PageHeader
            title="Asientos Automáticos"
            subtitle="Registro contable generado por los módulos del sistema — solo lectura"
          />

          {/* Filtros */}
          <ContentCard>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <Field label="Desde">
                <FieldInput
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </Field>
              <Field label="Hasta">
                <FieldInput
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </Field>
              <Field label="Módulo origen">
                <FieldSelect value={modulo} onChange={(e) => setModulo(e.target.value)}>
                  <option value="">Todos los módulos</option>
                  {MODULOS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </FieldSelect>
              </Field>
              <div className="flex gap-2">
                <BtnPrimary onClick={buscar} className="flex-1">
                  <Search className="w-4 h-4" />
                  Buscar
                </BtnPrimary>
                <BtnGhost onClick={limpiar} title="Limpiar filtros">
                  <X className="w-4 h-4" />
                </BtnGhost>
              </div>
            </div>
          </ContentCard>

          {/* Tabla de asientos */}
          <ContentCard>
            <CardHeader>
              <CardTitle>
                Asientos
                {filtrado.length > 0 && (
                  <span className="ml-2 text-[12px] font-normal text-[#6b8f8f]">
                    {filtrado.length} {filtrado.length === 1 ? 'registro' : 'registros'}
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b8f8f] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar en resultados…"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-[12px] rounded-md border border-[#c8ddd6] bg-white focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]/30 w-48 placeholder:text-[#9db8b2]"
                  />
                </div>
                <BtnSecondary onClick={exportarCSV} disabled={filtrado.length === 0}>
                  <Download className="w-4 h-4" />
                  Exportar Excel
                </BtnSecondary>
              </div>
            </CardHeader>

            {error && (
              <div className="px-4 pb-3">
                <AlertError>{error}</AlertError>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <THead>
                  <Th className="w-8" />
                  <Th>Nro. Asiento</Th>
                  <Th>Fecha</Th>
                  <Th>Módulo</Th>
                  <Th>Doc. Origen</Th>
                  <Th>Descripción</Th>
                  <Th className="text-right">Monto Total</Th>
                  <Th>Generado por</Th>
                </THead>
                <TBody>
                  {cargando ? (
                    <LoadingRows cols={8} />
                  ) : filtrado.length === 0 ? (
                    <EmptyRow
                      cols={8}
                      message={
                        asientos.length === 0
                          ? 'No hay asientos automáticos registrados. Se generarán automáticamente cuando los módulos realicen operaciones contables.'
                          : 'Sin resultados para los filtros aplicados.'
                      }
                    />
                  ) : (
                    filtrado.map((a) => {
                      const expandido = expandidos.has(a.id);
                      return (
                        <Fragment key={a.id}>
                          <tr
                            onClick={() => toggleRow(a.id)}
                            className={`cursor-pointer transition-colors border-b border-[#e8f0ed] ${
                              expandido
                                ? 'bg-[#edf7f2]'
                                : 'hover:bg-[#f5faf7]'
                            }`}
                          >
                            <Td>
                              <ChevronRight
                                className={`w-4 h-4 text-[#6b8f8f] transition-transform duration-150 ${
                                  expandido ? 'rotate-90 text-[#1a7a4a]' : ''
                                }`}
                              />
                            </Td>
                            <Td>
                              <span className="font-mono text-[12px] text-[#1a4731] font-semibold tracking-wide">
                                {a.numero_asiento}
                              </span>
                            </Td>
                            <Td className="whitespace-nowrap">{a.fecha}</Td>
                            <Td>
                              <ModuloBadge modulo={a.modulo_origen} label={a.modulo_display} />
                            </Td>
                            <Td className="font-mono text-[12px] text-[#1a4731]">
                              {a.documento_origen}
                            </Td>
                            <Td>
                              <span
                                className="block max-w-[260px] truncate"
                                title={a.descripcion}
                              >
                                {a.descripcion}
                              </span>
                            </Td>
                            <Td className="text-right font-mono font-semibold text-[#1a2e2e] whitespace-nowrap">
                              {fmt(a.total_monto)}
                            </Td>
                            <Td className="text-[#6b8f8f] text-[12px]">{a.generado_por}</Td>
                          </tr>
                          {expandido && (
                            <FilasLineas
                              lineas={lineasCache[a.id]}
                              cargando={!!cargandoLineas[a.id]}
                            />
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </TBody>
              </table>
            </div>
          </ContentCard>

        </div>
      </div>
    </main>
  );
}
