import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, ChevronDown, Package } from 'lucide-react';
import {
  getCategoriasCatalogo, getUnidadesMedida,
  getProductos, createProducto, updateProducto,
} from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, Badge,
  Field, FieldInput, FieldSelect, FieldTextarea,
  AlertError, PageHeader, ContentCard,
  Th, Td, THead, TBody, EmptyRow, Spinner,
  Drawer, DrawerHeader, DrawerBody, DrawerFooter,
  Toggle,
} from '../ui/index.jsx';

const CAT_VARIANT = {
  Alimento:        'amber',
  Medicamento:     'sky',
  Vacuna:          'violet',
  Insumo:          'neutral',
  'Aves Iniciales': 'success',
};

const FORM_VACIO = {
  nombre: '', categoria: '', unidad_medida: '', naturaleza: 'INSUMO_GENERAL',
  presentacion: '', stock_minimo: '', descripcion: '', activo: true,
};

export function ProductosInsumos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga('');
    try {
      const [prods, cats, units] = await Promise.all([
        getProductos(), getCategoriasCatalogo(), getUnidadesMedida(),
      ]);
      setProductos(prods.results ?? prods);
      setCategorias(cats.results ?? cats);
      setUnidades(units.results ?? units);
    } catch (err) {
      setErrorCarga(err.message || 'Error al cargar los datos');
    } finally {
      setCargando(false);
    }
  }

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return productos.filter((p) => {
      const matchQ = !q || p.nombre.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q);
      const matchCat = !filtroCategoria || p.categoria === Number(filtroCategoria);
      return matchQ && matchCat;
    });
  }, [productos, busqueda, filtroCategoria]);

  function abrirCrear() {
    setEditandoId(null);
    setForm({ ...FORM_VACIO, categoria: categorias[0]?.id ?? '', unidad_medida: unidades[0]?.id ?? '' });
    setErrorForm('');
    setDrawerAbierto(true);
  }

  function abrirEditar(p) {
    setEditandoId(p.id);
    setForm({
      nombre: p.nombre, categoria: p.categoria, unidad_medida: p.unidad_medida,
      naturaleza: p.naturaleza ?? 'INSUMO_GENERAL',
      presentacion: p.presentacion ?? '', stock_minimo: p.stock_minimo,
      descripcion: p.descripcion ?? '', activo: p.activo,
    });
    setErrorForm('');
    setDrawerAbierto(true);
  }

  function cerrarDrawer() {
    setDrawerAbierto(false);
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErrorForm('');
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    try {
      const payload = {
        ...form,
        categoria: Number(form.categoria),
        unidad_medida: Number(form.unidad_medida),
        stock_minimo: Number(form.stock_minimo) || 0,
      };
      if (editandoId !== null) {
        const actualizado = await updateProducto(editandoId, payload);
        setProductos((prev) => prev.map((p) => p.id === editandoId ? actualizado : p));
      } else {
        const nuevo = await createProducto(payload);
        setProductos((prev) => [...prev, nuevo]);
      }
      cerrarDrawer();
    } catch (err) {
      setErrorForm(err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  function badgeCategoria(categoriaId) {
    const cat = categorias.find((c) => c.id === categoriaId);
    if (!cat) return { label: '—', variant: 'neutral' };
    return { label: cat.nombre, variant: CAT_VARIANT[cat.nombre] ?? 'neutral' };
  }

  function abreviaturaUnidad(unidadId) {
    return unidades.find((u) => u.id === unidadId)?.abreviatura ?? '—';
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

        <PageHeader
          title="Productos e Insumos"
          subtitle="Catálogo maestro de alimentos, medicamentos, vacunas e insumos"
        >
          <BtnPrimary onClick={abrirCrear} disabled={cargando}>
            <Plus className="w-3.5 h-3.5" />
            Agregar producto
          </BtnPrimary>
        </PageHeader>

        {errorCarga && <AlertError onRetry={cargarDatos}>{errorCarga}</AlertError>}

        {/* Toolbar de filtros */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf]" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white border border-[#dde8e8] rounded-md pl-9 pr-3 py-[7px] text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="bg-white border border-[#dde8e8] rounded-md pl-9 pr-8 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 appearance-none cursor-pointer min-w-[180px] transition-colors"
            >
              <option value="">Todas las categorías</option>
              {categorias.filter((c) => c.activo).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
          </div>
        </div>

        {/* Tabla */}
        <ContentCard>
          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-14 text-[#6b8f8f]">
              <Spinner size="md" className="text-[#6b8f8f]" />
              <span className="text-[13px]">Cargando productos...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <THead>
                    <Th>Código</Th>
                    <Th>Nombre</Th>
                    <Th>Categoría</Th>
                    <Th>Naturaleza</Th>
                    <Th>Unidad</Th>
                    <Th>Presentación</Th>
                    <Th>Estado</Th>
                    <Th />
                  </THead>
                  <TBody>
                    {productosFiltrados.length === 0 ? (
                      <EmptyRow icon={Package} title="No se encontraron productos" cols={8} />
                    ) : (
                      productosFiltrados.map((p) => {
                        const cat = badgeCategoria(p.categoria);
                        return (
                          <tr key={p.id} className="hover:bg-[#fafcfc] transition-colors group">
                            <Td mono muted className="text-[12px]">{p.codigo}</Td>
                            <Td className="font-medium">{p.nombre}</Td>
                            <Td>
                              <Badge variant={cat.variant}>{cat.label}</Badge>
                            </Td>
                            <Td>
                              {p.naturaleza === 'AVE_INICIAL'
                                ? <Badge variant="amber">Ave Inicial</Badge>
                                : <Badge variant="neutral">Insumo</Badge>}
                            </Td>
                            <Td muted>{abreviaturaUnidad(p.unidad_medida)}</Td>
                            <Td muted>{p.presentacion || '—'}</Td>
                            <Td>
                              <Badge variant={p.activo ? 'active' : 'inactive'} dot>
                                {p.activo ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </Td>
                            <Td right>
                              <button
                                onClick={() => abrirEditar(p)}
                                className="text-[12px] font-medium text-[#6b8f8f] hover:text-[#1a2e2e] opacity-0 group-hover:opacity-100 transition-all"
                              >
                                Editar
                              </button>
                            </Td>
                          </tr>
                        );
                      })
                    )}
                  </TBody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
                {productosFiltrados.length} de {productos.length} productos
              </div>
            </>
          )}
        </ContentCard>
      </div>

      {/* Drawer */}
      <Drawer open={drawerAbierto} onClose={cerrarDrawer}>
        <DrawerHeader
          title={editandoId !== null ? 'Editar Producto' : 'Nuevo Producto'}
          subtitle={editandoId !== null ? 'Modifica los datos del producto' : 'Completa los datos del producto'}
          icon="inventory_2"
          onClose={cerrarDrawer}
          disabled={guardando}
        />

        <DrawerBody>
          {errorForm && <AlertError>{errorForm}</AlertError>}

          <form id="producto-form" onSubmit={handleGuardar} className="space-y-3.5">
            <Field label="Nombre" required>
              <FieldInput
                name="nombre" value={form.nombre} onChange={handleChange}
                placeholder="Ej. Alimento Iniciador Pollos" required
              />
            </Field>

            <Field label="Categoría" required>
              <FieldSelect name="categoria" value={form.categoria} onChange={handleChange} required>
                <option value="">Seleccionar categoría</option>
                {categorias.filter((c) => c.activo).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </FieldSelect>
            </Field>

            <Field label="Naturaleza" required>
              <FieldSelect name="naturaleza" value={form.naturaleza} onChange={handleChange} required>
                <option value="INSUMO_GENERAL">Insumo General</option>
                <option value="AVE_INICIAL">Ave Inicial (pollito 1 día)</option>
              </FieldSelect>
              {form.naturaleza === 'AVE_INICIAL' && (
                <p className="mt-1 text-[11px] text-amber-600">
                  Los productos AVE_INICIAL son los pollitos de engorde. Solo estos pueden usarse para abrir lotes de producción.
                </p>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Unidad de medida" required>
                <FieldSelect name="unidad_medida" value={form.unidad_medida} onChange={handleChange} required>
                  <option value="">Seleccionar</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>{u.abreviatura} — {u.nombre}</option>
                  ))}
                </FieldSelect>
              </Field>
              <Field label="Stock mínimo">
                <FieldInput
                  name="stock_minimo" type="number" min="0" step="0.01"
                  value={form.stock_minimo} onChange={handleChange} placeholder="0"
                  className="text-right"
                />
              </Field>
            </div>

            <Field label="Presentación">
              <FieldInput
                name="presentacion" value={form.presentacion} onChange={handleChange}
                placeholder="Ej. Bulto 40 kg, Frasco 250 mL"
              />
            </Field>

            <Field label="Descripción">
              <FieldTextarea
                name="descripcion" value={form.descripcion} onChange={handleChange}
                rows={3} placeholder="Descripción del producto (opcional)..."
              />
            </Field>

            <div className="flex items-center justify-between bg-[#f5f8f8] border border-[#e4ecec] rounded-md px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-[#1a2e2e]">Producto activo</p>
                <p className="text-[12px] text-[#6b8f8f] mt-0.5">
                  {form.activo ? 'Visible y disponible' : 'Oculto del catálogo'}
                </p>
              </div>
              <Toggle
                checked={form.activo}
                onChange={() => setForm((prev) => ({ ...prev, activo: !prev.activo }))}
              />
            </div>
          </form>
        </DrawerBody>

        <DrawerFooter
          form="producto-form"
          saving={guardando}
          onCancel={cerrarDrawer}
          saveLabel={editandoId !== null ? 'Guardar cambios' : 'Crear producto'}
        />
      </Drawer>
    </main>
  );
}

export default ProductosInsumos;
