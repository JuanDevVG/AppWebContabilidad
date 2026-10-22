import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, Plus, Folder, FolderOpen, FileText, Trash2 } from 'lucide-react';
import {
  PageHeader, ContentCard,
  BtnPrimary, BtnSecondary, BtnDestructive,
  Badge, Field, FieldInput, FieldSelect, FieldTextarea,
  AlertError, AlertSuccess, Spinner, Toggle,
} from '../ui/index.jsx';
import {
  getCuentasContables, createCuentaContable,
  updateCuentaContable, deleteCuentaContable,
} from '../utils/apiService.js';

// ── Constants ────────────────────────────────────────────────────────────────

const TIPOS = [
  { value: 'ACTIVO',     label: 'Activo' },
  { value: 'PASIVO',     label: 'Pasivo' },
  { value: 'PATRIMONIO', label: 'Patrimonio' },
  { value: 'INGRESO',    label: 'Ingreso' },
  { value: 'COSTO',      label: 'Costo' },
  { value: 'GASTO',      label: 'Gasto' },
];

const TIPO_VARIANT = {
  ACTIVO:     'info',
  PASIVO:     'warning',
  PATRIMONIO: 'violet',
  INGRESO:    'active',
  COSTO:      'amber',
  GASTO:      'critical',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildTree(flat) {
  const byId  = {};
  const roots = [];
  flat.forEach(c => { byId[c.id] = { ...c, children: [] }; });
  flat.forEach(c => {
    if (c.padre_id != null && byId[c.padre_id]) {
      byId[c.padre_id].children.push(byId[c.id]);
    } else {
      roots.push(byId[c.id]);
    }
  });
  return roots;
}

function getAllIds(nodes) {
  const ids = new Set();
  const visit = (ns) => ns.forEach(n => { ids.add(n.id); if (n.children) visit(n.children); });
  visit(nodes);
  return ids;
}

// ── Tree node ────────────────────────────────────────────────────────────────

function TreeNode({ node, depth, selected, onSelect, expanded, onToggle }) {
  const hasKids = node.children?.length > 0;
  const isOpen  = expanded.has(node.id);
  const isSel   = selected?.id === node.id;

  return (
    <>
      <div
        style={{ paddingLeft: 12 + depth * 20 }}
        className={`flex items-center gap-1.5 pr-3 py-[5px] rounded-md cursor-pointer select-none transition-colors ${
          isSel
            ? 'bg-[#012d1d]/[0.07] text-[#1a2e2e]'
            : 'hover:bg-[#f0f5f5] text-[#374040]'
        } ${!node.activo ? 'opacity-40' : ''}`}
        onClick={() => onSelect(node)}
      >
        {/* Expand chevron */}
        <span
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
          onClick={hasKids ? (e) => { e.stopPropagation(); onToggle(node.id); } : undefined}
        >
          {hasKids && (
            <ChevronRight
              className={`w-3.5 h-3.5 text-[#aebfbf] transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
            />
          )}
        </span>

        {/* Folder / file icon */}
        {hasKids
          ? isOpen
            ? <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
            : <Folder     className="w-4 h-4 text-amber-500 flex-shrink-0" />
          : <FileText className="w-3.5 h-3.5 text-[#c4d4d4] flex-shrink-0" />
        }

        {/* Code */}
        <span className="font-mono text-[11px] text-[#6b8f8f] w-[4.5rem] flex-shrink-0">
          {node.codigo}
        </span>

        {/* Name */}
        <span className={`flex-1 text-[13px] truncate ${isSel ? 'font-semibold' : 'font-medium'}`}>
          {node.nombre}
        </span>

        {/* Type badge */}
        <Badge variant={TIPO_VARIANT[node.tipo] ?? 'neutral'}>
          {TIPOS.find(t => t.value === node.tipo)?.label ?? node.tipo}
        </Badge>

        {/* Acepta transacciones indicator */}
        {node.acepta_transacciones && (
          <span
            className="material-symbols-outlined text-[14px] text-emerald-500 flex-shrink-0"
            title="Acepta transacciones"
          >
            check_circle
          </span>
        )}
      </div>

      {/* Children */}
      {hasKids && isOpen && node.children.map(child => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

// ── Edit / Add panel ─────────────────────────────────────────────────────────

const BLANK = {
  codigo: '', nombre: '', tipo: 'ACTIVO',
  acepta_transacciones: false, padre_id: '', descripcion: '',
};

function PanelForm({ mode, cuenta, cuentas, onSave, onCancel, onDelete, error, success }) {
  const [form, setForm] = useState(() =>
    mode === 'edit' && cuenta
      ? {
          codigo:               cuenta.codigo,
          nombre:               cuenta.nombre,
          tipo:                 cuenta.tipo,
          acepta_transacciones: cuenta.acepta_transacciones,
          padre_id:             cuenta.padre_id ?? '',
          descripcion:          cuenta.descripcion ?? '',
          activo:               cuenta.activo,
        }
      : { ...BLANK }
  );
  const [saving, setSaving] = useState(false);

  // Sync form when switching selected account
  useEffect(() => {
    setForm(
      mode === 'edit' && cuenta
        ? {
            codigo:               cuenta.codigo,
            nombre:               cuenta.nombre,
            tipo:                 cuenta.tipo,
            acepta_transacciones: cuenta.acepta_transacciones,
            padre_id:             cuenta.padre_id ?? '',
            descripcion:          cuenta.descripcion ?? '',
            activo:               cuenta.activo,
          }
        : { ...BLANK }
    );
  }, [cuenta?.id, mode]);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function submit() {
    setSaving(true);
    try {
      await onSave({ ...form, padre_id: form.padre_id || null });
    } catch {
      // error displayed by parent
    } finally {
      setSaving(false);
    }
  }

  const canDelete = mode === 'edit' && cuenta && !(cuenta.children?.length);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#e4ecec] flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[13px] font-semibold text-[#1a2e2e]">
            {mode === 'add' ? 'Nueva Cuenta' : 'Editar Cuenta'}
          </p>
          {cuenta && (
            <p className="text-[11px] text-[#6b8f8f] font-mono mt-px">{cuenta.codigo}</p>
          )}
        </div>
        {canDelete && (
          <BtnDestructive onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </BtnDestructive>
        )}
      </div>

      {/* Alerts */}
      {error   && <div className="px-4 pt-3"><AlertError>{error}</AlertError></div>}
      {success && <div className="px-4 pt-3"><AlertSuccess>{success}</AlertSuccess></div>}

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Código" required>
            <FieldInput
              value={form.codigo}
              onChange={e => set('codigo', e.target.value)}
              placeholder="Ej: 1.1.01"
            />
          </Field>
          <Field label="Tipo" required>
            <FieldSelect value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </FieldSelect>
          </Field>
        </div>

        <Field label="Nombre" required>
          <FieldInput
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
            placeholder="Nombre descriptivo de la cuenta"
          />
        </Field>

        <Field label="Cuenta Padre" hint="Vacío para cuenta raíz">
          <FieldSelect value={form.padre_id} onChange={e => set('padre_id', e.target.value)}>
            <option value="">— Sin padre (raíz) —</option>
            {cuentas
              .filter(c => !cuenta || c.id !== cuenta.id)
              .map(c => (
                <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>
              ))}
          </FieldSelect>
        </Field>

        <Field label="Descripción">
          <FieldTextarea
            value={form.descripcion}
            onChange={e => set('descripcion', e.target.value)}
            rows={2}
            placeholder="Notas adicionales (opcional)"
          />
        </Field>

        <div className="flex items-center justify-between py-2.5 px-3 bg-[#f5f8f8] rounded-md">
          <div>
            <p className="text-[13px] font-medium text-[#1a2e2e]">Acepta transacciones</p>
            <p className="text-[11px] text-[#6b8f8f]">Solo cuentas hoja reciben movimientos</p>
          </div>
          <Toggle
            checked={form.acepta_transacciones}
            onChange={() => set('acepta_transacciones', !form.acepta_transacciones)}
          />
        </div>

        {mode === 'edit' && (
          <div className="flex items-center justify-between py-2.5 px-3 bg-[#f5f8f8] rounded-md">
            <div>
              <p className="text-[13px] font-medium text-[#1a2e2e]">Cuenta activa</p>
              <p className="text-[11px] text-[#6b8f8f]">Inactiva no aparece en movimientos</p>
            </div>
            <Toggle
              checked={form.activo}
              onChange={() => set('activo', !form.activo)}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#e4ecec] flex gap-2.5 flex-shrink-0">
        <BtnSecondary onClick={onCancel} disabled={saving} className="flex-1">
          Cancelar
        </BtnSecondary>
        <BtnPrimary onClick={submit} loading={saving} disabled={saving} className="flex-1">
          {mode === 'add' ? 'Crear Cuenta' : 'Guardar'}
        </BtnPrimary>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlanCuentas() {
  const [cuentas,   setCuentas]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [pageErr,   setPageErr]   = useState('');
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [panelMode, setPanelMode] = useState(null);  // null | 'edit' | 'add'
  const [expanded,  setExpanded]  = useState(new Set());
  const [formErr,   setFormErr]   = useState('');
  const [formOk,    setFormOk]    = useState('');

  const load = useCallback(async () => {
    setLoading(true); setPageErr('');
    try {
      const data = await getCuentasContables();
      setCuentas(data);
      setExpanded(prev => {
        if (prev.size === 0) {
          return new Set(data.filter(c => c.padre_id == null).map(c => c.id));
        }
        return prev;
      });
    } catch (e) {
      setPageErr(e.message || 'Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tree = useMemo(() => buildTree(cuentas), [cuentas]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return cuentas.filter(c =>
      c.codigo.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q)
    );
  }, [cuentas, search]);

  const displayTree = useMemo(
    () => (filtered ? buildTree(filtered) : tree),
    [filtered, tree]
  );

  const visibleExpanded = useMemo(
    () => (filtered ? getAllIds(displayTree) : expanded),
    [filtered, displayTree, expanded]
  );

  function toggle(id) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function select(node) {
    // Pass enriched node with children array from tree
    const rich = displayTree.flatMap(function flat(n) {
      return [n, ...(n.children || []).flatMap(flat)];
    }).find(n => n.id === node.id) ?? node;
    setSelected(rich);
    setPanelMode('edit');
    setFormErr(''); setFormOk('');
  }

  function openAdd() {
    setSelected(null); setPanelMode('add');
    setFormErr(''); setFormOk('');
  }

  async function handleSave(payload) {
    setFormErr('');
    try {
      if (panelMode === 'add') {
        await createCuentaContable(payload);
        await load();
        setPanelMode(null);
        setFormOk('Cuenta creada.');
        setTimeout(() => setFormOk(''), 3000);
      } else {
        const updated = await updateCuentaContable(selected.id, payload);
        await load();
        setSelected(updated);
        setFormOk('Cambios guardados.');
        setTimeout(() => setFormOk(''), 3000);
      }
    } catch (err) {
      setFormErr(err.message || 'Error al guardar');
      throw err;
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`¿Eliminar "${selected.codigo} – ${selected.nombre}"?`)) return;
    setFormErr('');
    try {
      await deleteCuentaContable(selected.id);
      setSelected(null); setPanelMode(null);
      await load();
    } catch (err) {
      setFormErr(err.message || 'Error al eliminar');
    }
  }

  const count = filtered ? filtered.length : cuentas.length;

  return (
    <main className="flex-1 flex flex-col bg-[#f5f8f8] overflow-hidden">
      <div className="px-6 pt-6 pb-3">
        <PageHeader
          title="Plan de Cuentas"
          subtitle="Catálogo jerárquico de cuentas contables"
        >
          <BtnPrimary onClick={openAdd}>
            <Plus className="w-4 h-4" />
            Agregar Cuenta
          </BtnPrimary>
        </PageHeader>
      </div>

      {pageErr && (
        <div className="px-6 pb-2">
          <AlertError onRetry={load}>{pageErr}</AlertError>
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-hidden px-6 pb-6">
        {/* ── Tree panel ── */}
        <ContentCard className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Search bar */}
          <div className="px-4 py-3 border-b border-[#e4ecec]">
            <FieldInput
              icon="search"
              placeholder="Buscar por código o nombre…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Legend */}
          <div className="px-4 py-2 border-b border-[#f0f5f5] flex items-center gap-4 text-[11px] text-[#6b8f8f]">
            <span className="flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-amber-500" /> Grupo
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#c4d4d4]" /> Cuenta detalle
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-emerald-500">check_circle</span>
              Acepta transacciones
            </span>
          </div>

          {/* Tree content */}
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="md" className="text-[#aebfbf]" />
              </div>
            ) : displayTree.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-[40px] text-[#c4d4d4]">
                  account_tree
                </span>
                <p className="text-[13px] font-medium text-[#6b8f8f] mt-2">
                  {search ? 'Sin resultados' : 'No hay cuentas aún'}
                </p>
                {!search && (
                  <p className="text-[12px] text-[#aebfbf] mt-1">
                    Haz clic en "Agregar Cuenta" para comenzar
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-px">
                {displayTree.map(node => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    selected={selected}
                    onSelect={select}
                    expanded={visibleExpanded}
                    onToggle={toggle}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
            {filtered
              ? `${count} resultado${count !== 1 ? 's' : ''} de ${cuentas.length}`
              : `${count} cuenta${count !== 1 ? 's' : ''}`}
          </div>
        </ContentCard>

        {/* ── Right panel ── */}
        {panelMode && (
          <ContentCard className="w-[300px] flex-shrink-0 overflow-hidden flex flex-col">
            <PanelForm
              mode={panelMode}
              cuenta={selected}
              cuentas={cuentas}
              onSave={handleSave}
              onCancel={() => { setPanelMode(null); setSelected(null); setFormErr(''); setFormOk(''); }}
              onDelete={handleDelete}
              error={formErr}
              success={formOk}
            />
          </ContentCard>
        )}
      </div>
    </main>
  );
}
