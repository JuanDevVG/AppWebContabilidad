import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiCall } from '../utils/apiService';
import { PageHeader, ContentCard, Spinner } from '../ui/index.jsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const BASE_URL = '/api/catalogo';

async function fetchAll(path) {
  const data = await apiCall(`${BASE_URL}/${path}/`);
  return Array.isArray(data) ? data : data.results ?? [];
}
async function save(path, id, payload) {
  return apiCall(`${BASE_URL}/${path}/${id ? `${id}/` : ''}`, {
    method: id ? 'PUT' : 'POST',
    body:   JSON.stringify(payload),
  });
}
async function toggle(path, id, activo) {
  return apiCall(`${BASE_URL}/${path}/${id}/`, {
    method: 'PATCH',
    body:   JSON.stringify({ activo }),
  });
}

function fmtTasa(t) {
  return `${Number(t).toFixed(2)}%`;
}

const APLICA_LABEL = { COMPRAS: 'Compras', VENTAS: 'Ventas', AMBOS: 'Ambos' };
const BASE_LABEL   = { COMPRAS: 'Compras', PAGOS: 'Pagos' };

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label, color }) {
  const COLORS = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    purple: 'bg-violet-50 text-violet-700 border-violet-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${COLORS[color] ?? COLORS.blue}`}>
      {label}
    </span>
  );
}

