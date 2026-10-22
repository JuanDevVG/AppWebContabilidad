import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import LogoEmpresa from '../assets/images/LogoEmpresa.png';

const NAV_ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: 'dashboard' },
  {
    id: 'catalogo',
    label: 'Catálogo Maestro',
    icon: 'inventory_2',
    children: [
      { id: 'catalogo_productos', label: 'Productos e Insumos', icon: 'category' },
      { id: 'catalogo_proveedores', label: 'Proveedores', icon: 'local_shipping' },
      { id: 'catalogo_galpones', label: 'Galpones', icon: 'warehouse' },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: 'inventory',
    children: [
      { id: 'inventario_existencias', label: 'Existencias Actuales', icon: 'shelves' },
      { id: 'inventario_kardex', label: 'Kardex por Producto', icon: 'receipt_long' },
      { id: 'inventario_toma_fisica', label: 'Toma Física', icon: 'fact_check' },
      { id: 'inventario_ajustes', label: 'Ajustes', icon: 'edit_note' },
      { id: 'inventario_stock_minimo', label: 'Config. Stock Mínimo', icon: 'tune' },
      { id: 'inventario_consumo', label: 'Consumo de Insumos', icon: 'takeout_dining' },
    ],
  },
  {
    id: 'ventas',
    label: 'Ventas y Facturación',
    icon: 'point_of_sale',
    children: [
      { id: 'ventas_clientes',       label: 'Clientes',           icon: 'people' },
      { id: 'ventas_pedidos',        label: 'Pedidos / Ventas',   icon: 'receipt_long' },
      { id: 'ventas_cuentas_cobrar', label: 'Cuentas por Cobrar', icon: 'account_balance_wallet' },
    ],
  },
  {
    id: 'contabilidad',
    label: 'Contabilidad',
    icon: 'calculate',
    children: [
      { id: 'contabilidad_plan_cuentas',  label: 'Plan de Cuentas',        icon: 'account_tree' },
      { id: 'contabilidad_asientos',     label: 'Asientos Manuales',      icon: 'edit_document' },
      { id: 'contabilidad_asientos_auto', label: 'Asientos Automáticos',  icon: 'bolt' },
      { id: 'contabilidad_caja',          label: 'Caja y Bancos',         icon: 'account_balance' },
      { id: 'contabilidad_conciliacion', label: 'Conciliación Bancaria', icon: 'compare_arrows' },
    ],
  },
  {
    id: 'produccion',
    label: 'Producción',
    icon: 'agriculture',
    children: [
      { id: 'produccion_lotes',       label: 'Gestión de Lotes',       icon: 'view_list' },
      { id: 'produccion_catalogo_pt', label: 'Catálogo Prod. Terminados', icon: 'inventory_2' },
      { id: 'produccion_stock_pt',    label: 'Stock Prod. Terminado',     icon: 'scale' },
    ],
  },
  {
    id: 'costos',
    label: 'Costos y Rentabilidad',
    icon: 'query_stats',
    children: [
      { id: 'costos_lote',          label: 'Costo por Lote',   icon: 'calculate'    },
      { id: 'costos_rentabilidad',  label: 'Rentabilidad',     icon: 'trending_up'  },
    ],
  },
  {
    id: 'compras',
    label: 'Compras',
    icon: 'shopping_cart',
    children: [
      { id: 'compras_solicitudes', label: 'Solicitudes de Compra', icon: 'shopping_cart_checkout' },
      { id: 'compras_ordenes', label: 'Órdenes de Compra', icon: 'receipt_long' },
      { id: 'compras_recepciones', label: 'Recepción de Mercancía', icon: 'move_to_inbox' },
      { id: 'compras_facturas', label: 'Facturas de Proveedor', icon: 'request_quote' },
      { id: 'compras_cuentas_pagar', label: 'Cuentas por Pagar', icon: 'payments' },
    ],
  },
  {
    id: 'documentos',
    label: 'Documentos y Adjuntos',
    icon: 'attach_file',
    children: [
      { id: 'documentos_adjuntos', label: 'Gestión de Adjuntos', icon: 'folder_open' },
    ],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: 'summarize',
    children: [
      { id: 'reportes_existencias_val', label: 'Existencias Valorizadas', icon: 'inventory_2' },
      { id: 'reportes_kardex',          label: 'Kardex',                  icon: 'receipt_long' },
      { id: 'reportes_compras',         label: 'Compras',                 icon: 'shopping_cart' },
      { id: 'reportes_cxpcxc',          label: 'CxP y CxC',               icon: 'account_balance' },
      { id: 'reportes_estado_resultados', label: 'Estado de Resultados',  icon: 'bar_chart' },
      { id: 'reportes_indicadores_prod',  label: 'Indicadores Producción', icon: 'agriculture' },
    ],
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: 'settings',
    children: [
      { id: 'config_empresa',     label: 'Parámetros de Empresa',   icon: 'domain' },
      { id: 'config_impuestos',   label: 'Impuestos y Retenciones', icon: 'receipt_long' },
      { id: 'config_numeracion', label: 'Numeración de Documentos', icon: 'tag' },
      { id: 'config_unidades', label: 'Unidades de Medida', icon: 'straighten' },
      { id: 'usuarios', label: 'Gestión de Usuarios', icon: 'manage_accounts' },
      { id: 'config_roles', label: 'Roles y Permisos', icon: 'admin_panel_settings' },
      { id: 'config_auditoria', label: 'Bitácora de Auditoría', icon: 'history' },
    ],
  },
];

