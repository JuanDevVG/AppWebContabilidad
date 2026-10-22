import { useState, useEffect } from 'react';
import { Download, History } from 'lucide-react';
import { getBitacoraAuditoria, getBitacoraUsuarios } from '../utils/apiService';
import {
  PageHeader,
  AlertError,
  ContentCard,
  Spinner,
  Th,
  Td,
  THead,
  TBody,
  EmptyRow,
  LoadingRows,
} from '../ui/index.jsx';

const MODULO_LABELS = {
  catalogo_productos:      'Productos e Insumos',
  catalogo_proveedores:    'Proveedores',
  catalogo_galpones:       'Galpones',
  inventario_existencias:  'Existencias Actuales',
  inventario_kardex:       'Kardex por Producto',
  inventario_toma_fisica:  'Toma Física',
  inventario_ajustes:      'Ajustes de Inventario',
  inventario_stock_minimo: 'Config. Stock Mínimo',
  inventario_consumo:      'Consumo de Insumos',
  ventas_clientes:         'Clientes',
  ventas_pedidos:          'Pedidos / Ventas',
  produccion_lotes:        'Gestión de Lotes',
  produccion_beneficio:    'Registro de Beneficio',
  produccion_catalogo_pt:  'Catálogo Prod. Terminados',
  produccion_stock_pt:     'Stock Prod. Terminado',
  compras_solicitudes:     'Solicitudes de Compra',
  compras_ordenes:         'Órdenes de Compra',
  compras_recepciones:     'Recepción de Mercancía',
  compras_facturas:        'Facturas de Proveedor',
  compras_cuentas_pagar:   'Cuentas por Pagar',
  config_unidades:         'Unidades de Medida',
  config_roles:            'Roles y Permisos',
  config_auditoria:        'Bitácora de Auditoría',
  usuarios_gestion:        'Gestión de Usuarios',
};

const ACCION_BADGE = {
  // Sesión
  'Inicio de sesión':      'bg-sky-50 text-sky-700 border border-sky-200',
  // Catálogo — crear
  'Crear producto':        'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Crear categoría':       'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Crear proveedor':       'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Crear galpón':          'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Crear unidad':          'bg-emerald-50 text-emerald-700 border border-emerald-200',
  // Catálogo — editar
  'Editar producto':       'bg-amber-50 text-amber-700 border border-amber-200',
  'Editar categoría':      'bg-amber-50 text-amber-700 border border-amber-200',
  'Editar proveedor':      'bg-amber-50 text-amber-700 border border-amber-200',
  'Editar galpón':         'bg-amber-50 text-amber-700 border border-amber-200',
  'Editar unidad':         'bg-amber-50 text-amber-700 border border-amber-200',
  // Catálogo — eliminar
  'Eliminar producto':     'bg-red-50 text-red-700 border border-red-200',
  'Eliminar categoría':    'bg-red-50 text-red-700 border border-red-200',
  'Eliminar proveedor':    'bg-red-50 text-red-700 border border-red-200',
  'Eliminar galpón':       'bg-red-50 text-red-700 border border-red-200',
  'Eliminar unidad':       'bg-red-50 text-red-700 border border-red-200',
  // Compras
  'Crear solicitud':       'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Aprobar solicitud':     'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Rechazar solicitud':    'bg-red-50 text-red-700 border border-red-200',
  'Generar OC':            'bg-teal-50 text-teal-700 border border-teal-200',
  'Crear OC':              'bg-teal-50 text-teal-700 border border-teal-200',
  'Cambiar estado OC':     'bg-amber-50 text-amber-700 border border-amber-200',
  'Registrar recepción':   'bg-violet-50 text-violet-700 border border-violet-200',
  'Crear factura':         'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'Cambiar estado factura':'bg-amber-50 text-amber-700 border border-amber-200',
  // Configuración
  'Guardar permisos':      'bg-slate-100 text-slate-600 border border-slate-200',
  // Usuarios
  'Crear usuario':         'bg-sky-50 text-sky-700 border border-sky-200',
  'Actualizar usuario':    'bg-sky-50 text-sky-700 border border-sky-200',
  'Eliminar usuario':      'bg-red-50 text-red-700 border border-red-200',
};

