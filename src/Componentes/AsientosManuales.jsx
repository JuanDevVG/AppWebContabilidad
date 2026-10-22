import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, Plus, Trash2, Paperclip, ArrowLeft,
  AlertTriangle, CheckCircle2, FileText, X,
} from 'lucide-react';
import {
  PageHeader, ContentCard, CardHeader, CardTitle, CardFooter,
  BtnPrimary, BtnSecondary, BtnGhost, BtnDestructive, BtnIcon,
  Badge, Field, FieldInput, FieldSelect,
  AlertError, AlertSuccess, Spinner,
  Th, Td, THead, TBody, EmptyRow, LoadingRows,
} from '../ui/index.jsx';
import {
  getAsientos, getAsientoDetalle, createAsiento, updateAsiento,
  deleteAsiento, publicarAsiento, anularAsiento, getCuentasContables,
} from '../utils/apiService.js';

// ── Constants ────────────────────────────────────────────────────────────────

const ESTADO_VARIANT = { BORRADOR: 'neutral', PUBLICADO: 'active', ANULADO: 'inactive' };
const ESTADO_LABEL   = { BORRADOR: 'Borrador', PUBLICADO: 'Publicado', ANULADO: 'Anulado' };

function fmt(n) {
  const v = parseFloat(n);
  if (isNaN(v)) return '—';
  return v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Searchable account combobox (portal-based to escape overflow:hidden) ─────

function CuentaSelect({ value, onChange, cuentas }) {
  const [open, setOpen]   = useState(false);
  const [q, setQ]         = useState('');
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 240 });
  const btnRef            = useRef(null);
  const dropRef           = useRef(null);
  const inputRef          = useRef(null);

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (!btnRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    function onScroll() { setOpen(false); }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  // Auto-focus search input
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  function openDrop() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 260) });
    setOpen(true);
    setQ('');
  }

  const visible = useMemo(() =>
    cuentas
      .filter(c => c.acepta_transacciones && c.activo)
      .filter(c => !q
        || c.codigo.toLowerCase().includes(q.toLowerCase())
        || c.nombre.toLowerCase().includes(q.toLowerCase())),
    [cuentas, q]
  );

  const selected = cuentas.find(c => c.id === value);

  const dropEl = open ? createPortal(
    <div
      ref={dropRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-white border border-[#e4ecec] rounded-md shadow-xl overflow-hidden"
    >
      <div className="p-2 border-b border-[#f0f5f5]">
        <input
          ref={inputRef}
          className="w-full px-2 py-1.5 text-[12px] bg-[#f5f8f8] border border-[#dde8e8] rounded focus:outline-none"
          placeholder="Buscar cuenta…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      <div className="max-h-44 overflow-y-auto custom-scrollbar">
        {visible.length === 0 ? (
          <p className="px-3 py-3 text-[12px] text-[#aebfbf] text-center">
            {cuentas.filter(c => c.acepta_transacciones).length === 0
              ? 'No hay cuentas con transacciones habilitadas'
              : 'Sin resultados'}
          </p>
        ) : visible.map(c => (
          <button
            key={c.id}
            type="button"
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#f5f8f8] text-left transition-colors ${
              value === c.id ? 'bg-[#eef4f4] font-semibold' : ''
            }`}
            onClick={() => { onChange(c.id); setOpen(false); setQ(''); }}
          >
            <span className="font-mono text-[10px] text-[#6b8f8f] w-14 flex-shrink-0">{c.codigo}</span>
            <span className="flex-1 truncate text-[#1a2e2e]">{c.nombre}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openDrop}
        className="w-full flex items-center gap-1.5 px-2.5 py-[6px] bg-white border border-[#dde8e8] rounded-md text-[12px] text-left hover:border-[#012d1d]/40 focus:outline-none transition-colors"
      >
        {selected ? (
          <>
            <span className="font-mono text-[10px] text-[#6b8f8f] flex-shrink-0">{selected.codigo}</span>
            <span className="flex-1 truncate text-[#1a2e2e]">{selected.nombre}</span>
          </>
        ) : (
          <span className="flex-1 text-[#aebfbf]">Seleccionar cuenta…</span>
        )}
        <ChevronDown className="w-3 h-3 text-[#aebfbf] flex-shrink-0" />
      </button>
      {dropEl}
    </>
  );
}

// ── Journal entry form ────────────────────────────────────────────────────────

let _k = 1;
const newLinea = () => ({ _k: _k++, cuenta_id: '', descripcion: '', debe: '', haber: '' });

function FormularioAsiento({ asientoId, cuentas, onGuardado, onCancelar }) {
  const isEdit = !!asientoId;

  const [cargando, setCargando] = useState(isEdit);
  const [form, setForm]   = useState({ fecha: today(), numero_referencia: '', descripcion: '' });
  const [lineas, setLineas] = useState([newLinea(), newLinea()]);
  const [estado, setEstado] = useState('BORRADOR');
  const [docNombre, setDocNombre] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const fileRef = useRef(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // Load detail for edit
  useEffect(() => {
    if (!isEdit) return;
    setCargando(true);
    getAsientoDetalle(asientoId)
      .then(d => {
        setForm({ fecha: d.fecha, numero_referencia: d.numero_referencia, descripcion: d.descripcion });
        setEstado(d.estado);
        setDocNombre(d.documento_nombre);
        if (d.lineas?.length) {
          setLineas(d.lineas.map(l => ({
            _k: _k++,
            cuenta_id:   l.cuenta_id,
            descripcion: l.descripcion ?? '',
            debe:        parseFloat(l.debe)  > 0 ? l.debe  : '',
            haber:       parseFloat(l.haber) > 0 ? l.haber : '',
          })));
        }
      })
      .catch(e => setError(e.message || 'Error al cargar asiento'))
      .finally(() => setCargando(false));
  }, [asientoId]);

  function setH(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function setL(k, field, v) { setLineas(p => p.map(l => l._k === k ? { ...l, [field]: v } : l)); }

  function onDebe(k, v) {
    setL(k, 'debe', v);
    if (parseFloat(v) > 0) setL(k, 'haber', '');
  }
  function onHaber(k, v) {
    setL(k, 'haber', v);
    if (parseFloat(v) > 0) setL(k, 'debe', '');
  }

  const addLinea    = () => setLineas(p => [...p, newLinea()]);
  const removeLinea = (k) => { if (lineas.length > 2) setLineas(p => p.filter(l => l._k !== k)); };

  const totalDebe  = lineas.reduce((s, l) => s + (parseFloat(l.debe)  || 0), 0);
  const totalHaber = lineas.reduce((s, l) => s + (parseFloat(l.haber) || 0), 0);
  const diff       = Math.abs(totalDebe - totalHaber);
  const balanced   = diff < 0.005;
  const readOnly   = estado !== 'BORRADOR';

  async function handleSave() {
    setError(''); setSuccess('');
    const lineasValidas = lineas.filter(l => l.cuenta_id && ((parseFloat(l.debe) || 0) + (parseFloat(l.haber) || 0)) > 0);
    if (!form.fecha)            { setError('La fecha es obligatoria.');             return; }
    if (!form.descripcion.trim()) { setError('La descripción es obligatoria.');     return; }
    if (lineasValidas.length < 2) { setError('Mínimo 2 líneas con cuenta y monto.'); return; }
    if (!balanced)              { setError(`No cuadrado — diferencia: ${fmt(diff)}`); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        lineas: lineasValidas.map((l, i) => ({
          cuenta_id:   l.cuenta_id,
          descripcion: l.descripcion,
          debe:        parseFloat(l.debe)  || 0,
          haber:       parseFloat(l.haber) || 0,
          orden:       i,
        })),
      };
      if (isEdit) {
        await updateAsiento(asientoId, payload, archivo || undefined);
      } else {
        await createAsiento(payload, archivo || undefined);
      }
      onGuardado();
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublicar() {
    if (!window.confirm('¿Publicar este asiento? No podrá editarse después.')) return;
    setSaving(true); setError('');
    try {
      await publicarAsiento(asientoId);
      setEstado('PUBLICADO');
      setSuccess('Asiento publicado.');
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleAnular() {
    if (!window.confirm('¿Anular este asiento? Esta acción no se puede deshacer.')) return;
    setSaving(true); setError('');
    try {
      await anularAsiento(asientoId);
      setEstado('ANULADO');
      setSuccess('Asiento anulado.');
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (cargando) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[#f5f8f8]">
        <Spinner size="lg" className="text-[#aebfbf]" />
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-[#f5f8f8] overflow-hidden">
      {/* Back bar */}
      <div className="px-6 pt-5 pb-3 flex items-center gap-3 flex-shrink-0">
        <BtnGhost onClick={onCancelar} className="gap-1.5 pl-2">
          <ArrowLeft className="w-4 h-4" /> Volver
        </BtnGhost>
        <span className="text-[#dde8e8]">/</span>
        <h2 className="text-[16px] font-semibold text-[#1a2e2e] flex-1">
          {isEdit ? `Asiento ${form.numero_referencia}` : 'Nuevo Asiento Contable'}
        </h2>
        {isEdit && (
          <Badge variant={ESTADO_VARIANT[estado] ?? 'neutral'} dot>
            {ESTADO_LABEL[estado] ?? estado}
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 custom-scrollbar">
        {error   && <AlertError>{error}</AlertError>}
        {success && <AlertSuccess>{success}</AlertSuccess>}

        {/* ── Header card ── */}
        <ContentCard>
          <CardHeader>
            <CardTitle>Encabezado</CardTitle>
          </CardHeader>
          <div className="px-5 py-4 grid grid-cols-3 gap-4">
            <Field label="Fecha" required>
              <FieldInput
                type="date"
                value={form.fecha}
                onChange={e => setH('fecha', e.target.value)}
                disabled={readOnly}
              />
            </Field>
            <Field label="N° de Referencia" hint="Auto-generado si se deja vacío">
              <FieldInput
                value={form.numero_referencia}
                onChange={e => setH('numero_referencia', e.target.value)}
                placeholder="Ej: ASM-20260620-001"
                disabled={readOnly}
              />
            </Field>
            <Field label="Descripción / Concepto" required>
              <FieldInput
                value={form.descripcion}
                onChange={e => setH('descripcion', e.target.value)}
                placeholder="Concepto general del asiento"
                disabled={readOnly}
              />
            </Field>
          </div>
        </ContentCard>

        {/* ── Lines card ── */}
        <ContentCard>
          <CardHeader>
            <CardTitle>Líneas del Asiento</CardTitle>
            {!readOnly && (
              <BtnGhost onClick={addLinea} className="gap-1 text-[12px]">
                <Plus className="w-3.5 h-3.5" /> Agregar línea
              </BtnGhost>
            )}
          </CardHeader>

          <table className="w-full">
            <THead>
              <Th className="w-[36%] min-w-[220px]">Cuenta</Th>
              <Th className="w-[28%] min-w-[140px]">Descripción de línea</Th>
              <Th right className="w-[15%] min-w-[120px]">Débito (Debe)</Th>
              <Th right className="w-[15%] min-w-[120px]">Crédito (Haber)</Th>
              <Th center className="w-[6%] min-w-[44px]"></Th>
            </THead>
            <TBody>
              {lineas.map(l => (
                <tr key={l._k} className="border-b border-[#f0f5f5] last:border-0">
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <span className="font-mono text-[10px] text-[#6b8f8f]">
                          {cuentas.find(c => c.id === l.cuenta_id)?.codigo ?? '—'}
                        </span>
                        <span className="truncate">
                          {cuentas.find(c => c.id === l.cuenta_id)?.nombre ?? `ID ${l.cuenta_id}`}
                        </span>
                      </div>
                    ) : (
                      <CuentaSelect value={l.cuenta_id} onChange={v => setL(l._k, 'cuenta_id', v)} cuentas={cuentas} />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full px-2.5 py-[6px] bg-white border border-[#dde8e8] rounded-md text-[12px] focus:outline-none focus:border-[#012d1d] disabled:opacity-50 disabled:bg-[#f5f8f8]"
                      placeholder="Descripción opcional"
                      value={l.descripcion}
                      onChange={e => setL(l._k, 'descripcion', e.target.value)}
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min="0" step="0.01"
                      className="w-full px-2.5 py-[6px] bg-white border border-[#dde8e8] rounded-md text-[12px] text-right font-mono focus:outline-none focus:border-[#012d1d] disabled:opacity-50 disabled:bg-[#f5f8f8]"
                      placeholder="0.00"
                      value={l.debe}
                      onChange={e => onDebe(l._k, e.target.value)}
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min="0" step="0.01"
                      className="w-full px-2.5 py-[6px] bg-white border border-[#dde8e8] rounded-md text-[12px] text-right font-mono focus:outline-none focus:border-[#012d1d] disabled:opacity-50 disabled:bg-[#f5f8f8]"
                      placeholder="0.00"
                      value={l.haber}
                      onChange={e => onHaber(l._k, e.target.value)}
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {!readOnly && (
                      <BtnIcon
                        onClick={() => removeLinea(l._k)}
                        disabled={lineas.length <= 2}
                        className="text-[#aebfbf] hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </BtnIcon>
                    )}
                  </td>
                </tr>
              ))}
            </TBody>
          </table>

          {/* Totals + balance indicator */}
          <div className={`px-5 py-3.5 border-t flex items-center justify-between gap-6 ${
            balanced
              ? 'border-emerald-100 bg-emerald-50/60'
              : 'border-amber-100 bg-amber-50/60'
          }`}>
            <div className="flex items-center gap-8 text-[13px]">
              <div>
                <span className="text-[#6b8f8f] mr-1.5">Total Débito:</span>
                <span className="font-semibold font-mono text-[#1a2e2e]">{fmt(totalDebe)}</span>
              </div>
              <div>
                <span className="text-[#6b8f8f] mr-1.5">Total Crédito:</span>
                <span className="font-semibold font-mono text-[#1a2e2e]">{fmt(totalHaber)}</span>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-[12px] font-semibold ${
              balanced ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {balanced
                ? <><CheckCircle2 className="w-4 h-4" /> Cuadrado</>
                : <><AlertTriangle className="w-4 h-4" /> Diferencia: {fmt(diff)}</>
              }
            </div>
          </div>
        </ContentCard>

        {/* ── Actions row ── */}
        <div className="flex items-center justify-between gap-4">
          {/* Attach document */}
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
              onChange={e => setArchivo(e.target.files[0] ?? null)}
              disabled={readOnly}
            />
            {!readOnly && (
              <BtnSecondary onClick={() => fileRef.current?.click()} className="gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                {archivo
                  ? archivo.name
                  : docNombre
                    ? docNombre
                    : 'Adjuntar documento'}
              </BtnSecondary>
            )}
            {!archivo && docNombre && (
              <span className="text-[12px] text-[#6b8f8f] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> {docNombre}
              </span>
            )}
            {archivo && (
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-[#6b8f8f]">{(archivo.size / 1024).toFixed(0)} KB</span>
                <button
                  type="button"
                  className="p-0.5 text-[#aebfbf] hover:text-red-400"
                  onClick={() => { setArchivo(null); if (fileRef.current) fileRef.current.value = ''; }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Save / state actions */}
          <div className="flex items-center gap-2">
            {isEdit && estado === 'BORRADOR' && (
              <>
                <BtnGhost onClick={handlePublicar} disabled={saving} className="text-emerald-700 hover:bg-emerald-50">
                  Publicar
                </BtnGhost>
              </>
            )}
            {isEdit && estado !== 'ANULADO' && (
              <BtnDestructive onClick={handleAnular} disabled={saving}>
                Anular
              </BtnDestructive>
            )}
            <BtnSecondary onClick={onCancelar} disabled={saving}>Cancelar</BtnSecondary>
            {!readOnly && (
              <BtnPrimary
                onClick={handleSave}
                loading={saving}
                disabled={saving || !balanced}
              >
                {isEdit ? 'Actualizar' : 'Guardar Asiento'}
              </BtnPrimary>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListaAsientos({ onNuevo, onVer }) {
  const [asientos, setAsientos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await getAsientos();
      setAsientos(data);
    } catch (e) {
      setError(e.message || 'Error al cargar asientos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtrados = useMemo(() => {
    let r = asientos;
    if (filtroEstado) r = r.filter(a => a.estado === filtroEstado);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(a =>
        a.numero_referencia?.toLowerCase().includes(q) ||
        a.descripcion?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [asientos, filtroEstado, search]);

  return (
    <main className="flex-1 flex flex-col bg-[#f5f8f8] overflow-hidden">
      <div className="px-6 pt-6 pb-3">
        <PageHeader
          title="Asientos Manuales"
          subtitle="Registro de asientos contables de partida doble"
        >
          <BtnPrimary onClick={onNuevo}>
            <Plus className="w-4 h-4" /> Nuevo Asiento
          </BtnPrimary>
        </PageHeader>
      </div>

      {error && <div className="px-6 pb-2"><AlertError onRetry={load}>{error}</AlertError></div>}

      <div className="flex-1 flex flex-col overflow-hidden px-6 pb-6">
        <ContentCard className="flex-1 flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="px-4 py-3 border-b border-[#e4ecec] flex items-center gap-3">
            <FieldInput
              icon="search"
              placeholder="Buscar por referencia o descripción…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <FieldSelect
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="w-40"
            >
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="PUBLICADO">Publicado</option>
              <option value="ANULADO">Anulado</option>
            </FieldSelect>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <THead>
                <Th className="w-[110px]">Fecha</Th>
                <Th className="w-[160px]">Referencia</Th>
                <Th>Descripción</Th>
                <Th right className="w-[130px]">Débito</Th>
                <Th right className="w-[130px]">Crédito</Th>
                <Th center className="w-[100px]">Estado</Th>
                <Th center className="w-[50px]">Doc</Th>
              </THead>
              <TBody>
                {loading ? (
                  <LoadingRows cols={7} />
                ) : filtrados.length === 0 ? (
                  <EmptyRow
                    icon={FileText}
                    title={search || filtroEstado ? 'Sin resultados' : 'No hay asientos registrados'}
                    subtitle={!search && !filtroEstado ? 'Haz clic en "Nuevo Asiento" para crear el primero' : undefined}
                    cols={7}
                  />
                ) : filtrados.map(a => (
                  <tr
                    key={a.id}
                    className="hover:bg-[#f9fafa] cursor-pointer transition-colors"
                    onClick={() => onVer(a.id)}
                  >
                    <Td muted>{a.fecha}</Td>
                    <Td mono>{a.numero_referencia}</Td>
                    <Td>{a.descripcion}</Td>
                    <Td right mono>{fmt(a.total_debe)}</Td>
                    <Td right mono>{fmt(a.total_haber)}</Td>
                    <Td center>
                      <Badge variant={ESTADO_VARIANT[a.estado] ?? 'neutral'} dot>
                        {ESTADO_LABEL[a.estado] ?? a.estado}
                      </Badge>
                    </Td>
                    <Td center>
                      {a.documento_nombre && (
                        <span className="material-symbols-outlined text-[16px] text-[#aebfbf]" title={a.documento_nombre}>
                          attach_file
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </TBody>
            </table>
          </div>

          <CardFooter>
            {filtrados.length} asiento{filtrados.length !== 1 ? 's' : ''}
            {(filtroEstado || search) ? ` (filtrado de ${asientos.length})` : ''}
          </CardFooter>
        </ContentCard>
      </div>
    </main>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AsientosManuales() {
  const [vista,      setVista]      = useState('lista'); // 'lista' | 'form'
  const [asientoId,  setAsientoId]  = useState(null);
  const [cuentas,    setCuentas]    = useState([]);

  useEffect(() => {
    getCuentasContables()
      .then(d => setCuentas(d))
      .catch(() => {});
  }, []);

  if (vista === 'form') {
    return (
      <FormularioAsiento
        asientoId={asientoId}
        cuentas={cuentas}
        onGuardado={() => { setVista('lista'); setAsientoId(null); }}
        onCancelar={() => { setVista('lista'); setAsientoId(null); }}
      />
    );
  }

  return (
    <ListaAsientos
      onNuevo={() => { setAsientoId(null); setVista('form'); }}
      onVer={(id) => { setAsientoId(id); setVista('form'); }}
    />
  );
}
