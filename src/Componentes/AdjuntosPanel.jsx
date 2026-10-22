/**
 * AdjuntosPanel — componente reusable de adjuntos.
 *
 * Props:
 *   contentType  string  e.g. "compras.ordencompra"
 *   objectId     number  id del objeto padre (undefined = modo solo-vista/deshabilita upload)
 *   compact      bool    reduce altura del drop-zone (default false)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Download, FileText, Image, Paperclip, UploadCloud } from 'lucide-react';
import { apiCall } from '../utils/apiService';

const TIPOS = {
  'application/pdf':  { icon: <FileText className="w-4 h-4 text-red-500" />,     label: 'PDF' },
  'image/jpeg':       { icon: <Image    className="w-4 h-4 text-blue-500" />,    label: 'JPG' },
  'image/jpg':        { icon: <Image    className="w-4 h-4 text-blue-500" />,    label: 'JPG' },
  'image/png':        { icon: <Image    className="w-4 h-4 text-indigo-500" />,  label: 'PNG' },
};

function fmtSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function fmtFecha(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function listar(ct, oid) {
  const params = new URLSearchParams();
  if (ct)  params.set('ct',  ct);
  if (oid) params.set('oid', oid);
  return apiCall(`/api/adjuntos/?${params}`);
}

async function subir(ct, oid, file) {
  const fd = new FormData();
  fd.append('archivo', file);
  if (ct)  fd.append('ct',  ct);
  if (oid) fd.append('oid', oid);
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/adjuntos/upload/`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

async function eliminar(id) {
  return apiCall(`/api/adjuntos/${id}/`, { method: 'DELETE' });
}

export default function AdjuntosPanel({ contentType, objectId, compact = false }) {
  const [adjuntos, setAdjuntos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [drag, setDrag]         = useState(false);
  const [error, setError]       = useState('');
  const inputRef                = useRef(null);

  const cargar = useCallback(async () => {
    if (!contentType) return;
    setCargando(true);
    try {
      const data = await listar(contentType, objectId);
      setAdjuntos(Array.isArray(data) ? data : data.results ?? []);
    } catch { /* silencioso */ }
    finally  { setCargando(false); }
  }, [contentType, objectId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function procesarArchivo(file) {
    if (!file) return;
    const tiposValidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!tiposValidos.includes(file.type)) {
      setError('Solo se permiten archivos PDF, JPG o PNG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo supera el límite de 10 MB.');
      return;
    }
    setError('');
    setSubiendo(true);
    try {
      const nuevo = await subir(contentType, objectId, file);
      setAdjuntos((prev) => [nuevo, ...prev]);
    } catch (e) {
      setError(e.message || 'Error al subir el archivo.');
    } finally { setSubiendo(false); }
  }

  function onDrop(e) {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files?.[0];
    procesarArchivo(file);
  }

  async function onDelete(id) {
    if (!window.confirm('¿Eliminar este adjunto?')) return;
    try {
      await eliminar(id);
      setAdjuntos((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('No se pudo eliminar el archivo.');
    }
  }

  const canUpload = !!contentType && !!objectId;

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      {canUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl cursor-pointer transition-all select-none
            ${compact ? 'py-3' : 'py-5'}
            ${drag
              ? 'border-[#012d1d] bg-[#f0faf5]'
              : 'border-[#dde8e8] bg-[#fafcfc] hover:border-[#5eead4] hover:bg-[#f5fdfb]'
            }
            ${subiendo ? 'opacity-60 pointer-events-none' : ''}
          `}
        >
          <UploadCloud className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} ${drag ? 'text-[#012d1d]' : 'text-[#aebfbf]'} transition-colors`} />
          <p className="text-[12px] font-medium text-[#6b8f8f]">
            {subiendo ? 'Subiendo…' : 'Arrastra un archivo o haz clic para seleccionar'}
          </p>
          <p className="text-[10.5px] text-[#aebfbf]">PDF, JPG, PNG · máx. 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => procesarArchivo(e.target.files?.[0])}
          />
        </div>
      )}

      {!canUpload && (
        <p className="text-[11px] text-[#aebfbf] italic px-1">
          Guarda el documento primero para poder adjuntar archivos.
        </p>
      )}

      {error && (
        <p className="text-[11px] text-red-600 font-medium px-1">{error}</p>
      )}

      {/* Lista de archivos */}
      {cargando ? (
        <p className="text-[11px] text-[#aebfbf] text-center py-2">Cargando adjuntos…</p>
      ) : adjuntos.length === 0 ? (
        <p className="text-[11px] text-[#c4d4d4] italic text-center py-2 flex items-center justify-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" /> Sin adjuntos
        </p>
      ) : (
        <ul className="space-y-1">
          {adjuntos.map((a) => {
            const tipoInfo = TIPOS[a.tipo_mime] ?? { icon: <Paperclip className="w-4 h-4 text-[#6b8f8f]" />, label: '?' };
            return (
              <li
                key={a.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border border-[#f0f5f5] hover:border-[#dde8e8] group transition-colors"
              >
                {/* Ícono tipo */}
                <span className="flex-shrink-0">{tipoInfo.icon}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#1a2e2e] truncate" title={a.nombre_original}>
                    {a.nombre_original}
                  </p>
                  <p className="text-[10.5px] text-[#aebfbf]">
                    {tipoInfo.label} · {fmtSize(a.tamano_bytes)} · {fmtFecha(a.created_at)}
                    {a.subido_por ? ` · ${a.subido_por}` : ''}
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  {canUpload && (
                    <button
                      onClick={() => onDelete(a.id)}
                      className="p-1.5 rounded-md text-[#6b8f8f] hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
