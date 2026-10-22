import { useState, useEffect, useMemo } from 'react';
import { Download, Package, Search } from 'lucide-react';
import { getExistencias, getCategoriasCatalogo } from '../utils/apiService';
import {
  BtnSecondary, Badge,
  AlertError, PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
} from '../ui/index.jsx';

function fmt(n, decimals = 2) {
  return Number(n).toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const ESTADO_LABEL = { OK: 'OK', BAJO: 'Stock Bajo', CRITICO: 'Crítico' };

const ROW_CLS = {
  OK:      'hover:bg-[#fafcfc]',
  BAJO:    'bg-amber-50 hover:bg-amber-100',
  CRITICO: 'bg-red-50 hover:bg-red-100',
};

const STOCK_COLOR = {
  OK:      'text-[#1a2e2e]',
  BAJO:    'text-amber-700',
  CRITICO: 'text-red-700',
};

function exportarCSV(items) {
  const BOM = '﻿';
  const sep = ';';
  const headers = [
    'Código', 'Producto', 'Categoría', 'Unidad',
    'Stock Actual', 'Stock Mínimo', 'Costo Promedio', 'Valor Stock', 'Estado',
  ];
  const filas = items.map((i) => [
    i.codigo, i.nombre, i.categoria, i.unidad,
    i.stock_actual, i.stock_minimo, i.costo_promedio, i.valor_stock,
    ESTADO_LABEL[i.estado],
  ]);
  const csv = [headers, ...filas]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(sep))
    .join('\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `existencias_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExistenciasActuales() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [categorias, setCategorias] = useState([]);

  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  useEffect(() => {
    cargar();
    getCategoriasCatalogo()
      .then((res) => setCategorias((res.results ?? res).filter((c) => c.activo)))
      .catch((_err) => {});
  }, []);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const res = await getExistencias();
      setData(res);
    } catch (err) {
      setError(err.message || 'Error al cargar existencias');
    } finally {
      setCargando(false);
    }
  }

  const itemsFiltrados = useMemo(() => {
    if (!data) return [];
    let items = data.items;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) => i.nombre.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q),
      );
    }
    if (filtroCategoria) {
      items = items.filter((i) => String(i.categoria_id) === filtroCategoria);
    }
    if (filtroEstado) {
      items = items.filter((i) => i.estado === filtroEstado);
    }
    return items;
  }, [data, search, filtroCategoria, filtroEstado]);

  const hayFiltros = search || filtroCategoria || filtroEstado;

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

        <PageHeader
          title="Existencias Actuales"
          subtitle="Saldo actual de productos e insumos en inventario"
        >
          {data && !cargando && (
            <BtnSecondary onClick={() => exportarCSV(itemsFiltrados)}>
              <Download className="w-3.5 h-3.5" />
              Exportar Excel
            </BtnSecondary>
          )}
        </PageHeader>

        {/* Tarjetas de resumen */}
        {data && !cargando && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white border border-[#e4ecec] rounded-lg px-4 py-3">
              <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wide">
                Total Productos
              </p>
              <p className="text-[22px] font-bold text-[#1a2e2e] mt-1 leading-tight">
                {data.resumen.total_productos}
              </p>
            </div>

            <div
              className={`border rounded-lg px-4 py-3 ${
                data.resumen.criticos > 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-[#e4ecec]'
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  data.resumen.criticos > 0 ? 'text-red-600' : 'text-[#6b8f8f]'
                }`}
              >
                Stock Crítico
              </p>
              <p
                className={`text-[22px] font-bold mt-1 leading-tight ${
                  data.resumen.criticos > 0 ? 'text-red-700' : 'text-[#aebfbf]'
                }`}
              >
                {data.resumen.criticos}
              </p>
            </div>

            <div
              className={`border rounded-lg px-4 py-3 ${
                data.resumen.bajos > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-white border-[#e4ecec]'
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  data.resumen.bajos > 0 ? 'text-amber-600' : 'text-[#6b8f8f]'
                }`}
              >
                Stock Bajo
              </p>
              <p
                className={`text-[22px] font-bold mt-1 leading-tight ${
                  data.resumen.bajos > 0 ? 'text-amber-700' : 'text-[#aebfbf]'
                }`}
              >
                {data.resumen.bajos}
              </p>
            </div>

            <div className="bg-white border border-[#e4ecec] rounded-lg px-4 py-3">
              <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wide">
                Valor Inventario
              </p>
              <p className="text-[18px] font-bold text-[#1a2e2e] mt-1 leading-tight">
                ${fmt(data.resumen.valor_total, 0)}
              </p>
            </div>
          </div>
        )}

        {error && <AlertError onRetry={cargar}>{error}</AlertError>}

        <ContentCard>
          {/* Barra de filtros */}
          <div className="px-4 py-3 border-b border-[#e4ecec] flex flex-wrap gap-2 items-center">
            {/* Buscador */}
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

            {/* Categoría */}
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            {/* Estado */}
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-white border border-[#dde8e8] rounded-md px-3 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
            >
              <option value="">Todos los estados</option>
              <option value="OK">Solo OK</option>
              <option value="BAJO">Solo Stock Bajo</option>
              <option value="CRITICO">Solo Crítico</option>
            </select>

            {/* Galpón — pendiente de implementar en modelo */}
            <select
              disabled
              title="Filtro por galpón disponible próximamente"
              className="bg-[#f5f8f8] border border-[#dde8e8] rounded-md px-3 py-[7px] text-[13px] text-[#aebfbf] cursor-not-allowed"
            >
              <option>Todos los galpones</option>
            </select>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <THead>
                <Th>Producto</Th>
                <Th>Categoría</Th>
                <Th center>Unidad</Th>
                <Th right>Stock Actual</Th>
                <Th right>Stock Mínimo</Th>
                <Th right>Valor Stock</Th>
                <Th center>Estado</Th>
              </THead>
              <TBody>
                {cargando && <LoadingRows cols={7} rows={6} />}

                {!cargando && !error && itemsFiltrados.length === 0 && (
                  <EmptyRow
                    icon={Package}
                    title={hayFiltros ? 'Sin resultados para los filtros aplicados' : 'Sin productos activos'}
                    subtitle={
                      hayFiltros
                        ? 'Prueba ajustando la búsqueda o los filtros'
                        : 'Registra productos en Catálogo Maestro para ver sus existencias'
                    }
                    cols={7}
                  />
                )}

                {!cargando &&
                  itemsFiltrados.map((item) => (
                    <tr key={item.id} className={`transition-colors ${ROW_CLS[item.estado]}`}>
                      <Td>
                        <p className="font-medium text-[#1a2e2e] leading-tight">{item.nombre}</p>
                        <p className="text-[11px] font-mono text-[#6b8f8f] mt-0.5">{item.codigo}</p>
                      </Td>
                      <Td muted>{item.categoria}</Td>
                      <Td center muted>{item.unidad}</Td>
                      <Td right>
                        <span className={`font-bold text-[14px] ${STOCK_COLOR[item.estado]}`}>
                          {fmt(item.stock_actual)}
                        </span>
                      </Td>
                      <Td right muted className="text-[12px]">
                        {fmt(item.stock_minimo)}
                      </Td>
                      <Td right className="font-medium text-[13px]">
                        ${fmt(item.valor_stock, 0)}
                      </Td>
                      <Td center>
                        <Badge variant={item.badge_variant} dot>
                          {ESTADO_LABEL[item.estado]}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
              </TBody>
            </table>
          </div>

          {/* Pie de tabla */}
          {!cargando && data && (
            <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
              {itemsFiltrados.length} de {data.resumen.total_productos} productos
              {hayFiltros ? ' (filtrado)' : ''}
              {data.resumen.alertas > 0 && !hayFiltros && (
                <span className="ml-3 text-amber-600 font-medium">
                  &bull; {data.resumen.alertas} con alertas de stock
                </span>
              )}
            </div>
          )}
        </ContentCard>
      </div>
    </main>
  );
}

export default ExistenciasActuales;
