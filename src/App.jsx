import { Component, useState } from 'react';
import ControlInversiones from './Componentes/ControlInversiones.jsx'
import GestionUsuarios from './Componentes/GestionUsuarios.jsx'
import ProductosInsumos from './Componentes/ProductosInsumos.jsx'
import UnidadesMedida from './Componentes/UnidadesMedida.jsx'
import Proveedores from './Componentes/Proveedores.jsx'
import Galpones from './Componentes/Galpones.jsx'
import KardexProducto from './Componentes/KardexProducto.jsx'
import ExistenciasActuales from './Componentes/ExistenciasActuales.jsx'
import ConfigStockMinimo from './Componentes/ConfigStockMinimo.jsx'
import TomaFisica from './Componentes/TomaFisica.jsx'
import AjustesInventario from './Componentes/AjustesInventario.jsx'
import ConsumoInsumos from './Componentes/ConsumoInsumos.jsx'
import GestionLotes from './Componentes/GestionLotes.jsx'
import CostoPorLote from './Componentes/CostoPorLote.jsx'
import RentabilidadLote from './Componentes/RentabilidadLote.jsx'
import ExistenciasValorizadas from './Componentes/ExistenciasValorizadas.jsx'
import ReporteKardex from './Componentes/ReporteKardex.jsx'
import ReporteCompras from './Componentes/ReporteCompras.jsx'
import ReporteCxPCxC from './Componentes/ReporteCxPCxC.jsx'
import ReporteEstadoResultados from './Componentes/ReporteEstadoResultados.jsx'
import ReporteIndicadoresProduccion from './Componentes/ReporteIndicadoresProduccion.jsx'
import DocumentosAdjuntos from './Componentes/DocumentosAdjuntos.jsx'
import ConfigImpuestosRetenciones from './Componentes/ConfigImpuestosRetenciones.jsx'
import ConfigNumeracion from './Componentes/ConfigNumeracion.jsx'
import ParametrosEmpresa from './Componentes/ParametrosEmpresa.jsx'
import Clientes from './Componentes/Clientes.jsx'
import PedidosVenta from './Componentes/PedidosVenta.jsx'
import CatalogoProductoTerminado from './Componentes/CatalogoProductoTerminado.jsx'
import StockProductoTerminado from './Componentes/StockProductoTerminado.jsx'
import SolicitudesCompra from './Componentes/SolicitudesCompra.jsx'
import OrdenesCompra from './Componentes/OrdenesCompra.jsx'
import RecepcionMercanciaView from './Componentes/RecepcionMercancia.jsx'
import FacturasProveedor from './Componentes/FacturasProveedor.jsx'
import GestionRolesPermisos from './Componentes/GestionRolesPermisos.jsx'
import BitacoraAuditoria from './Componentes/BitacoraAuditoria.jsx'
import CuentasPagar from './Componentes/CuentasPagar.jsx'
import CuentasCobrar from './Componentes/CuentasCobrar.jsx'
import PlanCuentas from './Componentes/PlanCuentas.jsx'
import AsientosManuales from './Componentes/AsientosManuales.jsx'
import VisorAsientosAutomaticos from './Componentes/VisorAsientosAutomaticos.jsx'
import CajaBancos from './Componentes/CajaBancos.jsx'
import ConciliacionBancaria from './Componentes/ConciliacionBancaria.jsx'
import BarraNavegacion from './Componentes/BarraNavegacion.jsx'
import BarraHeader from './Componentes/BarraHeader.jsx'
import Login from './Componentes/Login.jsx'
import RegistroUsuario from './Componentes/RegistroUsuario.jsx'
import { isAuthenticated, logout } from './utils/apiService';

