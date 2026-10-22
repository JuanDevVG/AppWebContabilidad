import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Bird, Building2 } from 'lucide-react';
import { getGalpones, createGalpon, updateGalpon } from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, Badge,
  Field, FieldInput, FieldTextarea,
  AlertError, PageHeader, Spinner,
  Toggle,
} from '../ui/index.jsx';

const FORM_VACIO = {
  nombre: '',
  codigo: '',
  capacidad: '',
  descripcion: '',
  activo: true,
};

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh] animate-modal-in">
        {children}
      </div>
    </div>
  );
}

export function Galpones() {
  const [galpones, setGalpones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga('');
    try {
      const data = await getGalpones();
      setGalpones(data.results ?? data);
    } catch (err) {
      setErrorCarga(err.message || 'Error al cargar galpones');
    } finally {
      setCargando(false);
    }
  }

  const galponesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return galpones.filter(
      (g) => !q || g.nombre.toLowerCase().includes(q) || g.codigo?.toLowerCase().includes(q),
    );
  }, [galpones, busqueda]);

  function abrirCrear() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErrorForm('');
    setModalAbierto(true);
  }

  function abrirEditar(g) {
    setEditandoId(g.id);
    setForm({
      nombre: g.nombre,
      codigo: g.codigo ?? '',
      capacidad: g.capacidad ?? '',
      descripcion: g.descripcion ?? '',
      activo: g.activo,
    });
    setErrorForm('');
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;
    setModalAbierto(false);
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
      const payload = { ...form, capacidad: Number(form.capacidad) || 0 };
      if (editandoId !== null) {
        const actualizado = await updateGalpon(editandoId, payload);
        setGalpones((prev) => prev.map((g) => (g.id === editandoId ? actualizado : g)));
      } else {
        const nuevo = await createGalpon(payload);
        setGalpones((prev) => [...prev, nuevo]);
      }
      cerrarModal();
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
          title="Galpones"
          subtitle="Centros de costo y ubicaciones de producción avícola"
        >
          <BtnPrimary onClick={abrirCrear} disabled={cargando}>
            <Plus className="w-3.5 h-3.5" />
            Agregar galpón
          </BtnPrimary>
        </PageHeader>

        {errorCarga && <AlertError onRetry={cargarDatos}>{errorCarga}</AlertError>}

        {/* Buscador */}
        <div className="relative mb-5 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf]" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white border border-[#dde8e8] rounded-md pl-9 pr-3 py-[7px] text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors"
          />
        </div>

        {/* Contenido */}
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[#6b8f8f]">
            <Spinner size="md" className="text-[#6b8f8f]" />
            <span className="text-[13px]">Cargando galpones...</span>
          </div>
        ) : galponesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="w-10 h-10 text-[#c4d4d4] mb-3" strokeWidth={1.5} />
            <p className="text-[14px] font-medium text-[#6b8f8f]">No se encontraron galpones</p>
            <p className="text-[12px] text-[#aebfbf] mt-1">
              {busqueda ? 'Intenta con otro término de búsqueda' : 'Agrega el primer galpón con el botón de arriba'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {galponesFiltrados.map((g) => (
                <button
                  key={g.id}
                  onClick={() => abrirEditar(g)}
                  className="text-left bg-white border border-[#e4ecec] rounded-xl p-5 hover:border-[#b8d0d0] hover:shadow-md transition-all duration-150 group"
                >
                  {/* Encabezado de tarjeta */}
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#f0f5f5] flex items-center justify-center flex-shrink-0 group-hover:bg-[#e4ecec] transition-colors">
                        <span className="material-symbols-outlined text-[#4a6060] text-[20px]">
                          warehouse
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#1a2e2e] leading-tight truncate">
                          {g.nombre}
                        </p>
                        <p className="text-[11px] font-mono text-[#aebfbf] mt-0.5">
                          {g.codigo || '—'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={g.activo ? 'active' : 'inactive'} dot>
                      {g.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  {/* Métricas */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#6b8f8f]">
                        <Bird className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span className="text-[12px]">Capacidad</span>
                      </div>
                      <span className="text-[13px] font-semibold text-[#1a2e2e]">
                        {g.capacidad ? Number(g.capacidad).toLocaleString() : '—'} aves
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#6b8f8f]">
                        <span className="material-symbols-outlined text-[14px]">folder_open</span>
                        <span className="text-[12px]">Lote activo</span>
                      </div>
                      <span className="text-[12px] text-[#aebfbf]">
                        {g.lote_activo || 'Sin lote'}
                      </span>
                    </div>
                  </div>

                  {g.descripcion && (
                    <p className="mt-3.5 pt-3.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f] line-clamp-2 text-left">
                      {g.descripcion}
                    </p>
                  )}
                </button>
              ))}
            </div>

            <p className="mt-4 text-[12px] text-[#aebfbf]">
              {galponesFiltrados.length} de {galpones.length} galpones
            </p>
          </>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalAbierto} onClose={cerrarModal}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e4ecec] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#6b8f8f] text-[20px]">warehouse</span>
            <div>
              <h3 className="text-[14px] font-semibold text-[#1a2e2e]">
                {editandoId !== null ? 'Editar Galpón' : 'Nuevo Galpón'}
              </h3>
              <p className="text-[12px] text-[#6b8f8f]">
                {editandoId !== null ? 'Modifica los datos del galpón' : 'Completa los datos del galpón'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cerrarModal}
            disabled={guardando}
            className="p-1.5 rounded-md text-[#aebfbf] hover:text-[#1a2e2e] hover:bg-[#f0f5f5] transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto custom-scrollbar">
          {errorForm && <AlertError>{errorForm}</AlertError>}

          <form id="galon-form" onSubmit={handleGuardar} className="space-y-3.5">
            <Field label="Nombre" required>
              <FieldInput
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej. Galpón 1 — Pollos de engorde"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Código" required>
                <FieldInput
                  name="codigo"
                  value={form.codigo}
                  onChange={handleChange}
                  placeholder="Ej. G-01"
                  required
                />
              </Field>
              <Field label="Capacidad (aves)">
                <FieldInput
                  name="capacidad"
                  type="number"
                  min="0"
                  value={form.capacidad}
                  onChange={handleChange}
                  placeholder="20000"
                  className="text-right"
                />
              </Field>
            </div>

            <Field label="Descripción">
              <FieldTextarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                rows={3}
                placeholder="Ubicación, notas o características del galpón..."
              />
            </Field>

            <div className="flex items-center justify-between bg-[#f5f8f8] border border-[#e4ecec] rounded-md px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-[#1a2e2e]">Galpón activo</p>
                <p className="text-[12px] text-[#6b8f8f] mt-0.5">
                  {form.activo ? 'Habilitado para producción' : 'Fuera de operación'}
                </p>
              </div>
              <Toggle
                checked={form.activo}
                onChange={() => setForm((prev) => ({ ...prev, activo: !prev.activo }))}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#e4ecec] flex gap-2.5 flex-shrink-0">
          <BtnSecondary type="button" onClick={cerrarModal} disabled={guardando} className="flex-1">
            Cancelar
          </BtnSecondary>
          <BtnPrimary
            type="submit"
            form="galon-form"
            loading={guardando}
            disabled={guardando}
            className="flex-1"
          >
            {guardando ? 'Guardando...' : editandoId !== null ? 'Guardar cambios' : 'Crear galpón'}
          </BtnPrimary>
        </div>
      </Modal>
    </main>
  );
}

export default Galpones;
