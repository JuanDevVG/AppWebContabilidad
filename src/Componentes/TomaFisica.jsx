import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, ChevronLeft, ClipboardList, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import {
  getTomaFisicaSheet, aplicarTomaFisica,
  getGalpones, getCategoriasCatalogo,
} from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, BtnGhost,
  AlertError, AlertSuccess,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
} from '../ui/index.jsx';

function fmt(n, decimals = 2) {
  return Number(n).toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function DiffCell({ diff }) {
  if (diff === 0) return <span className="text-[#aebfbf] text-[13px]">&mdash;</span>;
  if (diff > 0) {
    return (
      <span className="text-emerald-600 font-semibold text-[13px]">
        +{fmt(diff)}
      </span>
    );
  }
  return <span className="text-red-600 font-semibold text-[13px]">{fmt(diff)}</span>;
}

const PASO_LABELS = ['Configuración', 'Conteo', 'Resumen'];

function StepBar({ paso }) {
  return (
    <div className="flex items-center px-6 py-3.5 border-b border-[#e4ecec] bg-[#fafcfc]">
      {PASO_LABELS.map((label, i) => {
        const num = i + 1;
        const done = num < paso;
        const active = num === paso;
        return (
          <div key={num} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors ${
                  done
                    ? 'bg-[#012d1d] text-white'
                    : active
                    ? 'bg-[#012d1d] text-white ring-2 ring-[#012d1d]/20 ring-offset-1'
                    : 'bg-[#e4ecec] text-[#6b8f8f]'
                }`}
              >
                {done ? '✓' : num}
              </div>
              <span
                className={`text-[13px] font-medium whitespace-nowrap ${
                  active ? 'text-[#1a2e2e]' : done ? 'text-[#6b8f8f]' : 'text-[#aebfbf]'
                }`}
              >
                {label}
              </span>
            </div>
            {i < PASO_LABELS.length - 1 && (
              <div className="mx-4 h-px w-8 bg-[#e4ecec] flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TomaFisica() {
  const [paso, setPaso] = useState(1);
  const [config, setConfig] = useState({
    fecha: new Date().toISOString().split('T')[0],
    galpon_nombre: '',
    responsable: '',
    observaciones: '',
  });
  const [galpones, setGalpones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [sheet, setSheet] = useState([]);
  const [conteos, setConteos] = useState({});
  const [cargando, setCargando] = useState(false);
  const [errorGen, setErrorGen] = useState('');
  const [aplicando, setAplicando] = useState(false);
  const [errorAplicar, setErrorAplicar] = useState('');
  const [resultado, setResultado] = useState(null);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [soloDiffs, setSoloDiffs] = useState(false);

  useEffect(() => {
    getGalpones()
      .then((res) => setGalpones((res.results ?? res).filter((g) => g.activo)))
      .catch((_err) => {});
    getCategoriasCatalogo()
      .then((res) => setCategorias((res.results ?? res).filter((c) => c.activo)))
      .catch((_err) => {});
  }, []);

  // Rows enriquecidos con diferencia y valor calculados
  const rows = useMemo(() => {
    return sheet.map((item) => {
      const c = conteos[item.id] ?? {};
      const cantidadContada =
        c.cantidad_contada !== undefined ? Number(c.cantidad_contada) : Number(item.stock_sistema);
      const costoUnitario = Number(item.costo_promedio);
      const diferencia = cantidadContada - Number(item.stock_sistema);
      return { ...item, cantidadContada, costoUnitario, diferencia, valorDiff: diferencia * costoUnitario };
    });
  }, [sheet, conteos]);

  const rowsFiltrados = useMemo(() => {
    let items = rows;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) => i.nombre.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q),
      );
    }
    if (filtroCategoria) {
      items = items.filter((i) => String(i.categoria_id) === filtroCategoria);
    }
    if (soloDiffs) {
      items = items.filter((i) => i.diferencia !== 0);
    }
    return items;
  }, [rows, search, filtroCategoria, soloDiffs]);

  const conDiferencia = useMemo(() => rows.filter((r) => r.diferencia !== 0), [rows]);
  const sobrantes = useMemo(() => conDiferencia.filter((r) => r.diferencia > 0), [conDiferencia]);
  const faltantes = useMemo(() => conDiferencia.filter((r) => r.diferencia < 0), [conDiferencia]);
  const valorSobrantes = useMemo(
    () => sobrantes.reduce((s, r) => s + r.valorDiff, 0),
    [sobrantes],
  );
  const valorFaltantes = useMemo(
    () => faltantes.reduce((s, r) => s + r.valorDiff, 0),
    [faltantes],
  );
  const impactoNeto = valorSobrantes + valorFaltantes;

  async function generarPlanilla() {
    if (!config.fecha) return;
    setCargando(true);
    setErrorGen('');
    try {
      const res = await getTomaFisicaSheet();
      setSheet(res.items);
      const init = {};
      for (const item of res.items) {
        init[item.id] = { cantidad_contada: item.stock_sistema };
      }
      setConteos(init);
      setPaso(2);
    } catch (err) {
      setErrorGen(err.message || 'Error al generar la planilla');
    } finally {
      setCargando(false);
    }
  }

  function handleConteo(id, value) {
    setConteos((prev) => ({ ...prev, [id]: { cantidad_contada: value } }));
  }

  async function aplicarAjustes() {
    setAplicando(true);
    setErrorAplicar('');
    try {
      const res = await aplicarTomaFisica({
        fecha: config.fecha,
        responsable: config.responsable,
        galpon: config.galpon_nombre,
        observaciones: config.observaciones,
        ajustes: conDiferencia.map((r) => ({
          producto_id: r.id,
          cantidad_sistema: r.stock_sistema,
          cantidad_contada: String(r.cantidadContada),
          costo_unitario: r.costo_promedio,
        })),
      });
      setResultado(res);
    } catch (err) {
      setErrorAplicar(err.message || 'Error al aplicar ajustes');
    } finally {
      setAplicando(false);
    }
  }

  function reiniciar() {
    setPaso(1);
    setSheet([]);
    setConteos({});
    setResultado(null);
    setErrorAplicar('');
    setSearch('');
    setFiltroCategoria('');
    setSoloDiffs(false);
    setConfig({
      fecha: new Date().toISOString().split('T')[0],
      galpon_nombre: '',
      responsable: '',
      observaciones: '',
    });
  }

  // ── Paso 1: Configuración ───────────────────────────────────────────────────
  function renderPaso1() {
    return (
      <div className="px-6 py-5 max-w-lg">
        {errorGen && <AlertError onRetry={undefined}>{errorGen}</AlertError>}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                Fecha del conteo <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={config.fecha}
                onChange={(e) => setConfig((p) => ({ ...p, fecha: e.target.value }))}
                className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
                Galpón / Ubicación
              </label>
              <select
                value={config.galpon_nombre}
                onChange={(e) => setConfig((p) => ({ ...p, galpon_nombre: e.target.value }))}
                className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
              >
                <option value="">Todos / General</option>
                {galpones.map((g) => (
                  <option key={g.id} value={g.nombre}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
              Responsable del conteo
            </label>
            <input
              type="text"
              placeholder="Nombre de quien realiza el conteo"
              value={config.responsable}
              onChange={(e) => setConfig((p) => ({ ...p, responsable: e.target.value }))}
              className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">
              Observaciones
            </label>
            <textarea
              placeholder="Notas adicionales (opcional)"
              rows={2}
              value={config.observaciones}
              onChange={(e) => setConfig((p) => ({ ...p, observaciones: e.target.value }))}
              className="w-full px-3 py-[7px] bg-white border border-[#dde8e8] rounded-md text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#f0f5f5] flex justify-end">
          <BtnPrimary onClick={generarPlanilla} loading={cargando} disabled={!config.fecha}>
            Generar planilla
            {!cargando && <ChevronRight className="w-3.5 h-3.5" />}
          </BtnPrimary>
        </div>
      </div>
    );
  }

  // ── Paso 2: Conteo ─────────────────────────────────────────────────────────
  function renderPaso2() {
    const diffsEncontradas = rows.filter((r) => r.diferencia !== 0).length;

    return (
      <>
        {/* Filtros */}
        <div className="px-4 py-3 border-b border-[#e4ecec] flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-[#dde8e8] rounded-md pl-8 pr-3 py-[7px] text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
            />
          </div>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-[13px] text-[#6b8f8f] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soloDiffs}
              onChange={(e) => setSoloDiffs(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#012d1d]"
            />
            Solo diferencias
          </label>

          {diffsEncontradas > 0 && (
            <span className="ml-auto text-[12px] text-amber-600 font-semibold">
              {diffsEncontradas} diferencia{diffsEncontradas !== 1 ? 's' : ''} detectada{diffsEncontradas !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <THead>
              <Th>Producto</Th>
              <Th>Categoría</Th>
              <Th center>Unidad</Th>
              <Th right>Qty Sistema</Th>
              <Th right>Qty Contada</Th>
              <Th right>Diferencia</Th>
              <Th right>Costo Unit.</Th>
              <Th right>Valor Dif.</Th>
            </THead>
            <TBody>
              {rowsFiltrados.length === 0 && (
                <EmptyRow
                  icon={ClipboardList}
                  title={search || filtroCategoria || soloDiffs ? 'Sin resultados' : 'Sin productos'}
                  cols={8}
                />
              )}

              {rowsFiltrados.map((item) => {
                const hasDiff = item.diferencia !== 0;
                const isPositive = item.diferencia > 0;
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      hasDiff
                        ? isPositive
                          ? 'bg-emerald-50/40 hover:bg-emerald-50 border-l-2 border-emerald-400'
                          : 'bg-red-50/40 hover:bg-red-50 border-l-2 border-red-400'
                        : 'hover:bg-[#fafcfc]'
                    }`}
                  >
                    <Td>
                      <p className="font-medium text-[#1a2e2e] leading-tight">{item.nombre}</p>
                      <p className="text-[11px] font-mono text-[#6b8f8f] mt-0.5">{item.codigo}</p>
                    </Td>
                    <Td muted>{item.categoria}</Td>
                    <Td center muted>{item.unidad}</Td>
                    <Td right muted className="font-mono text-[12px]">
                      {fmt(item.stock_sistema)}
                    </Td>
                    <td className="px-4 py-1.5 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={conteos[item.id]?.cantidad_contada ?? item.stock_sistema}
                        onChange={(e) => handleConteo(item.id, e.target.value)}
                        className={`w-24 text-right px-2 py-1 text-[13px] font-medium rounded border transition-colors focus:outline-none focus:ring-1 ${
                          hasDiff
                            ? isPositive
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-800 focus:border-emerald-500 focus:ring-emerald-300/30'
                              : 'border-red-400 bg-red-50 text-red-800 focus:border-red-500 focus:ring-red-300/30'
                            : 'border-[#dde8e8] bg-white text-[#1a2e2e] focus:border-[#012d1d] focus:ring-[#012d1d]/10'
                        }`}
                      />
                    </td>
                    <Td right>
                      <DiffCell diff={item.diferencia} />
                    </Td>
                    <Td right muted className="font-mono text-[12px]">
                      ${fmt(item.costoUnitario, 0)}
                    </Td>
                    <Td right>
                      {item.diferencia !== 0 ? (
                        <span
                          className={`text-[13px] font-semibold ${
                            item.valorDiff > 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {item.valorDiff > 0 ? '+' : ''}${fmt(item.valorDiff, 0)}
                        </span>
                      ) : (
                        <span className="text-[#aebfbf] text-[13px]">&mdash;</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </TBody>
          </table>
        </div>

        {/* Pie */}
        <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
          {rowsFiltrados.length} de {rows.length} productos
          {(search || filtroCategoria || soloDiffs) ? ' (filtrado)' : ''}
        </div>

        {/* Navegación */}
        <div className="px-4 py-3 border-t border-[#e4ecec] flex items-center justify-between">
          <BtnGhost onClick={() => setPaso(1)}>
            <ChevronLeft className="w-3.5 h-3.5" />
            Configuración
          </BtnGhost>
          <BtnPrimary onClick={() => setPaso(3)}>
            Ver resumen
            <ChevronRight className="w-3.5 h-3.5" />
          </BtnPrimary>
        </div>
      </>
    );
  }

  // ── Paso 3: Resumen / Aplicar ───────────────────────────────────────────────
  function renderPaso3() {
    if (resultado) {
      return (
        <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-600 text-[26px]">check_circle</span>
          </div>
          <p className="text-[15px] font-semibold text-[#1a2e2e]">Ajustes aplicados correctamente</p>
          <p className="text-[13px] text-[#6b8f8f]">
            Se registraron <strong>{resultado.ajustados}</strong> movimiento
            {resultado.ajustados !== 1 ? 's' : ''} de ajuste con el documento{' '}
            <strong className="font-mono">{resultado.numero_documento}</strong>.
          </p>
          {resultado.errores?.length > 0 && (
            <AlertError>{resultado.errores.join(' | ')}</AlertError>
          )}
          <div className="mt-2">
            <BtnSecondary onClick={reiniciar}>
              <RotateCcw className="w-3.5 h-3.5" />
              Nueva toma física
            </BtnSecondary>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-[#e4ecec] bg-[#fafcfc]">
          <div className="bg-white border border-[#e4ecec] rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">
              Productos
            </p>
            <p className="text-[18px] font-bold text-[#1a2e2e] mt-0.5">{sheet.length}</p>
            <p className="text-[11px] text-[#aebfbf] mt-0.5">{conDiferencia.length} con diferencia</p>
          </div>

          <div
            className={`border rounded-lg px-3 py-2.5 ${
              sobrantes.length > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-[#e4ecec]'
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className={`w-3.5 h-3.5 ${sobrantes.length > 0 ? 'text-emerald-600' : 'text-[#aebfbf]'}`} />
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${sobrantes.length > 0 ? 'text-emerald-600' : 'text-[#6b8f8f]'}`}>
                Sobrantes
              </p>
            </div>
            <p className={`text-[18px] font-bold mt-0.5 ${sobrantes.length > 0 ? 'text-emerald-700' : 'text-[#aebfbf]'}`}>
              {sobrantes.length}
            </p>
            {sobrantes.length > 0 && (
              <p className="text-[11px] text-emerald-600 mt-0.5">+${fmt(valorSobrantes, 0)}</p>
            )}
          </div>

          <div
            className={`border rounded-lg px-3 py-2.5 ${
              faltantes.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#e4ecec]'
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingDown className={`w-3.5 h-3.5 ${faltantes.length > 0 ? 'text-red-600' : 'text-[#aebfbf]'}`} />
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${faltantes.length > 0 ? 'text-red-600' : 'text-[#6b8f8f]'}`}>
                Faltantes
              </p>
            </div>
            <p className={`text-[18px] font-bold mt-0.5 ${faltantes.length > 0 ? 'text-red-700' : 'text-[#aebfbf]'}`}>
              {faltantes.length}
            </p>
            {faltantes.length > 0 && (
              <p className="text-[11px] text-red-600 mt-0.5">${fmt(valorFaltantes, 0)}</p>
            )}
          </div>

          <div className="bg-white border border-[#e4ecec] rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide">
              Impacto neto
            </p>
            <p
              className={`text-[18px] font-bold mt-0.5 ${
                impactoNeto > 0 ? 'text-emerald-700' : impactoNeto < 0 ? 'text-red-700' : 'text-[#aebfbf]'
              }`}
            >
              {impactoNeto > 0 ? '+' : ''}${fmt(impactoNeto, 0)}
            </p>
          </div>
        </div>

        {/* Tabla de discrepancias */}
        {conDiferencia.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <span className="material-symbols-outlined text-[32px] text-emerald-300 block mb-2">
              check_circle
            </span>
            <p className="text-[14px] font-semibold text-[#1a2e2e]">Sin discrepancias</p>
            <p className="text-[13px] text-[#6b8f8f] mt-1">
              El inventario físico coincide con el sistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <THead>
                <Th>Producto</Th>
                <Th center>Unidad</Th>
                <Th right>Qty Sistema</Th>
                <Th right>Qty Contada</Th>
                <Th right>Diferencia</Th>
                <Th right>Costo Unit.</Th>
                <Th right>Valor Ajuste</Th>
                <Th center>Tipo</Th>
              </THead>
              <TBody>
                {conDiferencia.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.diferencia > 0
                        ? 'bg-emerald-50/50 hover:bg-emerald-50'
                        : 'bg-red-50/50 hover:bg-red-50'
                    }`}
                  >
                    <Td>
                      <p className="font-medium text-[#1a2e2e] leading-tight">{item.nombre}</p>
                      <p className="text-[11px] font-mono text-[#6b8f8f] mt-0.5">{item.codigo}</p>
                    </Td>
                    <Td center muted>{item.unidad}</Td>
                    <Td right muted className="font-mono text-[12px]">{fmt(item.stock_sistema)}</Td>
                    <Td right className="font-mono text-[12px]">{fmt(item.cantidadContada)}</Td>
                    <Td right>
                      <DiffCell diff={item.diferencia} />
                    </Td>
                    <Td right muted className="font-mono text-[12px]">${fmt(item.costoUnitario, 0)}</Td>
                    <Td right>
                      <span
                        className={`text-[13px] font-semibold ${
                          item.valorDiff > 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {item.valorDiff > 0 ? '+' : ''}${fmt(item.valorDiff, 0)}
                      </span>
                    </Td>
                    <Td center>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          item.diferencia > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {item.diferencia > 0 ? 'AJ. POSITIVO' : 'AJ. NEGATIVO'}
                      </span>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </table>
          </div>
        )}

        {errorAplicar && (
          <div className="px-4 pt-0 pb-3">
            <AlertError>{errorAplicar}</AlertError>
          </div>
        )}

        {/* Navegación */}
        <div className="px-4 py-3 border-t border-[#e4ecec] flex items-center justify-between">
          <BtnGhost onClick={() => setPaso(2)}>
            <ChevronLeft className="w-3.5 h-3.5" />
            Modificar conteo
          </BtnGhost>

          {conDiferencia.length > 0 && (
            <div className="flex items-center gap-3">
              <p className="text-[12px] text-[#6b8f8f] max-w-xs text-right hidden sm:block">
                Se crearán{' '}
                <strong>{conDiferencia.length}</strong> movimiento
                {conDiferencia.length !== 1 ? 's' : ''} de ajuste permanentes.
              </p>
              <BtnPrimary onClick={aplicarAjustes} loading={aplicando}>
                Aplicar ajustes
              </BtnPrimary>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <PageHeader
          title="Toma Física de Inventario"
          subtitle="Compara el stock del sistema con el conteo real y aplica ajustes"
        />

        <ContentCard>
          <StepBar paso={paso} />
          {paso === 1 && renderPaso1()}
          {paso === 2 && renderPaso2()}
          {paso === 3 && renderPaso3()}
        </ContentCard>
      </div>
    </main>
  );
}

export default TomaFisica;
