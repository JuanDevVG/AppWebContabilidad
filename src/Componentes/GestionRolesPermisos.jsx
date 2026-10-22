import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { getRolesPermisos, saveRolesPermisos } from '../utils/apiService';
import {
  BtnPrimary,
  AlertError,
  AlertSuccess,
  PageHeader,
  ContentCard,
  Spinner,
} from '../ui/index.jsx';

export const ROLES_SISTEMA = ['Administrador', 'Contabilidad', 'Almacén', 'Producción', 'Solo Lectura'];

const SECCIONES = [
  {
    id: 'catalogo',
    label: 'Catálogo Maestro',
    icon: 'inventory_2',
    modulos: [
      { id: 'catalogo_productos', label: 'Productos e Insumos' },
      { id: 'catalogo_proveedores', label: 'Proveedores' },
      { id: 'catalogo_galpones', label: 'Galpones' },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: 'inventory',
    modulos: [
      { id: 'inventario_existencias', label: 'Existencias Actuales' },
      { id: 'inventario_kardex', label: 'Kardex por Producto' },
      { id: 'inventario_toma_fisica', label: 'Toma Física' },
      { id: 'inventario_ajustes', label: 'Ajustes' },
      { id: 'inventario_stock_minimo', label: 'Config. Stock Mínimo' },
      { id: 'inventario_consumo', label: 'Consumo de Insumos' },
    ],
  },
  {
    id: 'ventas',
    label: 'Ventas y Facturación',
    icon: 'point_of_sale',
    modulos: [
      { id: 'ventas_clientes', label: 'Clientes' },
      { id: 'ventas_pedidos',  label: 'Pedidos / Ventas' },
    ],
  },
  {
    id: 'produccion',
    label: 'Producción',
    icon: 'agriculture',
    modulos: [
      { id: 'produccion_lotes',       label: 'Gestión de Lotes' },
      { id: 'produccion_beneficio',   label: 'Registro de Beneficio' },
      { id: 'produccion_catalogo_pt', label: 'Catálogo Prod. Terminados' },
      { id: 'produccion_stock_pt',    label: 'Stock Prod. Terminado' },
    ],
  },
  {
    id: 'compras',
    label: 'Compras',
    icon: 'shopping_cart',
    modulos: [
      {
        id: 'compras_solicitudes',
        label: 'Solicitudes de Compra',
        accionesEspeciales: [
          { id: 'puede_aprobar', label: 'Aprobar / Rechazar' },
          { id: 'puede_generar_oc', label: 'Generar OC' },
        ],
      },
      { id: 'compras_ordenes', label: 'Órdenes de Compra' },
      { id: 'compras_recepciones', label: 'Recepción de Mercancía' },
      { id: 'compras_facturas', label: 'Facturas de Proveedor' },
      { id: 'compras_cuentas_pagar', label: 'Cuentas por Pagar' },
    ],
  },
  {
    id: 'contabilidad',
    label: 'Contabilidad',
    icon: 'calculate',
    modulos: [
      { id: 'contabilidad_transacciones',  label: 'Transacciones' },
      { id: 'contabilidad_inversores',     label: 'Inversores' },
      { id: 'contabilidad_categorias',     label: 'Categorías' },
      { id: 'contabilidad_conciliacion',   label: 'Conciliación Bancaria' },
      { id: 'conta_concil_reabrir',        label: 'Conciliación: Reabrir (sensible)' },
    ],
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: 'settings',
    modulos: [
      { id: 'config_empresa', label: 'Parámetros de Empresa (consulta)' },
      { id: 'config_unidades', label: 'Unidades de Medida' },
      { id: 'config_roles', label: 'Roles y Permisos' },
      { id: 'config_auditoria', label: 'Bitácora de Auditoría' },
    ],
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: 'manage_accounts',
    modulos: [
      { id: 'usuarios_gestion', label: 'Gestión de Usuarios' },
    ],
  },
];

const ACCIONES = [
  { id: 'puede_ver', label: 'Ver' },
  { id: 'puede_crear', label: 'Crear' },
  { id: 'puede_editar', label: 'Editar' },
  { id: 'puede_eliminar', label: 'Eliminar' },
];

const ALL_MODULOS = SECCIONES.flatMap((s) => s.modulos);

const ROL_ICONS = {
  Administrador: 'shield_person',
  Contabilidad: 'calculate',
  Almacén: 'warehouse',
  Producción: 'factory',
  'Solo Lectura': 'visibility',
};

function emptyMatrix() {
  const matrix = {};
  ROLES_SISTEMA.forEach((rol) => {
    matrix[rol] = {};
    ALL_MODULOS.forEach((mod) => {
      const perms = { puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false };
      (mod.accionesEspeciales ?? []).forEach((ae) => { perms[ae.id] = false; });
      matrix[rol][mod.id] = perms;
    });
  });
  return matrix;
}

export function GestionRolesPermisos() {
  const [matrix, setMatrix] = useState(emptyMatrix);
  const [rolSeleccionado, setRolSeleccionado] = useState(ROLES_SISTEMA[0]);
  const [seccionesAbiertas, setSeccionesAbiertas] = useState(() => {
    const s = {};
    SECCIONES.forEach((sec) => { s[sec.id] = true; });
    return s;
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => { cargarPermisos(); }, []);

  async function cargarPermisos() {
    setCargando(true);
    setError('');
    try {
      const data = await getRolesPermisos();
      const next = emptyMatrix();
      data.forEach((p) => {
        if (next[p.rol]?.[p.modulo] !== undefined) {
          const entry = next[p.rol][p.modulo];
          next[p.rol][p.modulo] = {
            ...entry,
            puede_ver: p.puede_ver ?? false,
            puede_crear: p.puede_crear ?? false,
            puede_editar: p.puede_editar ?? false,
            puede_eliminar: p.puede_eliminar ?? false,
            puede_aprobar: p.puede_aprobar ?? false,
            puede_generar_oc: p.puede_generar_oc ?? false,
          };
        }
      });
      setMatrix(next);
    } catch (err) {
      setError(err.message || 'Error al cargar permisos');
    } finally {
      setCargando(false);
    }
  }

  function togglePermiso(modulo, accion) {
    setMatrix((prev) => ({
      ...prev,
      [rolSeleccionado]: {
        ...prev[rolSeleccionado],
        [modulo]: {
          ...prev[rolSeleccionado][modulo],
          [accion]: !prev[rolSeleccionado][modulo][accion],
        },
      },
    }));
    setExito('');
  }

  function toggleSeccionAccion(seccion, accion) {
    const todosActivos = seccion.modulos.every(
      (m) => matrix[rolSeleccionado]?.[m.id]?.[accion] ?? false
    );
    const nuevoValor = !todosActivos;
    setMatrix((prev) => {
      const rolActual = { ...prev[rolSeleccionado] };
      seccion.modulos.forEach((m) => {
        rolActual[m.id] = { ...rolActual[m.id], [accion]: nuevoValor };
      });
      return { ...prev, [rolSeleccionado]: rolActual };
    });
    setExito('');
  }

  function toggleSeccion(id) {
    setSeccionesAbiertas((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function guardar() {
    setGuardando(true);
    setError('');
    setExito('');
    const permisos = ALL_MODULOS.map((mod) => ({
      modulo: mod.id,
      ...matrix[rolSeleccionado][mod.id],
    }));
    try {
      await saveRolesPermisos({ rol: rolSeleccionado, permisos });
      setExito(`Permisos de "${rolSeleccionado}" guardados correctamente.`);
    } catch (err) {
      setError(err.message || 'Error al guardar permisos');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <div className="max-w-5xl mx-auto">

          <PageHeader
            title="Roles y Permisos"
            subtitle="Configura qué acciones puede realizar cada rol en cada módulo del sistema"
          />

          {error && <AlertError onRetry={cargarPermisos}>{error}</AlertError>}
          {exito && <AlertSuccess>{exito}</AlertSuccess>}

          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-20 text-[#6b8f8f]">
              <Spinner size="md" className="text-[#6b8f8f]" />
              <span className="text-[13px]">Cargando permisos...</span>
            </div>
          ) : (
            <div className="flex gap-5 items-start">

              {/* Panel izquierdo — lista de roles */}
              <div className="w-52 flex-shrink-0">
                <ContentCard>
                  <div className="px-4 py-2.5 border-b border-[#f0f5f5]">
                    <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">
                      Roles
                    </p>
                  </div>
                  <nav className="py-1.5">
                    {ROLES_SISTEMA.map((rol) => {
                      const activo = rolSeleccionado === rol;
                      return (
                        <button
                          key={rol}
                          onClick={() => { setRolSeleccionado(rol); setExito(''); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-left transition-all duration-150 border-l-2 ${
                            activo
                              ? 'bg-[#f0f7f5] text-[#012d1d] border-[#012d1d]'
                              : 'text-[#4a6b6b] hover:bg-[#f5f9f9] hover:text-[#1a2e2e] border-transparent'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[17px] flex-shrink-0 ${activo ? 'text-[#012d1d] material-filled' : 'text-[#aebfbf]'}`}>
                            {ROL_ICONS[rol] ?? 'person'}
                          </span>
                          <span className="leading-tight">{rol}</span>
                        </button>
                      );
                    })}
                  </nav>
                </ContentCard>
              </div>

              {/* Panel derecho — matriz con acordeones */}
              <div className="flex-1 min-w-0">
                <ContentCard>
                  <div className="px-4 py-3 border-b border-[#f0f5f5] flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-semibold text-[#1a2e2e]">
                        Permisos:{' '}
                        <span className="text-[#012d1d]">{rolSeleccionado}</span>
                      </p>
                      <p className="text-[11px] text-[#6b8f8f] mt-0.5">
                        Las cabeceras de sección marcan o desmarcan todos sus módulos
                      </p>
                    </div>
                    <BtnPrimary onClick={guardar} disabled={guardando} loading={guardando}>
                      {!guardando && (
                        <span className="material-symbols-outlined text-[15px]">save</span>
                      )}
                      Guardar
                    </BtnPrimary>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#e4ecec] bg-[#fafcfc]">
                          <th className="px-4 py-2.5 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">
                            Módulo
                          </th>
                          {ACCIONES.map((a) => (
                            <th
                              key={a.id}
                              className="px-4 py-2.5 text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider text-center w-24"
                            >
                              {a.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {SECCIONES.map((seccion) => {
                          const abierto = seccionesAbiertas[seccion.id] ?? true;
                          return (
                            <SeccionAcordeon
                              key={seccion.id}
                              seccion={seccion}
                              abierto={abierto}
                              matrix={matrix[rolSeleccionado]}
                              onToggleSeccion={() => toggleSeccion(seccion.id)}
                              onTogglePermiso={togglePermiso}
                              onToggleSeccionAccion={(accion) => toggleSeccionAccion(seccion, accion)}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-4 py-2.5 border-t border-[#f0f5f5] text-[12px] text-[#6b8f8f]">
                    {SECCIONES.length} secciones · {ALL_MODULOS.length} módulos · {ACCIONES.length} acciones
                  </div>
                </ContentCard>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function FilaModulo({ mod, idx, matrix, onTogglePermiso }) {
  const tieneEspeciales = (mod.accionesEspeciales ?? []).length > 0;
  const [especilesAbierto, setEspecialesAbierto] = useState(false);

  return (
    <>
      <tr
        className={`border-b border-[#f0f5f5] transition-colors ${idx % 2 === 0 ? 'hover:bg-[#fafcfc]' : 'bg-[#fdfefe] hover:bg-[#f7fbfb]'}`}
      >
        <td className="pl-10 pr-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="w-px h-3 bg-[#d4e4e4] flex-shrink-0" />
            {tieneEspeciales ? (
              <button
                type="button"
                onClick={() => setEspecialesAbierto((v) => !v)}
                className="flex items-center gap-1.5 group/modulo"
                title="Ver acciones especiales"
              >
                <ChevronDown
                  className={`w-3 h-3 text-[#aebfbf] group-hover/modulo:text-[#6b8f8f] flex-shrink-0 transition-transform duration-150 ${especilesAbierto ? '' : '-rotate-90'}`}
                />
                <span className="text-[13px] text-[#374040] group-hover/modulo:text-[#1a2e2e]">{mod.label}</span>
              </button>
            ) : (
              <span className="text-[13px] text-[#374040]">{mod.label}</span>
            )}
          </div>
        </td>
        {ACCIONES.map((accion) => (
          <td key={accion.id} className="px-4 py-2.5 text-center">
            <input
              type="checkbox"
              checked={matrix?.[mod.id]?.[accion.id] ?? false}
              onChange={() => onTogglePermiso(mod.id, accion.id)}
              className="w-4 h-4 rounded border-[#c4d4d4] cursor-pointer accent-[#012d1d]"
              title={`${accion.label}: ${mod.label}`}
            />
          </td>
        ))}
      </tr>

      {/* Filas de acciones especiales (acordeón interno) */}
      {tieneEspeciales && especilesAbierto && (mod.accionesEspeciales ?? []).map((ae) => (
        <tr key={ae.id} className="border-b border-[#f0f5f5] bg-[#f9fcfc]">
          <td className="pl-16 pr-4 py-2">
            <div className="flex items-center gap-2">
              <span className="w-px h-3 bg-[#c4e4e0] flex-shrink-0" />
              <span className="material-symbols-outlined text-[13px] text-[#6b8f8f]">
                admin_panel_settings
              </span>
              <span className="text-[12px] text-[#4a6b6b] italic">{ae.label}</span>
            </div>
          </td>
          <td className="px-4 py-2 text-center">
            <input
              type="checkbox"
              checked={matrix?.[mod.id]?.[ae.id] ?? false}
              onChange={() => onTogglePermiso(mod.id, ae.id)}
              className="w-4 h-4 rounded border-[#a0c4c0] cursor-pointer accent-[#012d1d]"
              title={`${ae.label}: ${mod.label}`}
            />
          </td>
          {/* Celdas vacías para mantener el alineado de columnas */}
          <td /><td /><td />
        </tr>
      ))}
    </>
  );
}

function SeccionAcordeon({ seccion, abierto, matrix, onToggleSeccion, onTogglePermiso, onToggleSeccionAccion }) {
  return (
    <>
      {/* Cabecera de sección */}
      <tr
        className="bg-[#f5f8f8] border-y border-[#e8f0f0] cursor-pointer select-none group/header"
        onClick={onToggleSeccion}
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#6b8f8f] flex-shrink-0 transition-transform duration-200 ${abierto ? '' : '-rotate-90'}`}
            />
            <span className="material-symbols-outlined text-[17px] text-[#4a6b6b] material-filled flex-shrink-0">
              {seccion.icon}
            </span>
            <span className="text-[12px] font-semibold text-[#374040] uppercase tracking-wide">
              {seccion.label}
            </span>
            <span className="text-[11px] text-[#aebfbf] font-normal normal-case tracking-normal">
              ({seccion.modulos.length})
            </span>
          </div>
        </td>

        {/* Checkboxes "marcar todo" de la sección por acción */}
        {ACCIONES.map((accion) => {
          const todos = seccion.modulos.every((m) => matrix?.[m.id]?.[accion.id] ?? false);
          const algunos = !todos && seccion.modulos.some((m) => matrix?.[m.id]?.[accion.id] ?? false);
          return (
            <td key={accion.id} className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={todos}
                ref={(el) => { if (el) el.indeterminate = algunos; }}
                onChange={() => onToggleSeccionAccion(accion.id)}
                className="w-4 h-4 rounded border-[#c4d4d4] cursor-pointer accent-[#012d1d]"
                title={`${todos ? 'Desmarcar' : 'Marcar'} ${accion.label} para toda la sección`}
              />
            </td>
          );
        })}
      </tr>

      {/* Filas de sub-módulos */}
      {abierto && seccion.modulos.map((mod, idx) => (
        <FilaModulo
          key={mod.id}
          mod={mod}
          idx={idx}
          matrix={matrix}
          onTogglePermiso={onTogglePermiso}
        />
      ))}
    </>
  );
}

export default GestionRolesPermisos;