// ─── Fila editable (impuestos y retenciones comparten la misma lógica) ────────
function FilaEditable({ item, campos, onSave, onToggle, isNew, onCancelNew }) {
  const [editando, setEditando] = useState(isNew);
  const [form, setForm]         = useState(
    isNew ? campos.reduce((acc, c) => ({ ...acc, [c.key]: c.default ?? '' }), {}) : { ...item }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function guardar() {
    for (const c of campos) {
      if (c.required && !form[c.key] && form[c.key] !== 0) {
        setErr(`"${c.label}" es requerido.`); return;
      }
    }
    if (isNaN(Number(form.tasa)) || Number(form.tasa) < 0) {
      setErr('La tasa debe ser un número positivo.'); return;
    }
    setSaving(true); setErr('');
    try {
      const saved = await onSave(isNew ? null : item.id, form);
      if (!isNew) { setForm({ ...saved }); setEditando(false); }
    } catch (e) {
      setErr(e.message || 'Error al guardar.');
    } finally { setSaving(false); }
  }

  function cancelar() {
    if (isNew) { onCancelNew(); return; }
    setForm({ ...item }); setEditando(false); setErr('');
  }

  const activo = isNew ? true : item.activo;

  if (editando) {
    return (
      <>
        <tr className="bg-[#f0faf5] border-b border-[#dde8e8]">
          {campos.map((c) => (
            <td key={c.key} className="px-3 py-2">
              {c.type === 'select' ? (
                <select
                  value={form[c.key]}
                  onChange={(e) => set(c.key, e.target.value)}
                  className="w-full text-[12px] border border-[#dde8e8] rounded-md px-2 py-1 focus:outline-none focus:border-[#012d1d] bg-white"
                >
                  {c.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={c.type ?? 'text'}
                  value={form[c.key]}
                  onChange={(e) => set(c.key, e.target.value)}
                  placeholder={c.placeholder ?? c.label}
                  step={c.step}
                  min={c.min}
                  className="w-full text-[12px] border border-[#dde8e8] rounded-md px-2 py-1 focus:outline-none focus:border-[#012d1d] bg-white"
                />
              )}
            </td>
          ))}
          {/* Aplica/Base ya está en campos */}
          <td className="px-3 py-2 text-center">
            <span className="text-[11px] text-[#aebfbf]">—</span>
          </td>
          <td className="px-3 py-2">
            <div className="flex items-center gap-1.5 justify-end">
              <button
                onClick={guardar}
                disabled={saving}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#012d1d] text-white text-[11px] font-semibold rounded-md hover:bg-[#1a3d2d] transition-colors disabled:opacity-60"
              >
                {saving ? <Spinner size="xs" className="text-white" /> : <Check className="w-3 h-3" />}
                Guardar
              </button>
              <button
                onClick={cancelar}
                className="flex items-center gap-1 px-2 py-1 border border-[#dde8e8] text-[#6b8f8f] text-[11px] rounded-md hover:bg-[#f5f8f8] transition-colors"
              >
                <X className="w-3 h-3" /> Cancelar
              </button>
            </div>
            {err && <p className="text-[10.5px] text-red-500 mt-1 text-right">{err}</p>}
          </td>
        </tr>
      </>
    );
  }

  return (
    <tr className="border-b border-[#f0f5f5] hover:bg-[#f5faf8] transition-colors group">
      {campos.map((c) => (
        <td key={c.key} className="px-3 py-2.5 text-[12px] text-[#374040]">
          {c.render ? c.render(item[c.key]) : item[c.key]}
        </td>
      ))}
      {/* Activo */}
      <td className="px-3 py-2.5 text-center">
        <button
          onClick={() => onToggle(item.id, !item.activo)}
          title={item.activo ? 'Desactivar' : 'Activar'}
          className="flex items-center justify-center"
        >
          {item.activo
            ? <ToggleRight className="w-6 h-6 text-emerald-600" />
            : <ToggleLeft  className="w-6 h-6 text-[#aebfbf]" />}
        </button>
      </td>
      {/* Editar */}
      <td className="px-3 py-2.5">
        <div className="flex justify-end">
          <button
            onClick={() => setEditando(true)}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 border border-[#dde8e8] text-[12px] text-[#6b8f8f] rounded-md hover:bg-[#f0faf5] hover:text-[#012d1d] transition-all"
          >
            <Pencil className="w-3 h-3" /> Editar
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Tabla genérica ────────────────────────────────────────────────────────────
function TablaParametros({ titulo, icon, headers, campos, endpoint, colorHeader, btnLabel }) {
  const [filas, setFilas]       = useState([]);
  const [cargando, setCargando] = useState(true);
  const [agregando, setAgregando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setFilas(await fetchAll(endpoint)); }
    catch { /* silencioso */ }
    finally { setCargando(false); }
  }, [endpoint]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleSave(id, form) {
    const saved = await save(endpoint, id, form);
    if (id) {
      setFilas((prev) => prev.map((f) => (f.id === id ? saved : f)));
    } else {
      setFilas((prev) => [saved, ...prev]);
      setAgregando(false);
    }
    return saved;
  }

  async function handleToggle(id, activo) {
    const saved = await toggle(endpoint, id, activo);
    setFilas((prev) => prev.map((f) => (f.id === id ? saved : f)));
  }

  const colCount = campos.length + 2;

  return (
    <ContentCard className="mb-5">
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#f0f5f5]">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-[20px] ${colorHeader}`}>{icon}</span>
          <h3 className="text-[13px] font-bold text-[#1a2e2e]">{titulo}</h3>
          <span className="text-[11px] text-[#aebfbf] font-medium ml-1">({filas.length})</span>
        </div>
        <button
          onClick={() => setAgregando(true)}
          disabled={agregando}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#012d1d] text-white text-[12px] font-semibold rounded-md hover:bg-[#1a3d2d] transition-colors disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> {btnLabel}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: '540px' }}>
          <thead>
            <tr className="border-b border-[#f0f5f5] bg-[#f8fafa]">
              {headers.map((h) => (
                <th key={h.label} className={`px-3 py-2 text-[10.5px] font-semibold text-[#6b8f8f] uppercase tracking-wide ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={h.width ? { width: h.width } : {}}>
                  {h.label}
                </th>
              ))}
              <th className="px-3 py-2 text-center text-[10.5px] font-semibold text-[#6b8f8f] uppercase tracking-wide" style={{ width: '70px' }}>Activo</th>
              <th className="px-3 py-2" style={{ width: '90px' }} />
            </tr>
          </thead>
          <tbody>
            {agregando && (
              <FilaEditable
                item={null}
                campos={campos}
                onSave={handleSave}
                onToggle={handleToggle}
                isNew
                onCancelNew={() => setAgregando(false)}
              />
            )}
            {cargando ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-[12px] text-[#aebfbf]">
                  <Spinner size="sm" className="text-[#aebfbf] inline-block mr-2" />Cargando…
                </td>
              </tr>
            ) : filas.length === 0 && !agregando ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-[12px] text-[#aebfbf] italic">
                  Sin registros. Usa "{btnLabel}" para agregar.
                </td>
              </tr>
            ) : (
              filas.map((f) => (
                <FilaEditable
                  key={f.id}
                  item={f}
                  campos={campos}
                  onSave={handleSave}
                  onToggle={handleToggle}
                  isNew={false}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </ContentCard>
  );
}

// ─── Configuración de campos por tabla ────────────────────────────────────────
const CAMPOS_IMPUESTO = [
  {
    key: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: IVA 19%',
    render: (v) => <span className="font-semibold text-[#1a2e2e]">{v}</span>,
  },
  {
    key: 'tasa', label: 'Tasa %', type: 'number', required: true, step: '0.01', min: '0',
    placeholder: '0.00',
    render: (v) => <span className="font-mono font-bold text-[#012d1d]">{fmtTasa(v)}</span>,
  },
  {
    key: 'aplica_a', label: 'Aplica a', type: 'select', default: 'AMBOS',
    options: [
      { value: 'COMPRAS', label: 'Compras' },
      { value: 'VENTAS',  label: 'Ventas' },
      { value: 'AMBOS',   label: 'Ambos' },
    ],
    render: (v) => {
      const MAP = { COMPRAS: 'blue', VENTAS: 'green', AMBOS: 'purple' };
      return <Chip label={APLICA_LABEL[v] ?? v} color={MAP[v] ?? 'blue'} />;
    },
  },
];

const CAMPOS_RETENCION = [
  {
    key: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Retefuente 3.5%',
    render: (v) => <span className="font-semibold text-[#1a2e2e]">{v}</span>,
  },
  {
    key: 'tasa', label: 'Tasa %', type: 'number', required: true, step: '0.01', min: '0',
    placeholder: '0.00',
    render: (v) => <span className="font-mono font-bold text-[#012d1d]">{fmtTasa(v)}</span>,
  },
  {
    key: 'base', label: 'Base', type: 'select', default: 'COMPRAS',
    options: [
      { value: 'COMPRAS', label: 'Compras' },
      { value: 'PAGOS',   label: 'Pagos' },
    ],
    render: (v) => <Chip label={BASE_LABEL[v] ?? v} color={v === 'PAGOS' ? 'amber' : 'blue'} />,
  },
];

const HEADERS_IMPUESTO = [
  { label: 'Nombre del impuesto' },
  { label: 'Tasa',   width: '100px', align: 'left' },
  { label: 'Aplica a', width: '120px' },
];

const HEADERS_RETENCION = [
  { label: 'Nombre de la retención' },
  { label: 'Tasa',  width: '100px', align: 'left' },
  { label: 'Base',  width: '120px' },
];

// ─── Pantalla principal ────────────────────────────────────────────────────────
export default function ConfigImpuestosRetenciones() {
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

        <PageHeader
          title="Parámetros de Impuestos y Retenciones"
          subtitle="Configura las tarifas de IVA y retenciones aplicadas en compras y ventas"
        />

        {/* Info banner */}
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-500 text-[18px] flex-shrink-0 mt-0.5">info</span>
          <p className="text-[12px] text-blue-700">
            Los cambios aquí son de configuración global. Los impuestos y retenciones desactivados no aparecerán como opciones en nuevos documentos.
          </p>
        </div>

        {/* Tabla Impuestos */}
        <TablaParametros
          titulo="Impuestos (IVA / VAT)"
          icon="receipt_long"
          colorHeader="text-emerald-700"
          headers={HEADERS_IMPUESTO}
          campos={CAMPOS_IMPUESTO}
          endpoint="impuestos"
          btnLabel="Agregar Impuesto"
        />

        {/* Tabla Retenciones */}
        <TablaParametros
          titulo="Retenciones"
          icon="percent"
          colorHeader="text-violet-700"
          headers={HEADERS_RETENCION}
          campos={CAMPOS_RETENCION}
          endpoint="retenciones"
          btnLabel="Agregar Retención"
        />

      </div>
    </main>
  );
}
