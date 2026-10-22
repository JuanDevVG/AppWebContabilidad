import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, ChevronDown, Truck } from 'lucide-react';
import {
  getProveedores, createProveedor, updateProveedor,
} from '../utils/apiService';
import {
  BtnPrimary, Badge,
  Field, FieldInput, FieldSelect, FieldTextarea,
  AlertError, PageHeader, ContentCard,
  Th, Td, THead, TBody, EmptyRow, Spinner,
  Drawer, DrawerHeader, DrawerBody, DrawerFooter,
  Toggle,
} from '../ui/index.jsx';

const CONDICIONES_PAGO = ['Contado', '15 días', '30 días', '60 días', '90 días'];

const FORM_VACIO = {
  nombre: '',
  nit: '',
  nombre_contacto: '',
  telefono: '',
  email: '',
  condiciones_pago: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  notas: '',
  activo: true,
};

export function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroCondicion, setFiltroCondicion] = useState('');

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
      const data = await getProveedores();
      setProveedores(data.results ?? data);
    } catch (err) {
      setErrorCarga(err.message || 'Error al cargar proveedores');
    } finally {
      setCargando(false);
    }
  }

  const proveedoresFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return proveedores.filter((p) => {
      const matchQ =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.nit?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.nombre_contacto?.toLowerCase().includes(q);
      const matchCond = !filtroCondicion || p.condiciones_pago === filtroCondicion;
      return matchQ && matchCond;
    });
  }, [proveedores, busqueda, filtroCondicion]);

  function abrirCrear() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErrorForm('');
    setDrawerAbierto(true);
  }

  function abrirEditar(p) {
    setEditandoId(p.id);
    setForm({
      nombre: p.nombre,
      nit: p.nit ?? '',
      nombre_contacto: p.nombre_contacto ?? '',
      telefono: p.telefono ?? '',
      email: p.email ?? '',
      condiciones_pago: p.condiciones_pago ?? '',
      direccion: p.direccion ?? '',
      ciudad: p.ciudad ?? '',
      departamento: p.departamento ?? '',
      notas: p.notas ?? '',
      activo: p.activo,
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
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    try {
      if (editandoId !== null) {
        const actualizado = await updateProveedor(editandoId, form);
        setProveedores((prev) => prev.map((p) => (p.id === editandoId ? actualizado : p)));
      } else {
        const nuevo = await createProveedor(form);
        setProveedores((prev) => [...prev, nuevo]);
      }
      cerrarDrawer();
    } catch (err) {
      setErrorForm(err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

        <PageHeader
          title="Proveedores"
          subtitle="Directorio maestro de proveedores y sus condiciones comerciales"
        >
          <BtnPrimary onClick={abrirCrear} disabled={cargando}>
            <Plus className="w-3.5 h-3.5" />
            Agregar proveedor
          </BtnPrimary>
        </PageHeader>

        {errorCarga && <AlertError onRetry={cargarDatos}>{errorCarga}</AlertError>}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf]" />
            <input
              type="text"
              placeholder="Buscar por nombre, NIT, contacto o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white border border-[#dde8e8] rounded-md pl-9 pr-3 py-[7px] text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
            <select
              value={filtroCondicion}
              onChange={(e) => setFiltroCondicion(e.target.value)}
              className="bg-white border border-[#dde8e8] rounded-md pl-9 pr-8 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 appearance-none cursor-pointer min-w-[180px] transition-colors"
            >
              <option value="">Todas las condiciones</option>
              {CONDICIONES_PAGO.map((c) => (
                <option key={c} value={c}>{c}</option>
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
              <span className="text-[13px]">Cargando proveedores...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <THead>
                    <Th>Nombre</Th>
                    <Th>NIT / RUT</Th>
                    <Th>Contacto</Th>
                    <Th>Teléfono</Th>
                    <Th>Email</Th>
                    <Th>Cond. de pago</Th>
                    <Th>Estado</Th>
                  </THead>
                  <TBody>
                    {proveedoresFiltrados.length === 0 ? (
                      <EmptyRow icon={Truck} title="No se encontraron proveedores" cols={7} />
                    ) : (
                      proveedoresFiltrados.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => abrirEditar(p)}
                          className="hover:bg-[#fafcfc] transition-colors cursor-pointer"
                        >
                          <Td className="font-medium">{p.nombre}</Td>
                          <Td mono muted className="text-[12px]">{p.nit || '—'}</Td>
                          <Td muted>{p.nombre_contacto || '—'}</Td>
                          <Td muted>{p.telefono || '—'}</Td>
                          <Td muted>{p.email || '—'}</Td>
                          <Td>
                            {p.condiciones_pago ? (
                              <Badge variant="info">{p.condiciones_pago}</Badge>
                            ) : (
                              <span className="text-[#aebfbf]">—</span>
                            )}
                          </Td>
                          <Td>
                            <Badge variant={p.activo ? 'active' : 'inactive'} dot>
                              {p.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </Td>
                        </tr>
                      ))
                    )}
                  </TBody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
                {proveedoresFiltrados.length} de {proveedores.length} proveedores
              </div>
            </>
          )}
        </ContentCard>
      </div>

      {/* Drawer */}
      <Drawer open={drawerAbierto} onClose={cerrarDrawer}>
        <DrawerHeader
          title={editandoId !== null ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          subtitle={editandoId !== null ? 'Modifica los datos del proveedor' : 'Completa los datos del proveedor'}
          icon="local_shipping"
          onClose={cerrarDrawer}
          disabled={guardando}
        />

        <DrawerBody>
          {errorForm && <AlertError>{errorForm}</AlertError>}

          <form id="proveedor-form" onSubmit={handleGuardar} className="space-y-3.5">

            <Field label="Nombre del proveedor" required>
              <FieldInput
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej. Distribuidora Agropecuaria S.A."
                required
              />
            </Field>

            <Field label="NIT / RUT">
              <FieldInput
                name="nit"
                value={form.nit}
                onChange={handleChange}
                placeholder="Ej. 900.123.456-7"
              />
            </Field>

            {/* Sección contacto */}
            <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider pt-1 pb-0.5 border-b border-[#e4ecec]">
              Información de contacto
            </p>

            <Field label="Nombre del contacto">
              <FieldInput
                name="nombre_contacto"
                value={form.nombre_contacto}
                onChange={handleChange}
                placeholder="Ej. Carlos Rodríguez"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono">
                <FieldInput
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="+57 310 123 4567"
                />
              </Field>
              <Field label="Email">
                <FieldInput
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="contacto@empresa.com"
                />
              </Field>
            </div>

            {/* Sección dirección */}
            <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider pt-1 pb-0.5 border-b border-[#e4ecec]">
              Dirección
            </p>

            <Field label="Dirección">
              <FieldInput
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                placeholder="Ej. Cra 45 # 23-10"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Ciudad">
                <FieldInput
                  name="ciudad"
                  value={form.ciudad}
                  onChange={handleChange}
                  placeholder="Ej. Bogotá"
                />
              </Field>
              <Field label="Departamento">
                <FieldInput
                  name="departamento"
                  value={form.departamento}
                  onChange={handleChange}
                  placeholder="Ej. Cundinamarca"
                />
              </Field>
            </div>

            {/* Sección condiciones comerciales */}
            <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider pt-1 pb-0.5 border-b border-[#e4ecec]">
              Condiciones comerciales
            </p>

            <Field label="Condiciones de pago">
              <FieldSelect
                name="condiciones_pago"
                value={form.condiciones_pago}
                onChange={handleChange}
              >
                <option value="">Sin especificar</option>
                {CONDICIONES_PAGO.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </FieldSelect>
            </Field>

            <Field label="Notas">
              <FieldTextarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                rows={3}
                placeholder="Observaciones o instrucciones especiales sobre este proveedor..."
              />
            </Field>

            <div className="flex items-center justify-between bg-[#f5f8f8] border border-[#e4ecec] rounded-md px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-[#1a2e2e]">Proveedor activo</p>
                <p className="text-[12px] text-[#6b8f8f] mt-0.5">
                  {form.activo ? 'Habilitado para compras' : 'Deshabilitado temporalmente'}
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
          form="proveedor-form"
          saving={guardando}
          onCancel={cerrarDrawer}
          saveLabel={editandoId !== null ? 'Guardar cambios' : 'Crear proveedor'}
        />
      </Drawer>
    </main>
  );
}

export default Proveedores;
