import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, ChevronDown, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { getClientes, createCliente, updateCliente } from '../utils/apiService';
import {
  BtnPrimary, Badge,
  Field, FieldInput, FieldSelect, FieldTextarea,
  AlertError, PageHeader, ContentCard,
  Th, Td, THead, TBody, EmptyRow, Spinner,
  Drawer, DrawerHeader, DrawerBody, DrawerFooter,
  Toggle,
} from '../ui/index.jsx';

const CONDICIONES_PAGO = [
  { value: 'CONTADO',  label: 'Contado' },
  { value: '15_DIAS',  label: '15 días' },
  { value: '30_DIAS',  label: '30 días' },
  { value: '45_DIAS',  label: '45 días' },
  { value: '60_DIAS',  label: '60 días' },
  { value: '90_DIAS',  label: '90 días' },
];

function fmtMoneda(n) {
  return Number(n || 0).toLocaleString('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
}

const FORM_VACIO = {
  nombre: '',
  nit: '',
  nombre_contacto: '',
  telefono: '',
  email: '',
  limite_credito: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  pais: 'Colombia',
  condiciones_pago: 'CONTADO',
  notas: '',
  activo: true,
  // saldo_actual: solo lectura, no se envía en el payload
  _saldo_display: 0,
};

export default function Clientes() {
  const [clientes,    setClientes]    = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [errorCarga,  setErrorCarga]  = useState('');

  const [busqueda,        setBusqueda]        = useState('');
  const [filtroCondicion, setFiltroCondicion] = useState('');

  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [editandoId,    setEditandoId]    = useState(null);
  const [form,          setForm]          = useState(FORM_VACIO);
  const [guardando,     setGuardando]     = useState(false);
  const [errorForm,     setErrorForm]     = useState('');

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga('');
    try {
      const data = await getClientes();
      setClientes(data.results ?? data);
    } catch (err) {
      setErrorCarga(err.message || 'Error al cargar clientes');
    } finally {
      setCargando(false);
    }
  }

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return clientes.filter((c) => {
      const matchQ =
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.nit?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.nombre_contacto?.toLowerCase().includes(q);
      const matchCond = !filtroCondicion || c.condiciones_pago === filtroCondicion;
      return matchQ && matchCond;
    });
  }, [clientes, busqueda, filtroCondicion]);

  function abrirCrear() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErrorForm('');
    setDrawerAbierto(true);
  }

  function abrirEditar(c) {
    setEditandoId(c.id);
    setForm({
      nombre:           c.nombre,
      nit:              c.nit              ?? '',
      nombre_contacto:  c.nombre_contacto  ?? '',
      telefono:         c.telefono         ?? '',
      email:            c.email            ?? '',
      limite_credito:   c.limite_credito   ?? '',
      direccion:        c.direccion        ?? '',
      ciudad:           c.ciudad           ?? '',
      departamento:     c.departamento     ?? '',
      pais:             c.pais             ?? 'Colombia',
      condiciones_pago: c.condiciones_pago ?? 'CONTADO',
      notas:            c.notas            ?? '',
      activo:           c.activo,
      _saldo_display:   c.saldo_actual     ?? 0,
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
    if (!form.nombre.trim()) {
      setErrorForm('El nombre del cliente es obligatorio.');
      return;
    }
    setGuardando(true);
    setErrorForm('');
    try {
      // eslint-disable-next-line no-unused-vars
      const { _saldo_display, ...formData } = form;
      const payload = {
        ...formData,
        limite_credito: form.limite_credito === '' ? 0 : Number(form.limite_credito),
      };
      if (editandoId !== null) {
        const actualizado = await updateCliente(editandoId, payload);
        setClientes((prev) => prev.map((c) => (c.id === editandoId ? actualizado : c)));
      } else {
        const nuevo = await createCliente(payload);
        setClientes((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
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
          title="Clientes"
          subtitle="Directorio de clientes, límites de crédito y condiciones de pago"
        >
          <BtnPrimary onClick={abrirCrear} disabled={cargando}>
            <Plus className="w-3.5 h-3.5" />
            Agregar cliente
          </BtnPrimary>
        </PageHeader>

        {errorCarga && <AlertError onRetry={cargarDatos}>{errorCarga}</AlertError>}

        {/* KPI cards */}
        {!cargando && clientes.length > 0 && (() => {
          const totalSaldo = clientes.reduce((s, c) => s + Number(c.saldo_actual || 0), 0);
          const conSaldo   = clientes.filter(c => Number(c.saldo_actual) > 0).length;
          const activos    = clientes.filter(c => c.activo).length;
          return (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white border border-[#dde8e8] rounded-lg px-4 py-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#012d1d] text-[22px]">group</span>
                <div>
                  <p className="text-[11px] text-[#6b8f8f] uppercase tracking-wide">Clientes activos</p>
                  <p className="text-[18px] font-bold text-[#012d1d]">{activos}</p>
                </div>
              </div>
              <div className="bg-white border border-[#dde8e8] rounded-lg px-4 py-3 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-[11px] text-[#6b8f8f] uppercase tracking-wide">Saldo total en CxC</p>
                  <p className="text-[18px] font-bold text-amber-600">{fmtMoneda(totalSaldo)}</p>
                </div>
              </div>
              <div className="bg-white border border-[#dde8e8] rounded-lg px-4 py-3 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
                <div>
                  <p className="text-[11px] text-[#6b8f8f] uppercase tracking-wide">Con saldo pendiente</p>
                  <p className="text-[18px] font-bold text-[#1a2e2e]">{conSaldo}</p>
                </div>
              </div>
            </div>
          );
        })()}

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
                <option key={c.value} value={c.value}>{c.label}</option>
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
              <span className="text-[13px]">Cargando clientes...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <THead>
                    <Th>Nombre</Th>
                    <Th>NIT / ID</Th>
                    <Th>Contacto</Th>
                    <Th>Teléfono</Th>
                    <Th>Email</Th>
                    <Th right>Límite crédito</Th>
                    <Th right>Saldo</Th>
                    <Th>Cond. de pago</Th>
                    <Th>Estado</Th>
                  </THead>
                  <TBody>
                    {clientesFiltrados.length === 0 ? (
                      <EmptyRow icon={Users} title="No se encontraron clientes" cols={9} />
                    ) : (
                      clientesFiltrados.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => abrirEditar(c)}
                          className="hover:bg-[#fafcfc] transition-colors cursor-pointer"
                        >
                          <Td className="font-medium">{c.nombre}</Td>
                          <Td mono muted className="text-[12px]">{c.nit || '—'}</Td>
                          <Td muted>{c.nombre_contacto || '—'}</Td>
                          <Td muted>{c.telefono || '—'}</Td>
                          <Td muted>{c.email || '—'}</Td>
                          <Td right>
                            <span className="text-[12px] font-medium text-[#1a2e2e]">
                              {Number(c.limite_credito) > 0 ? fmtMoneda(c.limite_credito) : <span className="text-[#aebfbf]">—</span>}
                            </span>
                          </Td>
                          <Td right>
                            <span className={`text-[12px] font-semibold ${Number(c.saldo_actual) > 0 ? 'text-amber-600' : 'text-[#aebfbf]'}`}>
                              {Number(c.saldo_actual) > 0 ? fmtMoneda(c.saldo_actual) : '—'}
                            </span>
                          </Td>
                          <Td>
                            {c.condiciones_pago ? (
                              <Badge variant="info">{c.condiciones_pago_label ?? c.condiciones_pago}</Badge>
                            ) : (
                              <span className="text-[#aebfbf]">—</span>
                            )}
                          </Td>
                          <Td>
                            <Badge variant={c.activo ? 'active' : 'inactive'} dot>
                              {c.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </Td>
                        </tr>
                      ))
                    )}
                  </TBody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
                {clientesFiltrados.length} de {clientes.length} clientes
              </div>
            </>
          )}
        </ContentCard>
      </div>

      {/* Drawer */}
      <Drawer open={drawerAbierto} onClose={cerrarDrawer}>
        <DrawerHeader
          title={editandoId !== null ? 'Editar Cliente' : 'Nuevo Cliente'}
          subtitle={editandoId !== null ? 'Modifica los datos del cliente' : 'Completa los datos del cliente'}
          icon="person"
          onClose={cerrarDrawer}
          disabled={guardando}
        />

        <DrawerBody>
          {errorForm && <AlertError>{errorForm}</AlertError>}

          <form id="cliente-form" onSubmit={handleGuardar} className="space-y-3.5">

            <Field label="Nombre / Razón social" required>
              <FieldInput
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej. Avícola del Norte S.A.S."
                required
              />
            </Field>

            <Field label="NIT / Cédula">
              <FieldInput
                name="nit"
                value={form.nit}
                onChange={handleChange}
                placeholder="Ej. 900.123.456-7"
              />
            </Field>

            {/* Contacto */}
            <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider pt-1 pb-0.5 border-b border-[#e4ecec]">
              Información de contacto
            </p>

            <Field label="Nombre del contacto">
              <FieldInput
                name="nombre_contacto"
                value={form.nombre_contacto}
                onChange={handleChange}
                placeholder="Ej. María López"
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
                  placeholder="cliente@empresa.com"
                />
              </Field>
            </div>

            {/* Dirección de facturación */}
            <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider pt-1 pb-0.5 border-b border-[#e4ecec]">
              Dirección de facturación
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
                  placeholder="Ej. Medellín"
                />
              </Field>
              <Field label="Departamento">
                <FieldInput
                  name="departamento"
                  value={form.departamento}
                  onChange={handleChange}
                  placeholder="Ej. Antioquia"
                />
              </Field>
            </div>

            <Field label="País">
              <FieldInput
                name="pais"
                value={form.pais}
                onChange={handleChange}
                placeholder="Colombia"
              />
            </Field>

            {/* Condiciones comerciales */}
            <p className="text-[11px] font-semibold text-[#6b8f8f] uppercase tracking-wider pt-1 pb-0.5 border-b border-[#e4ecec]">
              Condiciones comerciales
            </p>

            <Field label="Condiciones de pago">
              <FieldSelect
                name="condiciones_pago"
                value={form.condiciones_pago}
                onChange={handleChange}
              >
                {CONDICIONES_PAGO.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </FieldSelect>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Límite de crédito (COP)">
                <FieldInput
                  name="limite_credito"
                  type="number"
                  min="0"
                  step="1000"
                  value={form.limite_credito}
                  onChange={handleChange}
                  placeholder="0"
                />
              </Field>
              {editandoId !== null && (
                <Field label="Saldo en CxC">
                  <div className={`px-3 py-[7px] rounded-md border text-[13px] font-semibold ${
                    Number(form._saldo_display) > 0
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-[#dde8e8] bg-[#f5f8f8] text-[#6b8f8f]'
                  }`}>
                    {Number(form._saldo_display) > 0
                      ? fmtMoneda(form._saldo_display)
                      : 'Sin saldo pendiente'}
                  </div>
                  <p className="text-[11px] text-[#6b8f8f] mt-1">Calculado automáticamente desde CxC</p>
                </Field>
              )}
            </div>

            <Field label="Notas">
              <FieldTextarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                rows={3}
                placeholder="Observaciones o instrucciones especiales sobre este cliente..."
              />
            </Field>

            <div className="flex items-center justify-between bg-[#f5f8f8] border border-[#e4ecec] rounded-md px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-[#1a2e2e]">Cliente activo</p>
                <p className="text-[12px] text-[#6b8f8f] mt-0.5">
                  {form.activo ? 'Habilitado para facturación' : 'Deshabilitado temporalmente'}
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
          form="cliente-form"
          saving={guardando}
          onCancel={cerrarDrawer}
          saveLabel={editandoId !== null ? 'Guardar cambios' : 'Crear cliente'}
        />
      </Drawer>
    </main>
  );
}
