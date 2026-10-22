// src/utils/apiService.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Función para hacer peticiones autenticadas al backend Django
 */
function formatApiError(errorData, status) {
  if (!errorData) {
    return `Error ${status}`;
  }

  if (typeof errorData === 'string') {
    return errorData;
  }

  if (errorData.detail) {
    return errorData.detail;
  }

  if (Array.isArray(errorData)) {
    return errorData.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join(' ');
  }

  const messages = [];
  for (const [key, value] of Object.entries(errorData)) {
    if (Array.isArray(value)) {
      messages.push(`${key}: ${value.join(' ')}`);
    } else if (typeof value === 'string') {
      messages.push(`${key}: ${value}`);
    } else if (typeof value === 'object') {
      messages.push(`${key}: ${JSON.stringify(value)}`);
    }
  }

  return messages.length > 0 ? messages.join(' | ') : `Error ${status}`;
}

export function getAuthToken() {
  return (
    sessionStorage.getItem('access_token') ||
    sessionStorage.getItem('access') ||
    sessionStorage.getItem('token')
  );
}

export async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    ...options.headers,
  };

  if (!options.headers || options.headers['Content-Type'] !== false) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
      }

      const text = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(text);
      } catch {
        const esHtml = text.trimStart().startsWith('<');
        throw new Error(esHtml ? `Error del servidor (${response.status})` : text || `Error ${response.status}`);
      }

      const message = formatApiError(errorData, response.status);
      const apiError = new Error(message);
      apiError.status = response.status;
      apiError.data   = errorData;
      throw apiError;
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Mensaje legible para el usuario: usa `detail` o junta los mensajes por
 * campo sin anteponer el nombre técnico del campo.
 */
export function mensajeError(error, fallback = 'Ocurrió un error.') {
  const data = error?.data;
  if (data && typeof data === 'object' && !Array.isArray(data) && !data.detail) {
    const msgs = Object.entries(data)
      .filter(([k]) => k !== 'codigo')
      .flatMap(([, v]) => (Array.isArray(v) ? v : [v]))
      .filter((v) => typeof v === 'string');
    if (msgs.length) return msgs.join(' ');
  }
  return error?.message || fallback;
}

export async function guestApiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    ...options.headers,
  };

  if (!options.headers || options.headers['Content-Type'] !== false) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(text);
      } catch {
        const esHtml = text.trimStart().startsWith('<');
        throw new Error(esHtml ? `Error del servidor (${response.status})` : text || `Error ${response.status}`);
      }

      const message = formatApiError(errorData, response.status);
      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    console.error('API Guest Error:', error);
    throw error;
  }
}

/**
 * Login con email y contraseña
 */
