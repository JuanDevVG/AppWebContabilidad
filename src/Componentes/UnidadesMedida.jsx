import { useState, useEffect } from 'react';
import { Ruler } from 'lucide-react';
import {
  getUnidadesMedida, createUnidadMedida, updateUnidadMedida, deleteUnidadMedida,
} from '../utils/apiService';
import {
  BtnPrimary, BtnSecondary, BtnIcon,
  AlertError, PageHeader, ContentCard,
  Th, Td, THead, TBody, EmptyRow, Spinner, LoadingRows,
} from '../ui/index.jsx';
import { Check, X, Trash2 } from 'lucide-react';

const FILA_VACIA = { nombre: '', abreviatura: '', unidad_base: '', factor_conversion: '' };

export function UnidadesMedida() {
  const [unidades, setUnidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [editandoId, setEditandoId] = useState(null);
  const [filaEdit, setFilaEdit] = useState(FILA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [errorFila, setErrorFila] = useState('');

  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  useEffect(() => { cargarUnidades(); }, []);

  async function cargarUnidades() {
    setCargando(true);
    setErrorCarga('');
    try {
      const data = await getUnidadesMedida();
      setUnidades(data.results ?? data);
    } catch (err) {
      setErrorCarga(err.message || 'Error al cargar unidades');
    } finally {
      setCargando(false);
    }
  }

  function iniciarEdicion(u) {
    setEditandoId(u.id);
    setFilaEdit({
      nombre: u.nombre,
      abreviatura: u.abreviatura,
      unidad_base: u.unidad_base ?? '',
      factor_conversion: u.factor_conversion ?? '',
    });
    setErrorFila('');
  }

  function iniciarNueva() {
    if (editandoId === 'nueva') return;
    setEditandoId('nueva');
    setFilaEdit(FILA_VACIA);
    setErrorFila('');
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setFilaEdit(FILA_VACIA);
    setErrorFila('');
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFilaEdit((prev) => ({ ...prev, [name]: value }));
  }

  async function guardar() {
    if (!filaEdit.nombre.trim() || !filaEdit.abreviatura.trim()) {
      setErrorFila('Nombre y abreviatura son obligatorios.');
      return;
    }
    setGuardando(true);
    setErrorFila('');
    const payload = {
      nombre: filaEdit.nombre.trim(),
      abreviatura: filaEdit.abreviatura.trim(),
      unidad_base: filaEdit.unidad_base ? Number(filaEdit.unidad_base) : null,
      factor_conversion: filaEdit.factor_conversion !== '' ? Number(filaEdit.factor_conversion) : null,
    };
    try {
      if (editandoId === 'nueva') {
        const nueva = await createUnidadMedida(payload);
        setUnidades((prev) => [...prev, nueva]);
      } else {
        const actualizada = await updateUnidadMedida(editandoId, payload);
        setUnidades((prev) => prev.map((u) => (u.id === editandoId ? actualizada : u)));
      }
      cancelarEdicion();
    } catch (err) {
      setErrorFila(err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    setConfirmarEliminar(null);
    try {
      await deleteUnidadMedida(id);
      setUnidades((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setErrorCarga(err.message || 'Error al eliminar');
    }
  }

  const filasBase = unidades.filter((u) => !u.unidad_base);

  const inputCls = 'w-full px-2.5 py-[5px] bg-white border border-[#dde8e8] rounded-md text-[12px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 transition-colors';

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto">

          <PageHeader
            title="Unidades de Medida"
            subtitle="Configura las unidades y sus factores de conversión"
          >
            <BtnPrimary onClick={iniciarNueva} disabled={editandoId !== null}>
              <span className="material-symbols-outlined text-[15px]">add</span>
              Agregar unidad
            </BtnPrimary>
          </PageHeader>

          {errorCarga && <AlertError onRetry={cargarUnidades}>{errorCarga}</AlertError>}

          <ContentCard>
            {cargando ? (
              <div className="flex items-center justify-center gap-2 py-12 text-[#6b8f8f]">
                <Spinner size="md" className="text-[#6b8f8f]" />
                <span className="text-[13px]">Cargando...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <THead>
                    <Th>Nombre</Th>
                    <Th>Abreviatura</Th>
                    <Th>Unidad base</Th>
                    <Th>Factor conv.</Th>
                    <Th className="w-28" />
                  </THead>
                  <TBody>

                    {/* Fila nueva */}
                    {editandoId === 'nueva' && (
                      <FilaEditable
                        fila={filaEdit} unidades={unidades}
                        onChange={handleChange} onGuardar={guardar}
                        onCancelar={cancelarEdicion} guardando={guardando}
                        error={errorFila} inputCls={inputCls}
                      />
                    )}

                    {/* Filas existentes */}
                    {unidades.length === 0 && editandoId !== 'nueva' ? (
                      <EmptyRow icon={Ruler} title="No hay unidades registradas" cols={5} />
                    ) : (
                      unidades.map((u) =>
                        editandoId === u.id ? (
                          <FilaEditable
                            key={u.id}
                            fila={filaEdit} unidades={unidades.filter((x) => x.id !== u.id)}
                            onChange={handleChange} onGuardar={guardar}
                            onCancelar={cancelarEdicion} guardando={guardando}
                            error={errorFila} inputCls={inputCls}
                          />
                        ) : (
                          <tr key={u.id} className="hover:bg-[#fafcfc] transition-colors group">
                            <Td className="font-medium">{u.nombre}</Td>
                            <Td>
                              <span className="inline-flex px-2 py-0.5 rounded bg-[#eef4f4] text-[#1a2e2e] font-mono text-[11px] font-semibold">
                                {u.abreviatura}
                              </span>
                            </Td>
                            <Td muted>
                              {u.unidad_base_nombre
                                ? <span className="font-mono text-[11px] bg-[#eef4f4] px-2 py-0.5 rounded text-[#1a2e2e]">{u.unidad_base_nombre}</span>
                                : <span className="text-[#c4d4d4]">—</span>
                              }
                            </Td>
                            <Td mono muted className="text-[12px]">
                              {u.factor_conversion != null
                                ? Number(u.factor_conversion).toString()
                                : <span className="text-[#c4d4d4]">—</span>
                              }
                            </Td>
                            <Td right>
                              <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {confirmarEliminar === u.id ? (
                                  <>
                                    <span className="text-[11px] text-red-600 font-medium mr-1">¿Eliminar?</span>
                                    <button
                                      onClick={() => eliminar(u.id)}
                                      className="text-[11px] font-semibold text-red-600 hover:text-red-800 px-1.5 py-1 rounded hover:bg-red-50 transition-colors"
                                    >Sí</button>
                                    <button
                                      onClick={() => setConfirmarEliminar(null)}
                                      className="text-[11px] font-semibold text-[#6b8f8f] hover:text-[#1a2e2e] px-1.5 py-1 rounded hover:bg-[#f0f5f5] transition-colors"
                                    >No</button>
                                  </>
                                ) : (
                                  <>
                                    <BtnIcon
                                      onClick={() => iniciarEdicion(u)}
                                      disabled={editandoId !== null}
                                      title="Editar"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">edit</span>
                                    </BtnIcon>
                                    <BtnIcon
                                      onClick={() => setConfirmarEliminar(u.id)}
                                      disabled={editandoId !== null}
                                      title="Eliminar"
                                      className="hover:text-red-500 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </BtnIcon>
                                  </>
                                )}
                              </div>
                            </Td>
                          </tr>
                        )
                      )
                    )}
                  </TBody>
                </table>
              </div>
            )}

            {!cargando && (
              <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
                {unidades.length} unidad{unidades.length !== 1 ? 'es' : ''} registrada{unidades.length !== 1 ? 's' : ''}
                {filasBase.length > 0 && ` · ${filasBase.length} base${filasBase.length !== 1 ? 's' : ''}`}
              </div>
            )}
          </ContentCard>

          {/* Nota de ayuda */}
          <div className="mt-3 px-4 py-3 bg-white border border-[#e4ecec] rounded-lg text-[12px] text-[#6b8f8f] leading-relaxed">
            <strong className="text-[#374040]">Factor de conversión:</strong> indica cuántas unidades de esta medida
            equivalen a 1 unidad base.{' '}
            Ejemplo: <span className="font-mono bg-[#f5f8f8] px-1 rounded">g → kg = 0.001</span>,{' '}
            <span className="font-mono bg-[#f5f8f8] px-1 rounded">mL → L = 0.001</span>.
            Las unidades sin base ni factor se consideran unidades base.
          </div>
        </div>
      </div>
    </main>
  );
}

function FilaEditable({ fila, unidades, onChange, onGuardar, onCancelar, guardando, error, inputCls }) {
  return (
    <>
      <tr className="bg-[#fafcfc] border-l-2 border-[#012d1d]">
        <td className="px-3 py-2">
          <input name="nombre" value={fila.nombre} onChange={onChange}
            placeholder="Kilogramo" autoFocus className={inputCls} />
        </td>
        <td className="px-3 py-2">
          <input name="abreviatura" value={fila.abreviatura} onChange={onChange}
            placeholder="kg" className={`${inputCls} font-mono`} />
        </td>
        <td className="px-3 py-2">
          <select name="unidad_base" value={fila.unidad_base} onChange={onChange} className={inputCls}>
            <option value="">— ninguna —</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>{u.abreviatura}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <input name="factor_conversion" type="number" step="any" min="0"
            value={fila.factor_conversion} onChange={onChange}
            placeholder="0.001" className={`${inputCls} font-mono`} />
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-1">
            <BtnPrimary onClick={onGuardar} disabled={guardando} loading={guardando} className="py-1 px-2.5 text-[12px]">
              {!guardando && <Check className="w-3 h-3" />}
              Guardar
            </BtnPrimary>
            <BtnIcon onClick={onCancelar} disabled={guardando}>
              <X className="w-3.5 h-3.5" />
            </BtnIcon>
          </div>
        </td>
      </tr>
      {error && (
        <tr className="bg-red-50">
          <td colSpan={5} className="px-4 py-1.5 text-[11px] text-red-600">
            {error}
          </td>
        </tr>
      )}
    </>
  );
}

export default UnidadesMedida;
