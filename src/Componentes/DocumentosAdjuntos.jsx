import { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, FileText, Image, Paperclip, Search, RefreshCw } from 'lucide-react';
import { apiCall } from '../utils/apiService';
import { PageHeader, ContentCard } from '../ui/index.jsx';

const MODULOS = [
  { ct: '',                          label: 'Todos' },
  { ct: 'compras.ordencompra',       label: 'Órdenes de Compra' },
  { ct: 'compras.facturaproveedor',  label: 'Facturas Proveedor' },
  { ct: 'ventas.pedidoventa',        label: 'Pedidos / Ventas' },
  { ct: 'produccion.lote',           label: 'Lotes de Producción' },
  { ct: 'contabilidad.asientomanual', label: 'Asientos Manuales' },
];

const TIPO_ICON = {
  'application/pdf': <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />,
  'image/jpeg':      <Image    className="w-4 h-4 text-blue-500 flex-shrink-0" />,
  'image/jpg':       <Image    className="w-4 h-4 text-blue-500 flex-shrink-0" />,
  'image/png':       <Image    className="w-4 h-4 text-indigo-500 flex-shrink-0" />,
};
const TIPO_LABEL = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG', 'image/jpg': 'JPG',
  'image/png': 'PNG',
};

function fmtSize(b) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}
function fmtFecha(iso) {
  return iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
}

export default function DocumentosAdjuntos() {
  const [adjuntos, setAdjuntos]   = useState([]);
  const [cargando, setCargando]   = useState(false);
  const [moduloFiltro, setModulo] = useState('');
  const [busqueda, setBusqueda]   = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (moduloFiltro) params.set('ct', moduloFiltro);
      const data = await apiCall(`/api/adjuntos/?${params}`);
      setAdjuntos(Array.isArray(data) ? data : data.results ?? []);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  }, [moduloFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este adjunto permanentemente?')) return;
    try {
      await apiCall(`/api/adjuntos/${id}/`, { method: 'DELETE' });
      setAdjuntos((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert('No se pudo eliminar el archivo.');
    }
  }

  const filtrados = adjuntos.filter((a) =>
    !busqueda || a.nombre_original.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

        <PageHeader title="Documentos y Adjuntos" subtitle="Gestión centralizada de archivos adjuntos por módulo" />

        {/* Filtros */}
        <ContentCard className="mb-4">
          <div className="px-4 py-3.5 flex flex-wrap gap-3 items-end">
            {/* Módulo */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">Módulo</label>
              <div className="flex gap-1.5 flex-wrap">
                {MODULOS.map((m) => (
                  <button
                    key={m.ct}
                    onClick={() => setModulo(m.ct)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      moduloFiltro === m.ct
                        ? 'bg-[#012d1d] border-[#012d1d] text-white'
                        : 'bg-white border-[#dde8e8] text-[#6b8f8f] hover:border-[#012d1d] hover:text-[#012d1d]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Búsqueda */}
            <div className="w-64">
              <label className="block text-[11px] font-semibold text-[#374040] uppercase tracking-wide mb-1.5">Buscar archivo</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aebfbf] pointer-events-none" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Nombre del archivo…"
                  className="w-full bg-white border border-[#dde8e8] rounded-md pl-8 pr-3 py-[7px] text-[13px] text-[#1a2e2e] focus:outline-none focus:border-[#012d1d]"
                />
              </div>
            </div>

            <button
              onClick={cargar}
              className="flex items-center gap-1.5 px-3 py-[7px] rounded-md border border-[#dde8e8] bg-white text-[12px] font-medium text-[#6b8f8f] hover:bg-[#f0faf5] hover:text-[#012d1d] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
              Recargar
            </button>
          </div>
        </ContentCard>

        {/* Tabla */}
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[#6b8f8f]">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-[13px]">Cargando archivos…</span>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Paperclip className="w-10 h-10 text-[#c4d4d4] mb-3" />
            <p className="text-[14px] font-medium text-[#6b8f8f]">Sin adjuntos encontrados</p>
            <p className="text-[12px] text-[#aebfbf] mt-1">Adjunta archivos desde los formularios de cada módulo</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#dde8e8] shadow-sm">
            <table className="w-full border-collapse" style={{ minWidth: '700px', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '40px' }} />
                <col />
                <col style={{ width: '60px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '80px' }} />
              </colgroup>
              <thead>
                <tr style={{ background: 'linear-gradient(90deg, #012d1d 0%, #021f14 100%)' }}>
                  {['', 'Nombre del archivo', 'Tipo', 'Tamaño', 'Fecha', 'Subido por', ''].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-[10.5px] font-semibold text-[#c8ddd8] uppercase tracking-wide text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a, i) => (
                  <tr
                    key={a.id}
                    className={`border-b border-[#f0f5f5] hover:bg-[#f5faf8] transition-colors group ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafcfc]'}`}
                  >
                    <td className="px-3 py-2.5 text-center">
                      {TIPO_ICON[a.tipo_mime] ?? <Paperclip className="w-4 h-4 text-[#aebfbf] mx-auto" />}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-[12px] font-medium text-[#1a2e2e] truncate" title={a.nombre_original}>
                        {a.nombre_original}
                      </p>
                      {a.descripcion && (
                        <p className="text-[10.5px] text-[#aebfbf] truncate">{a.descripcion}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-semibold text-[#6b8f8f]">
                      {TIPO_LABEL[a.tipo_mime] ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-mono text-[#374040]">
                      {fmtSize(a.tamano_bytes)}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-[#6b8f8f] whitespace-nowrap">
                      {fmtFecha(a.created_at)}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-[#6b8f8f] truncate">
                      {a.subido_por || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        {a.url && (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            download={a.nombre_original}
                            className="p-1.5 rounded-md text-[#6b8f8f] hover:bg-[#f0faf5] hover:text-[#012d1d] transition-colors"
                            title="Descargar"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => eliminar(a.id)}
                          className="p-1.5 rounded-md text-[#6b8f8f] hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-[#fafcfc] border-t border-[#f0f5f5]">
              <p className="text-[11px] text-[#aebfbf]">
                {filtrados.length} archivo{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