const POR_PAGINA = 50;

function hoy() { return new Date().toISOString().split('T')[0]; }
function hace30Dias() {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function fmtFechaHora(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
}

function exportarCSV(registros) {
  const headers = ['Fecha/Hora', 'Usuario', 'Email', 'Módulo', 'Acción', 'Descripción', 'Registro'];
  const rows = registros.map((r) => [
    fmtFechaHora(r.fecha_hora),
    r.usuario_nombre,
    r.usuario_email,
    r.modulo_label || MODULO_LABELS[r.modulo] || r.modulo,
    r.accion,
    r.descripcion,
    r.registro_id,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bitacora_${hoy()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const FILTROS_INIT = { desde: hace30Dias(), hasta: hoy(), usuario_email: '', modulo: '' };

export default function BitacoraAuditoria() {
  const [registros, setRegistros]   = useState([]);
  const [usuarios, setUsuarios]     = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [error, setError]           = useState('');
  const [pagina, setPagina]         = useState(1);
  const [filtros, setFiltros]       = useState(FILTROS_INIT);
  const [aplicados, setAplicados]   = useState(FILTROS_INIT);

  useEffect(() => {
    getBitacoraUsuarios()
      .then((d) => setUsuarios(d.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => { cargar(); }, [aplicados]);

  async function cargar() {
    setCargando(true);
    setError('');
    setPagina(1);
    try {
      const params = {};
      if (aplicados.desde)         params.desde         = aplicados.desde;
      if (aplicados.hasta)         params.hasta         = aplicados.hasta;
      if (aplicados.usuario_email) params.usuario_email = aplicados.usuario_email;
      if (aplicados.modulo)        params.modulo        = aplicados.modulo;
      const data = await getBitacoraAuditoria(params);
      setRegistros(data.items || []);
    } catch (err) {
      setError(err.message || 'Error al cargar la bitácora');
    } finally {
      setCargando(false);
    }
  }

  function setF(field, value) {
    setFiltros((f) => ({ ...f, [field]: value }));
  }

  function aplicar() { setAplicados({ ...filtros }); }

  function limpiar() {
    const base = FILTROS_INIT;
    setFiltros(base);
    setAplicados(base);
  }

  const totalPaginas = Math.max(1, Math.ceil(registros.length / POR_PAGINA));
  const paginados    = registros.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto">

          <PageHeader
            title="Bitácora de Auditoría"
            subtitle="Registro de todas las acciones realizadas por los usuarios en el sistema"
          >
            <button
              onClick={() => exportarCSV(registros)}
              disabled={registros.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] bg-white border border-[#dde8e8] text-[#374040] text-[13px] font-semibold rounded-md hover:bg-[#f0f7f5] hover:border-[#012d1d] hover:text-[#012d1d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </PageHeader>

          {error && <AlertError onRetry={cargar}>{error}</AlertError>}

          {/* ── Filtros ── */}
          <ContentCard className="mb-4">
            <div className="px-4 py-2.5 border-b border-[#f0f5f5]">
              <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wider">Filtros</p>
            </div>
            <div className="px-4 py-3 flex flex-wrap items-end gap-3">

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">
                  Desde
                </label>
                <input
                  type="date"
                  value={filtros.desde}
                  onChange={(e) => setF('desde', e.target.value)}
                  className="px-3 py-[7px] text-[13px] border border-[#dde8e8] rounded-md text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 bg-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filtros.hasta}
                  onChange={(e) => setF('hasta', e.target.value)}
                  className="px-3 py-[7px] text-[13px] border border-[#dde8e8] rounded-md text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 bg-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">
                  Usuario
                </label>
                <select
                  value={filtros.usuario_email}
                  onChange={(e) => setF('usuario_email', e.target.value)}
                  className="px-3 py-[7px] text-[13px] border border-[#dde8e8] rounded-md text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 bg-white min-w-[190px]"
                >
                  <option value="">Todos los usuarios</option>
                  {usuarios.map((u) => (
                    <option key={u.usuario_email} value={u.usuario_email}>
                      {u.usuario_nombre || u.usuario_email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#374040] uppercase tracking-wide">
                  Módulo
                </label>
                <select
                  value={filtros.modulo}
                  onChange={(e) => setF('modulo', e.target.value)}
                  className="px-3 py-[7px] text-[13px] border border-[#dde8e8] rounded-md text-[#1a2e2e] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/10 bg-white min-w-[210px]"
                >
                  <option value="">Todos los módulos</option>
                  {Object.entries(MODULO_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 items-end">
                <button
                  onClick={aplicar}
                  className="px-4 py-[7px] bg-[#012d1d] text-white text-[13px] font-semibold rounded-md hover:bg-[#1a3d2d] transition-colors"
                >
                  Buscar
                </button>
                <button
                  onClick={limpiar}
                  className="px-4 py-[7px] bg-white border border-[#dde8e8] text-[#4a6b6b] text-[13px] font-medium rounded-md hover:bg-[#f5f9f9] transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </ContentCard>

          {/* ── Tabla ── */}
          <ContentCard>
            {!cargando && registros.length > 0 && (
              <div className="px-4 py-2 border-b border-[#f0f5f5] flex items-center justify-between">
                <p className="text-[12px] text-[#6b8f8f]">
                  {registros.length} registro{registros.length !== 1 ? 's' : ''}
                  {registros.length === 500 && (
                    <span className="ml-1 text-amber-600">(límite 500 — ajusta los filtros para ver más)</span>
                  )}
                  {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
                </p>
                {totalPaginas > 1 && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={pagina === 1}
                      className="px-2.5 py-1 text-[12px] rounded border border-[#dde8e8] text-[#4a6b6b] disabled:opacity-40 hover:bg-[#f5f9f9] transition-colors"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                      disabled={pagina === totalPaginas}
                      className="px-2.5 py-1 text-[12px] rounded border border-[#dde8e8] text-[#4a6b6b] disabled:opacity-40 hover:bg-[#f5f9f9] transition-colors"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <THead>
                  <Th>Fecha / Hora</Th>
                  <Th>Usuario</Th>
                  <Th>Módulo</Th>
                  <Th>Acción</Th>
                  <Th>Descripción</Th>
                  <Th center>Registro</Th>
                </THead>
                <TBody>
                  {cargando ? (
                    <LoadingRows cols={6} rows={8} />
                  ) : registros.length === 0 ? (
                    <EmptyRow
                      icon={History}
                      title="Sin registros"
                      subtitle="No hay actividad para los filtros seleccionados"
                      cols={6}
                    />
                  ) : (
                    paginados.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-[#f0f5f5] hover:bg-[#f5fbfa] transition-colors"
                      >
                        <Td mono muted className="whitespace-nowrap text-[12px]">
                          {fmtFechaHora(r.fecha_hora)}
                        </Td>
                        <Td>
                          <div className="text-[13px] font-medium text-[#1a2e2e]">
                            {r.usuario_nombre || '—'}
                          </div>
                          <div className="text-[11px] text-[#6b8f8f]">{r.usuario_email}</div>
                        </Td>
                        <Td>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#eef4f4] text-[#4a6060] border border-[#d8e8e8]">
                            {r.modulo_label || MODULO_LABELS[r.modulo] || r.modulo}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              ACCION_BADGE[r.accion] || 'bg-[#f0f5f5] text-[#4a6b6b] border border-[#dde8e8]'
                            }`}
                          >
                            {r.accion}
                          </span>
                        </Td>
                        <Td muted className="max-w-xs">
                          <span className="block truncate" title={r.descripcion}>
                            {r.descripcion || '—'}
                          </span>
                        </Td>
                        <Td mono muted center className="text-[12px]">
                          {r.registro_id || '—'}
                        </Td>
                      </tr>
                    ))
                  )}
                </TBody>
              </table>
            </div>

            {!cargando && totalPaginas > 1 && (
              <div className="px-4 py-2.5 border-t border-[#f0f5f5] flex justify-center gap-2">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1.5 text-[12px] rounded border border-[#dde8e8] text-[#4a6b6b] disabled:opacity-40 hover:bg-[#f5f9f9] transition-colors"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 text-[12px] rounded border border-[#dde8e8] text-[#4a6b6b] disabled:opacity-40 hover:bg-[#f5f9f9] transition-colors"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </ContentCard>

        </div>
      </div>
    </main>
  );
}