// Mapa de referencias de componentes (no JSX) para que React cree
// una instancia nueva por cada navegación y el error quede contenido.
const VISTAS = {
  inicio:               ControlInversiones,
  catalogo_productos:   ProductosInsumos,
  catalogo_proveedores: Proveedores,
  catalogo_galpones:    Galpones,
  inventario_existencias:    ExistenciasActuales,
  inventario_kardex:         KardexProducto,
  inventario_toma_fisica:    TomaFisica,
  inventario_ajustes:        AjustesInventario,
  compras_solicitudes:       SolicitudesCompra,
  compras_ordenes:           OrdenesCompra,
  compras_recepciones:       RecepcionMercanciaView,
  compras_facturas:          FacturasProveedor,
  compras_cuentas_pagar:     CuentasPagar,
  inventario_stock_minimo:   ConfigStockMinimo,
  inventario_consumo:        ConsumoInsumos,
  produccion_lotes:          GestionLotes,
  costos_lote:               CostoPorLote,
  costos_rentabilidad:       RentabilidadLote,
  reportes_existencias_val:  ExistenciasValorizadas,
  reportes_kardex:           ReporteKardex,
  reportes_compras:          ReporteCompras,
  reportes_cxpcxc:           ReporteCxPCxC,
  reportes_estado_resultados:    ReporteEstadoResultados,
  reportes_indicadores_prod:     ReporteIndicadoresProduccion,
  documentos_adjuntos:           DocumentosAdjuntos,
  produccion_catalogo_pt:    CatalogoProductoTerminado,
  produccion_stock_pt:       StockProductoTerminado,
  ventas_clientes:           Clientes,
  ventas_pedidos:            PedidosVenta,
  ventas_cuentas_cobrar:     CuentasCobrar,
  contabilidad_plan_cuentas:    PlanCuentas,
  contabilidad_asientos:        AsientosManuales,
  contabilidad_asientos_auto:   VisorAsientosAutomaticos,
  contabilidad_caja:            CajaBancos,
  contabilidad_conciliacion:    ConciliacionBancaria,
  config_impuestos:     ConfigImpuestosRetenciones,
  config_numeracion:    ConfigNumeracion,
  config_empresa:       ParametrosEmpresa,
  config_unidades:      UnidadesMedida,
  config_roles:         GestionRolesPermisos,
  config_auditoria:     BitacoraAuditoria,
  usuarios:             GestionUsuarios,
};

// Error Boundary: atrapa cualquier crash de un componente hijo
// y muestra un fallback sin resetear el estado del App.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Error inesperado' };
  }

  componentDidUpdate(prevProps) {
    // Si la vista cambia, limpia el error para que la nueva vista intente renderizar.
    if (prevProps.vistaKey !== this.props.vistaKey) {
      this.setState({ hasError: false, message: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex-1 flex flex-col items-center justify-center bg-[#f5f8f8] gap-3 p-8">
          <span className="material-symbols-outlined text-[40px] text-red-300">error</span>
          <p className="text-[14px] font-semibold text-[#1a2e2e]">Ocurrió un error en esta pantalla</p>
          <p className="text-[12px] text-[#6b8f8f] max-w-sm text-center">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-2 px-4 py-2 bg-[#012d1d] text-white text-[13px] font-semibold rounded-md hover:bg-[#1a3d2d] transition-colors"
          >
            Reintentar
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => isAuthenticated());
  const [showRegister, setShowRegister] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('inicio');
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setShowRegister(false);
  };

  if (!isLoggedIn) {
    return showRegister ? (
      <RegistroUsuario
        onRegister={() => setIsLoggedIn(true)}
        onCancel={() => setShowRegister(false)}
      />
    ) : (
      <Login onLogin={() => setIsLoggedIn(true)} />
    );
  }

  const VistaActual = VISTAS[vistaActiva] ?? ControlInversiones;

  return (
    <div className="flex h-screen overflow-hidden">
      <BarraNavegacion
        onLogout={handleLogout}
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        collapsed={navCollapsed}
        onToggleCollapse={() => setNavCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <BarraHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
        <ErrorBoundary vistaKey={vistaActiva}>
          <VistaActual onNavegar={setVistaActiva} />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default App
