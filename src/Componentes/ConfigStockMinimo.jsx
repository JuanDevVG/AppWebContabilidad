import { useState, useEffect, useMemo } from 'react';
import { Search, Save, RotateCcw, Settings2 } from 'lucide-react';
import { getStockMinimo, bulkUpdateStockMinimo, getCategoriasCatalogo } from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, AlertError, AlertSuccess,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
} from '../ui/index.jsx';

export function ConfigStockMinimo() {
  const [rows, setRows] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [edits, setEdits] = useState({});
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  useEffect(() => {
    cargar();
    getCategoriasCatalogo()
      .then((res) => setCategorias((res.results ?? res).filter((c) => c.activo)))
      .catch((_err) => {});
  }, []);

  async function cargar() {
    setCargando(true);
    setError('');
    setSavedMsg('');
    try {
      const res = await getStockMinimo();
      setRows(res.items);
      setEdits({});
    } catch (err) {
      setError(err.message || 'Error al cargar productos');
    } finally {
      setCargando(false);
    }
  }

  const itemsFiltrados = useMemo(() => {
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
    return items;
  }, [rows, search, filtroCategoria]);

  const pendingEdits = useMemo(() => {
    const changed = {};
    for (const [id, val] of Object.entries(edits)) {
      const original = rows.find((r) => String(r.id) === id);
      if (original && val !== '' && Number(val) !== Number(original.stock_minimo)) {
        changed[id] = val;
      }
    }
    return changed;
  }, [edits, rows]);

  const pendingCount = Object.keys(pendingEdits).length;

  function handleEdit(id, value) {
    setEdits((prev) => ({ ...prev, [String(id)]: value }));
  }

  async function guardar() {
    if (pendingCount === 0) return;
    setGuardando(true);
    setSavedMsg('');
    setError('');
    try {
      const updates = Object.entries(pendingEdits).map(([id, val]) => ({
        id: Number(id),
        stock_minimo: val,
      }));
      const res = await bulkUpdateStockMinimo(updates);
      if (res.errores?.length > 0) {
        setError(`${res.errores.join(' | ')}`);
      }
      if (res.actualizados > 0) {
        setSavedMsg(
          `${res.actualizados} producto${res.actualizados !== 1 ? 's' : ''} actualizados correctamente.`,
        );
      }
      await cargar();
    } catch (err) {
      setError(err.message || 'Error al guardar cambios');
      setGuardando(false);
    }
  }

  function descartar() {
    setEdits({});
    setSavedMsg('');
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <PageHeader
          title="Configuración de Stock Mínimo"
          subtitle="Edita el umbral mínimo de cada producto directamente en la tabla"
        />

        {savedMsg && !error && <AlertSuccess>{savedMsg}</AlertSuccess>}
        {error && <AlertError onRetry={cargar}>{error}</AlertError>}

        <ContentCard>
          {/* Barra de filtros */}
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
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            {pendingCount > 0 && (
              <span className="text-[12px] text-amber-600 font-semibold ml-auto">
                {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} sin guardar
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
                <Th right>Stock Mínimo</Th>
              </THead>
              <TBody>
                {cargando && <LoadingRows cols={4} rows={8} />}

                {!cargando && itemsFiltrados.length === 0 && (
                  <EmptyRow
                    icon={Settings2}
                    title={
                      search || filtroCategoria
                        ? 'Sin resultados para los filtros aplicados'
                        : 'Sin productos activos'
                    }
                    subtitle={
                      search || filtroCategoria
                        ? 'Prueba ajustando la búsqueda o los filtros'
                        : 'Registra productos en Catálogo Maestro para configurar su stock mínimo'
                    }
                    cols={4}
                  />
                )}

                {!cargando &&
                  itemsFiltrados.map((item) => {
                    const key = String(item.id);
                    const isDirty = pendingEdits[key] !== undefined;
                    const currentVal = edits[key] ?? String(item.stock_minimo);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isDirty
                            ? 'border-l-2 border-amber-400 bg-amber-50/40 hover:bg-amber-50'
                            : 'hover:bg-[#fafcfc]'
                        }`}
                      >
                        <Td>
                          <p className="font-medium text-[#1a2e2e] leading-tight">{item.nombre}</p>
                          <p className="text-[11px] font-mono text-[#6b8f8f] mt-0.5">{item.codigo}</p>
                        </Td>
                        <Td muted>{item.categoria}</Td>
                        <Td center muted>{item.unidad}</Td>
                        <td className="px-4 py-2 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={currentVal}
                              onChange={(e) => handleEdit(item.id, e.target.value)}
                              className={`w-24 text-right px-2 py-1 text-[13px] font-medium rounded border transition-colors focus:outline-none focus:ring-1 ${
                                isDirty
                                  ? 'border-amber-400 bg-amber-50 text-amber-800 focus:border-amber-500 focus:ring-amber-300/30'
                                  : 'border-[#dde8e8] bg-white text-[#1a2e2e] focus:border-[#012d1d] focus:ring-[#012d1d]/10'
                              }`}
                            />
                            <span className="text-[11px] text-[#aebfbf] w-8 text-left">
                              {item.unidad}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </TBody>
            </table>
          </div>

          {/* Pie */}
          {!cargando && (
            <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
              {itemsFiltrados.length} de {rows.length} productos
              {search || filtroCategoria ? ' (filtrado)' : ''}
            </div>
          )}
        </ContentCard>
      </div>

      {/* Barra de guardado — aparece al haber cambios pendientes */}
      {pendingCount > 0 && (
        <div className="flex-shrink-0 border-t border-[#e4ecec] bg-white px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-[13px] text-[#6b8f8f]">
            <span className="font-semibold text-amber-600">{pendingCount}</span>{' '}
            cambio{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} sin guardar
          </p>
          <div className="flex gap-2">
            <BtnSecondary onClick={descartar} disabled={guardando}>
              <RotateCcw className="w-3.5 h-3.5" />
              Descartar
            </BtnSecondary>
            <BtnPrimary onClick={guardar} loading={guardando}>
              <Save className="w-3.5 h-3.5" />
              Guardar {pendingCount} cambio{pendingCount !== 1 ? 's' : ''}
            </BtnPrimary>
          </div>
        </div>
      )}
    </main>
  );
}

export default ConfigStockMinimo;