export async function login(email, password) {
  return guestApiCall('/api/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Registro de nuevo usuario
 */
export async function registerUser(payload) {
  return guestApiCall('/api/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Cerrar sesión
 */
export function logout() {
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('access');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('user');
}

/**
 * Obtener datos autenticados
 */
export async function getData(endpoint) {
  return apiCall(endpoint, {
    method: 'GET',
  });
}

/**
 * Crear datos
 */
export async function createData(endpoint, data) {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Actualizar datos
 */
export async function updateData(endpoint, data) {
  return apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Eliminar datos
 */
export async function deleteData(endpoint) {
  return apiCall(endpoint, {
    method: 'DELETE',
  });
}

// ─── Catálogo Maestro ─────────────────────────────────────────────────────────

export async function getCategoriasCatalogo() {
  return apiCall('/api/catalogo/categorias/', { method: 'GET' });
}

export async function getUnidadesMedida() {
  return apiCall('/api/catalogo/unidades/', { method: 'GET' });
}

export async function createUnidadMedida(payload) {
  return apiCall('/api/catalogo/unidades/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUnidadMedida(id, payload) {
  return apiCall(`/api/catalogo/unidades/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteUnidadMedida(id) {
  return apiCall(`/api/catalogo/unidades/${id}/`, { method: 'DELETE' });
}

export async function getProductos(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/catalogo/productos/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createProducto(payload) {
  return apiCall('/api/catalogo/productos/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProducto(id, payload) {
  return apiCall(`/api/catalogo/productos/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteProducto(id) {
  return apiCall(`/api/catalogo/productos/${id}/`, { method: 'DELETE' });
}

// ─── Inventario ───────────────────────────────────────────────────────────────

export async function getKardexProducto(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/inventario/kardex/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function getExistencias(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/inventario/existencias/${query ? '?' + query : ''}`, { method: 'GET' });
}

// ─── Compras ──────────────────────────────────────────────────────────────────

export async function getSolicitudesCompra(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/compras/solicitudes/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createSolicitudCompra(payload) {
  return apiCall('/api/compras/solicitudes/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getSolicitudCompra(id) {
  return apiCall(`/api/compras/solicitudes/${id}/`, { method: 'GET' });
}

export async function updateEstadoSolicitud(id, estado) {
  return apiCall(`/api/compras/solicitudes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

export async function aprobarSolicitud(id, estado) {
  return apiCall(`/api/compras/solicitudes/${id}/aprobar/`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

export async function getSolicitudGenerarOCPrefill(id) {
  return apiCall(`/api/compras/solicitudes/${id}/generar-oc/`, { method: 'GET' });
}

export async function generarOCDesdeSolicitud(id, payload) {
  return apiCall(`/api/compras/solicitudes/${id}/generar-oc/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getOrdenesCompra(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/compras/ordenes/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createOrdenCompra(payload) {
  return apiCall('/api/compras/ordenes/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getOrdenCompra(id) {
  return apiCall(`/api/compras/ordenes/${id}/`, { method: 'GET' });
}

export async function recibirMercancia(id, fecha, recibirItems) {
  return apiCall(`/api/compras/ordenes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ fecha, recibir_items: recibirItems }),
  });
}

export async function getFacturasProveedor(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/compras/facturas/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function getReporteIndicadoresProduccion(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return apiCall(`/api/reportes/indicadores-produccion/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function getReporteEstadoResultados(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return apiCall(`/api/reportes/estado-resultados/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function getReporteCompras(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return apiCall(`/api/reportes/compras/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createFacturaProveedor(payload) {
  return apiCall('/api/compras/facturas/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getFacturaProveedor(id) {
  return apiCall(`/api/compras/facturas/${id}/`, { method: 'GET' });
}

export async function getCuentasPagar(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/compras/cuentas-pagar/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function registrarPago(facturaId, payload) {
  return apiCall(`/api/compras/facturas/${facturaId}/pago/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEstadoFactura(id, estado) {
  return apiCall(`/api/compras/facturas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

export async function getRecepcionesMercancia(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/compras/recepciones/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function getRecepcionesDisponibles(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/compras/recepciones/disponibles/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createRecepcionMercancia(payload) {
  return apiCall('/api/compras/recepciones/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEstadoOrden(id, estado) {
  return apiCall(`/api/compras/ordenes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

export async function getAjustesInventario() {
  return apiCall('/api/inventario/ajustes/', { method: 'GET' });
}

// ─── Ventas y Facturación ─────────────────────────────────────────────────────

export async function getClientes(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/ventas/clientes/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createCliente(payload) {
  return apiCall('/api/ventas/clientes/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCliente(id, payload) {
  return apiCall(`/api/ventas/clientes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCliente(id) {
  return apiCall(`/api/ventas/clientes/${id}/`, { method: 'DELETE' });
}

export async function getPedidosVenta(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/ventas/pedidos/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createPedidoVenta(payload) {
  return apiCall('/api/ventas/pedidos/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getPedidoVentaDetalle(id) {
  return apiCall(`/api/ventas/pedidos/${id}/`, { method: 'GET' });
}

export async function patchPedidoVenta(id, payload) {
  return apiCall(`/api/ventas/pedidos/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function facturarPedido(id) {
  return apiCall(`/api/ventas/pedidos/${id}/facturar/`, { method: 'POST' });
}

export async function getCuentasCobrar(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/ventas/cuentas-cobrar/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function registrarCobro(facturaId, payload) {
  return apiCall(`/api/ventas/facturas/${facturaId}/cobro/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Productos terminados
export async function getProductosTerminados(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/produccion/productos-terminados/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createProductoTerminado(payload) {
  return apiCall('/api/produccion/productos-terminados/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function patchProductoTerminado(id, payload) {
  return apiCall(`/api/produccion/productos-terminados/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getStockProductoTerminado() {
  return apiCall('/api/produccion/stock-terminado/', { method: 'GET' });
}

// Beneficios
export async function getBeneficiosLote(loteId) {
  return apiCall(`/api/produccion/lotes/${loteId}/beneficios/`, { method: 'GET' });
}

export async function registrarBeneficio(loteId, payload) {
  return apiCall(`/api/produccion/lotes/${loteId}/beneficios/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Producción ───────────────────────────────────────────────────────────────

export async function getLotes(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/produccion/lotes/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createLote(payload) {
  return apiCall('/api/produccion/lotes/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getLoteDetalle(id) {
  return apiCall(`/api/produccion/lotes/${id}/`, { method: 'GET' });
}

export async function getLoteCostos(id) {
  return apiCall(`/api/produccion/lotes/${id}/costos/`, { method: 'GET' });
}

export async function patchLote(id, payload) {
  return apiCall(`/api/produccion/lotes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function anularLote(id, payload) {
  return apiCall(`/api/produccion/lotes/${id}/anular/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registrarMortalidad(loteId, payload, archivo) {
  if (archivo) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => { if (v !== undefined) fd.append(k, v); });
    fd.append('documento', archivo);
    return apiCall(`/api/produccion/lotes/${loteId}/mortalidad/`, {
      method: 'POST',
      headers: { 'Content-Type': false },
      body: fd,
    });
  }
  return apiCall(`/api/produccion/lotes/${loteId}/mortalidad/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getConsumos(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/inventario/consumos/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createConsumo(payload) {
  return apiCall('/api/inventario/consumos/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createAjuste(payload) {
  return apiCall('/api/inventario/ajustes/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getTomaFisicaSheet() {
  return apiCall('/api/inventario/toma-fisica/', { method: 'GET' });
}

export async function aplicarTomaFisica(payload) {
  return apiCall('/api/inventario/toma-fisica/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getStockMinimo(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/inventario/stock-minimo/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function bulkUpdateStockMinimo(updates) {
  return apiCall('/api/inventario/stock-minimo/', {
    method: 'PATCH',
    body: JSON.stringify({ updates }),
  });
}

// ─── Galpones ─────────────────────────────────────────────────────────────────

export async function getGalpones(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/catalogo/galpones/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createGalpon(payload) {
  return apiCall('/api/catalogo/galpones/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateGalpon(id, payload) {
  return apiCall(`/api/catalogo/galpones/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteGalpon(id) {
  return apiCall(`/api/catalogo/galpones/${id}/`, { method: 'DELETE' });
}

// ─── Proveedores ──────────────────────────────────────────────────────────────

export async function getProveedores(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/catalogo/proveedores/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createProveedor(payload) {
  return apiCall('/api/catalogo/proveedores/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProveedor(id, payload) {
  return apiCall(`/api/catalogo/proveedores/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteProveedor(id) {
  return apiCall(`/api/catalogo/proveedores/${id}/`, { method: 'DELETE' });
}

// ─── Bitácora de Auditoría ────────────────────────────────────────────────────

export async function getBitacoraAuditoria(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/auditoria/bitacora/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function getBitacoraUsuarios() {
  return apiCall('/api/auditoria/usuarios/', { method: 'GET' });
}

// ─── Roles y Permisos ─────────────────────────────────────────────────────────

export async function getMisPermisos() {
  return apiCall('/api/mis-permisos/', { method: 'GET' });
}

export async function getRolesPermisos() {
  return apiCall('/api/roles-permisos/', { method: 'GET' });
}

export async function saveRolesPermisos(payload) {
  return apiCall('/api/roles-permisos/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Gestión de usuarios (admin) ──────────────────────────────────────────────

export async function getUsers() {
  return apiCall('/api/users/', { method: 'GET' });
}

export async function createUser(payload) {
  return apiCall('/api/users/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id, payload) {
  return apiCall(`/api/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ─── Contabilidad — Asientos Manuales ────────────────────────────────────────

export async function getAsientos(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/contabilidad/asientos/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function getAsientoDetalle(id) {
  return apiCall(`/api/contabilidad/asientos/${id}/`, { method: 'GET' });
}

export async function createAsiento(payload, archivo) {
  if (archivo) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (k === 'lineas') fd.append('lineas', JSON.stringify(v));
      else if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    fd.append('documento', archivo);
    return apiCall('/api/contabilidad/asientos/', {
      method: 'POST',
      headers: { 'Content-Type': false },
      body: fd,
    });
  }
  return apiCall('/api/contabilidad/asientos/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAsiento(id, payload, archivo) {
  if (archivo) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (k === 'lineas') fd.append('lineas', JSON.stringify(v));
      else if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    fd.append('documento', archivo);
    return apiCall(`/api/contabilidad/asientos/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': false },
      body: fd,
    });
  }
  return apiCall(`/api/contabilidad/asientos/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAsiento(id) {
  return apiCall(`/api/contabilidad/asientos/${id}/`, { method: 'DELETE' });
}

export async function publicarAsiento(id) {
  return apiCall(`/api/contabilidad/asientos/${id}/publicar/`, { method: 'POST' });
}

export async function anularAsiento(id) {
  return apiCall(`/api/contabilidad/asientos/${id}/anular/`, { method: 'POST' });
}

// ─── Contabilidad — Plan de Cuentas ──────────────────────────────────────────

export async function getCuentasContables() {
  return apiCall('/api/contabilidad/cuentas/', { method: 'GET' });
}

export async function createCuentaContable(payload) {
  return apiCall('/api/contabilidad/cuentas/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCuentaContable(id, payload) {
  return apiCall(`/api/contabilidad/cuentas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCuentaContable(id) {
  return apiCall(`/api/contabilidad/cuentas/${id}/`, { method: 'DELETE' });
}

// ─── Contabilidad — Caja y Bancos ────────────────────────────────────────────
export async function getCuentasCajaBanco() {
  return apiCall('/api/contabilidad/caja-banco/', { method: 'GET' });
}

export async function createCuentaCajaBanco(payload) {
  return apiCall('/api/contabilidad/caja-banco/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCuentaCajaBanco(id, payload) {
  return apiCall(`/api/contabilidad/caja-banco/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCuentaCajaBanco(id) {
  return apiCall(`/api/contabilidad/caja-banco/${id}/`, { method: 'DELETE' });
}

// ─── Contabilidad — Parámetros de Empresa ────────────────────────────────────
export async function getParametrosEmpresa() {
  return apiCall('/api/contabilidad/parametros-empresa/', { method: 'GET' });
}

export async function updateParametrosEmpresa(payload) {
  return apiCall('/api/contabilidad/parametros-empresa/', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getMovimientos(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/contabilidad/movimientos/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createMovimiento(payload, archivo) {
  if (archivo) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => fd.append(k, v ?? ''));
    fd.append('comprobante', archivo);
    return apiCall('/api/contabilidad/movimientos/', {
      method: 'POST', body: fd, headers: { 'Content-Type': false },
    });
  }
  return apiCall('/api/contabilidad/movimientos/', {
    method: 'POST', body: JSON.stringify(payload),
  });
}

export async function deleteMovimiento(id) {
  return apiCall(`/api/contabilidad/movimientos/${id}/`, { method: 'DELETE' });
}

// ─── Contabilidad — Conciliación Bancaria ────────────────────────────────────
export async function getConciliaciones(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/contabilidad/conciliaciones/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function createConciliacion(payload) {
  return apiCall('/api/contabilidad/conciliaciones/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getConciliacionDetalle(id) {
  return apiCall(`/api/contabilidad/conciliaciones/${id}/`, { method: 'GET' });
}

export async function updateConciliacion(id, payload) {
  return apiCall(`/api/contabilidad/conciliaciones/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function descartarConciliacion(id) {
  return apiCall(`/api/contabilidad/conciliaciones/${id}/`, { method: 'DELETE' });
}

export async function cerrarConciliacion(id) {
  return apiCall(`/api/contabilidad/conciliaciones/${id}/cerrar/`, { method: 'POST' });
}

export async function reabrirConciliacion(id, motivo) {
  return apiCall(`/api/contabilidad/conciliaciones/${id}/reabrir/`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

export async function marcarMovimientoConciliado(concId, movimientoId, conciliar) {
  return apiCall(`/api/contabilidad/conciliaciones/${concId}/marcar-movimiento/`, {
    method: 'POST',
    body: JSON.stringify({ movimiento_id: movimientoId, conciliar }),
  });
}

export async function createPartida(concId, payload) {
  return apiCall(`/api/contabilidad/conciliaciones/${concId}/partidas/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function togglePartida(id, conciliada) {
  return apiCall(`/api/contabilidad/partidas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ conciliada }),
  });
}

export async function deletePartida(id) {
  return apiCall(`/api/contabilidad/partidas/${id}/`, { method: 'DELETE' });
}

// ─── Contabilidad — Asientos Automáticos ─────────────────────────────────────
export async function getAsientosAutomaticos(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/api/contabilidad/asientos-automaticos/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function getAsientoAutomaticoDetalle(id) {
  return apiCall(`/api/contabilidad/asientos-automaticos/${id}/`, { method: 'GET' });
}

export async function getRentabilidad(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return apiCall(`/api/produccion/rentabilidad/${query ? '?' + query : ''}`, { method: 'GET' });
}

export async function getExistenciasValorizadas(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return apiCall(`/api/reportes/existencias-valorizadas/${query ? '?' + query : ''}`, { method: 'GET' });
}

// ──────────────────────────────────────────────────────────────────────────────

/**
 * Obtener usuario actual del sessionStorage
 */
export function getCurrentUser() {
  const userStr = sessionStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Verificar si usuario está autenticado
 */
export function isAuthenticated() {
  return !!getAuthToken();
}
