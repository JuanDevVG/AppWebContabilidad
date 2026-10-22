import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { getProductosTerminados, createProductoTerminado, patchProductoTerminado } from '../utils/apiService';
import {
  BtnPrimary, Badge,
  AlertError, AlertSuccess,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
  Drawer, DrawerHeader, DrawerBody, DrawerFooter,
  Field, FieldInput, FieldTextarea, Toggle,
} from '../ui/index.jsx';

// ── Drawer de alta / edición ─────────────────────────────────────────────────

function DrawerPT({ pt, onGuardar, onCerrar }) {
  const esNuevo = !pt;
  const [form, setForm] = useState({
    codigo:      pt?.codigo      ?? '',
    nombre:      pt?.nombre      ?? '',
    descripcion: pt?.descripcion ?? '',
    activo:      pt?.activo      ?? true,
  });
  const [guardando, setGuardando] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [errores,   setErrores]   = useState({});

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    const ev = {};
    if (!form.codigo.trim()) ev.codigo = 'Requerido';
    if (!form.nombre.trim()) ev.nombre = 'Requerido';
    if (Object.keys(ev).length) { setErrores(ev); return; }

    setGuardando(true);
    setErrorMsg('');
    try {
      const res = esNuevo
        ? await createProductoTerminado({ ...form, codigo: form.codigo.trim().toUpperCase() })
        : await patchProductoTerminado(pt.id, { nombre: form.nombre, descripcion: form.descripcion, activo: form.activo });
      onGuardar(res, esNuevo);
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Drawer open={true} onClose={onCerrar}>
      <DrawerHeader
        title={esNuevo ? 'Nuevo Producto Terminado' : `Editar — ${pt.codigo}`}
        onClose={onCerrar}
        disabled={guardando}
      />
      <DrawerBody>
        <form id="form-pt" onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && <AlertError>{errorMsg}</AlertError>}

          <Field label="Código" required error={errores.codigo}>
            <FieldInput
              value={form.codigo} disabled={!esNuevo}
              onChange={e => set('codigo', e.target.value.toUpperCase())}
              placeholder="Ej: PT-ENTERO"
            />
          </Field>

          <Field label="Nombre" required error={errores.nombre}>
            <FieldInput
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              placeholder="Ej: Pollo entero pelado"
            />
          </Field>

          <Field label="Descripción">
            <FieldTextarea
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              rows={3}
              placeholder="Descripción opcional…"
            />
          </Field>

          {!esNuevo && (
            <div className="flex items-center justify-between py-2 border-t border-[#f0f5f5]">
              <span className="text-[13px] font-medium text-[#1a2e2e]">Activo</span>
              <Toggle checked={form.activo} onChange={v => set('activo', v)} />
            </div>
          )}
        </form>
      </DrawerBody>
      <DrawerFooter
        form="form-pt"
        onCancel={onCerrar}
        saving={guardando}
        saveLabel={esNuevo ? 'Crear' : 'Guardar cambios'}
      />
    </Drawer>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────

export default function CatalogoProductoTerminado() {
  const [productos, setProductos] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [exitoMsg,  setExitoMsg]  = useState('');
  const [drawer,    setDrawer]    = useState(null); // null | 'nuevo' | pt-obj

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const res = await getProductosTerminados();
      setProductos(res);
    } catch (err) {
      setErrorMsg(err.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  function handleGuardado(res, esNuevo) {
    if (esNuevo) {
      setProductos(prev => [res, ...prev]);
    } else {
      setProductos(prev => prev.map(p => p.id === res.id ? res : p));
    }
    setDrawer(null);
    setExitoMsg(esNuevo ? `Producto "${res.nombre}" creado.` : `"${res.nombre}" actualizado.`);
    setTimeout(() => setExitoMsg(''), 5000);
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {drawer !== null && (
        <DrawerPT
          pt={drawer === 'nuevo' ? null : drawer}
          onGuardar={handleGuardado}
          onCerrar={() => setDrawer(null)}
        />
      )}

      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <div className="flex items-center justify-between mb-5">
          <PageHeader title="Catálogo Prod. Terminados" />
          <BtnPrimary onClick={() => setDrawer('nuevo')}>
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo Producto
          </BtnPrimary>
        </div>

        {exitoMsg && <AlertSuccess className="mb-4">{exitoMsg}</AlertSuccess>}
        {errorMsg && <AlertError  className="mb-4">{errorMsg}</AlertError>}

        <ContentCard>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <THead>
                <Th>Código</Th>
                <Th>Nombre</Th>
                <Th>Descripción</Th>
                <Th center>Estado</Th>
                <Th center>Acciones</Th>
              </THead>
              <TBody>
                {loading ? (
                  <LoadingRows cols={5} />
                ) : productos.length === 0 ? (
                  <EmptyRow cols={5} title="Sin productos terminados registrados" />
                ) : (
                  productos.map(p => (
                    <tr key={p.id} className="border-b border-[#f0f5f5] hover:bg-[#f8fbfb]">
                      <Td>
                        <span className="font-mono text-[11px] font-semibold text-[#1a2e2e]">{p.codigo}</span>
                      </Td>
                      <Td><span className="font-medium text-[#1a2e2e]">{p.nombre}</span></Td>
                      <Td muted>{p.descripcion || <span className="text-[#aebfbf]">—</span>}</Td>
                      <Td center>
                        <Badge variant={p.activo ? 'success' : 'neutral'}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </Td>
                      <Td center>
                        <button
                          onClick={() => setDrawer(p)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#012d1d] border border-[#c8d8d8] hover:bg-[#e8f5f0] transition-colors"
                        >
                          Editar
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </TBody>
            </table>
          </div>
        </ContentCard>
      </div>
    </main>
  );
}