function BarraNavegacion({ onLogout, vistaActiva, onCambiarVista, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const [seccionesAbiertas, setSeccionesAbiertas] = useState(() => {
    const open = {};
    NAV_ITEMS.filter((i) => i.children).forEach((i) => { open[i.id] = false; });
    return open;
  });

  function toggleSeccion(id) {
    setSeccionesAbiertas((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleParentClick(id) {
    if (collapsed && onToggleCollapse) {
      onToggleCollapse();
      setSeccionesAbiertas((prev) => ({ ...prev, [id]: true }));
      return;
    }
    toggleSeccion(id);
  }

  function isChildActive(item) {
    return item.children?.some((c) => c.id === vistaActiva);
  }

  function handleNavClick(id) {
    onCambiarVista(id);
    if (onCloseMobile) onCloseMobile();
  }

  function renderItem(item) {
    if (!item.children) {
      const activo = vistaActiva === item.id;
      return (
        <button
          key={item.id}
          onClick={() => handleNavClick(item.id)}
          title={collapsed ? item.label : undefined}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'} text-sm font-medium rounded-lg transition-all duration-150 ${
            activo
              ? 'bg-white/[0.12] text-white shadow-sm'
              : 'text-white/55 hover:bg-white/[0.07] hover:text-white/90'
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${activo ? 'material-filled' : ''}`}>
            {item.icon}
          </span>
          {!collapsed && item.label}
        </button>
      );
    }

    const estaAbierto = !collapsed && (seccionesAbiertas[item.id] || isChildActive(item));
    const tieneHijoActivo = isChildActive(item);

    return (
      <div key={item.id}>
        <button
          onClick={() => handleParentClick(item.id)}
          title={collapsed ? item.label : undefined}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'} text-sm font-medium rounded-lg transition-all duration-150 ${
            tieneHijoActivo
              ? 'bg-white/[0.12] text-white'
              : 'text-white/55 hover:bg-white/[0.07] hover:text-white/90'
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${tieneHijoActivo ? 'material-filled' : ''}`}>
            {item.icon}
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 opacity-60 ${estaAbierto ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>

        {estaAbierto && (
          <div className="mt-0.5 ml-4 pl-3 border-l border-white/[0.12] space-y-0.5 py-0.5">
            {item.children.map((child) => {
              const childActivo = vistaActiva === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => handleNavClick(child.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                    childActivo
                      ? 'bg-white/[0.12] text-white'
                      : 'text-white/50 hover:bg-white/[0.07] hover:text-white/85'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[17px] ${childActivo ? 'material-filled' : ''}`}>
                    {child.icon}
                  </span>
                  {child.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Overlay para móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          flex-col flex-shrink-0 z-40
          fixed md:relative inset-y-0 left-0
          transition-all duration-300 ease-in-out
          w-64 flex
          ${collapsed ? 'md:w-16' : 'md:w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ background: 'linear-gradient(175deg, #012d1d 0%, #021f14 60%, #011710 100%)' }}
      >
        {/* Logo */}
        <div className={`${collapsed ? 'px-3' : 'px-5'} pt-6 pb-5 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="h-10 w-10 flex-shrink-0">
              <img
                src={LogoEmpresa}
                alt="Logo"
                className="w-full h-full rounded-xl object-cover ring-1 ring-white/20"
              />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-white text-sm font-bold leading-tight tracking-wide">Capipollo</h1>
                <p className="text-[#5eead4]/70 text-[11px] font-medium mt-0.5 tracking-wider uppercase">Contabilidad</p>
              </div>
            )}
          </div>
          {/* Botón cerrar en móvil */}
          {!collapsed && (
            <button
              onClick={onCloseMobile}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:bg-white/[0.07] hover:text-white/80 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Separador */}
        <div className="mx-4 h-px bg-white/[0.08]" />

        {/* Navegación */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {/* Botón colapsar — solo desktop, encima de Inicio */}
          <div className="hidden md:block mb-1">
            <button
              onClick={onToggleCollapse}
              title={collapsed ? 'Expandir menú' : 'Menú'}
              className={`w-full flex items-center ${collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'} text-sm font-medium rounded-lg text-white/35 hover:bg-white/[0.07] hover:text-white/70 transition-all duration-150`}
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
              {!collapsed && <span>Menú</span>}
            </button>
          </div>

          <nav className="space-y-0.5">
            {NAV_ITEMS.map(renderItem)}
          </nav>
        </div>

        {/* Separador */}
        <div className="mx-4 h-px bg-white/[0.08]" />

        {/* Logout */}
        <div className={`${collapsed ? 'px-3 py-4 flex justify-center' : 'px-3 py-4'}`}>
          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? 'Cerrar sesión' : undefined}
            className={`${collapsed ? 'flex items-center justify-center w-10 h-10' : 'w-full flex items-center gap-3 px-3 py-2.5'} text-sm font-medium rounded-lg text-white/40 hover:bg-red-950/50 hover:text-red-300 transition-all duration-150`}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            {!collapsed && 'Cerrar sesión'}
          </button>
        </div>
      </aside>
    </>
  );
}

export default BarraNavegacion;
