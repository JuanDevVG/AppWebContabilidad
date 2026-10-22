import { useState, useEffect, useRef } from 'react';
import { Save, RotateCcw, Hash } from 'lucide-react';
import { apiCall } from '../utils/apiService';
import { PageHeader, ContentCard, Spinner } from '../ui/index.jsx';

const TIPO_META = {
  ORDEN_COMPRA:        { icon: 'shopping_cart',       grupo: 'Compras'      },
  FACTURA_PROVEEDOR:   { icon: 'request_quote',        grupo: 'Compras'      },
  RECEPCION_MERCANCIA: { icon: 'move_to_inbox',        grupo: 'Compras'      },
  PEDIDO_VENTA:        { icon: 'point_of_sale',        grupo: 'Ventas'       },
  FACTURA_CLIENTE:     { icon: 'receipt_long',         grupo: 'Ventas'       },
  RECIBO_PAGO:         { icon: 'payments',             grupo: 'Ventas'       },
  AJUSTE_INVENTARIO:   { icon: 'edit_note',            grupo: 'Inventario'   },
  CONSUMO_INSUMO:      { icon: 'takeout_dining',       grupo: 'Inventario'   },
  ASIENTO_MANUAL:      { icon: 'edit_document',        grupo: 'Contabilidad' },
};

const GRUPO_COLOR = {
  Compras:      'text-blue-600 bg-blue-50',
  Ventas:       'text-emerald-700 bg-emerald-50',
  Inventario:   'text-amber-700 bg-amber-50',
  Contabilidad: 'text-violet-700 bg-violet-50',
};

function preview(prefijo, consecutivo, padding) {
  const next = (Number(consecutivo) || 0) + 1;
  const pad  = Math.max(1, Math.min(10, Number(padding) || 4));
  const num  = String(next).padStart(pad, '0');
  return prefijo ? `${prefijo}-${num}` : num;
}

function numField(value, onChange, min = 0, max = 9999999) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-center text-[12px] font-mono border border-[#dde8e8] rounded-md px-2 py-1.5 focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/20 bg-white"
    />
  );
}

export default function ConfigNumeracion() {
  const [filas, setFilas]       = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [dirty, setDirty]       = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');
  const original                = useRef([]);

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const data = await apiCall('/api/catalogo/numeracion/');
        const rows = Array.isArray(data) ? data : data.results ?? [];
        original.current = rows.map((r) => ({ ...r }));
        setFilas(rows.map((r) => ({ ...r })));
      } catch (e) {
        setError(e.message || 'Error al cargar la configuración.');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  function update(id, field, value) {
    setFilas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
    setDirty(true);
    setSaved(false);
  }

  function resetFila(id) {
    const orig = original.current.find((r) => r.id === id);
    if (!orig) return;
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...orig } : f)));
    setDirty(true);
  }

  async function guardarTodo() {
    setError('');
    // Validaciones
    for (const f of filas) {
      if (!f.prefijo.trim()) { setError(`Prefijo requerido en "${f.label}".`); return; }
      if (Number(f.consecutivo_actual) < 0) { setError(`Consecutivo inválido en "${f.label}".`); return; }
      const pad = Number(f.digitos_padding);
      if (!pad || pad < 1 || pad > 10) { setError(`Relleno debe ser 1-10 en "${f.label}".`); return; }
    }
    setGuardando(true);
    try {
      await apiCall('/api/catalogo/numeracion/', {
        method: 'POST',
        body: JSON.stringify(filas.map(({ id, prefijo, consecutivo_actual, digitos_padding }) => ({
          id, prefijo: prefijo.trim().toUpperCase(), consecutivo_actual, digitos_padding,
        }))),
      });
      original.current = filas.map((r) => ({ ...r }));
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  }

  // Agrupa por módulo
  const grupos = {};
  filas.forEach((f) => {
    const meta  = TIPO_META[f.tipo_documento] ?? { icon: 'description', grupo: 'Otros' };
    const grupo = meta.grupo;
    if (!grupos[grupo]) grupos[grupo] = [];
    grupos[grupo].push({ ...f, _meta: meta });
  });

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">

        <PageHeader
          title="Numeración de Documentos"
          subtitle="Configura el prefijo, consecutivo y formato de cada tipo de documento"
        >
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Cambios guardados
              </span>
            )}
            <button
              onClick={guardarTodo}
              disabled={!dirty || guardando || cargando}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#012d1d] text-white text-[12px] font-semibold rounded-lg hover:bg-[#1a3d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando
                ? <Spinner size="xs" className="text-white" />
                : <Save className="w-3.5 h-3.5" />}
              Guardar todos los cambios
            </button>
          </div>
        </PageHeader>

        {/* Banner informativo */}
        <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-[18px] flex-shrink-0 mt-0.5">warning</span>
          <p className="text-[12px] text-amber-800">
            Modificar el consecutivo actual solo afecta documentos <strong>nuevos</strong>. No renombra documentos ya creados.
            El siguiente número generado se muestra en la columna <strong>Ejemplo</strong>.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-red-500 text-[16px] flex-shrink-0 mt-0.5">error</span>
            <p className="text-[12px] text-red-700">{error}</p>
          </div>
        )}

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[#6b8f8f]">
            <Spinner size="md" className="text-[#6b8f8f]" />
            <span className="text-[13px]">Cargando configuración…</span>
          </div>
        ) : (
          Object.entries(grupos).map(([grupo, rows]) => (
            <ContentCard key={grupo} className="mb-4">
              {/* Encabezado de grupo */}
              <div className="px-4 py-2.5 border-b border-[#f0f5f5] flex items-center gap-2">
                <span className={`text-[10.5px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${GRUPO_COLOR[grupo] ?? 'text-[#6b8f8f] bg-[#f5f8f8]'}`}>
                  {grupo}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: '680px', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '240px' }} />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '170px' }} />
                    <col style={{ width: '48px' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#f8fafa] border-b border-[#f0f5f5]">
                      {['Tipo de documento', 'Prefijo', 'Consecutivo actual', 'Relleno', 'Ejemplo (siguiente)', ''].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10.5px] font-semibold text-[#6b8f8f] uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((f, i) => {
                      const orig   = original.current.find((r) => r.id === f.id);
                      const changed = orig && (
                        f.prefijo !== orig.prefijo ||
                        String(f.consecutivo_actual) !== String(orig.consecutivo_actual) ||
                        String(f.digitos_padding) !== String(orig.digitos_padding)
                      );
                      const prev = preview(f.prefijo, f.consecutivo_actual, f.digitos_padding);

                      return (
                        <tr
                          key={f.id}
                          className={`border-b border-[#f0f5f5] transition-colors ${changed ? 'bg-amber-50/60' : i % 2 === 0 ? 'bg-white' : 'bg-[#fafcfc]'}`}
                        >
                          {/* Tipo */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className={`material-symbols-outlined text-[18px] ${GRUPO_COLOR[f._meta.grupo]?.split(' ')[0] ?? 'text-[#6b8f8f]'}`}>
                                {f._meta.icon}
                              </span>
                              <span className="text-[12px] font-medium text-[#1a2e2e]">{f.label}</span>
                              {changed && (
                                <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                  sin guardar
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Prefijo */}
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={f.prefijo}
                              maxLength={10}
                              onChange={(e) => update(f.id, 'prefijo', e.target.value.toUpperCase())}
                              placeholder="OC"
                              className="w-full text-[12px] font-mono font-bold text-[#012d1d] border border-[#dde8e8] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]/20 bg-white uppercase"
                            />
                          </td>

                          {/* Consecutivo */}
                          <td className="px-3 py-2.5">
                            {numField(
                              f.consecutivo_actual,
                              (v) => update(f.id, 'consecutivo_actual', v),
                              0, 9999999
                            )}
                          </td>

                          {/* Relleno */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {numField(
                                f.digitos_padding,
                                (v) => update(f.id, 'digitos_padding', v),
                                1, 10
                              )}
                              <span className="text-[10.5px] text-[#aebfbf] flex-shrink-0">dígitos</span>
                            </div>
                          </td>

                          {/* Ejemplo preview */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <Hash className="w-3.5 h-3.5 text-[#aebfbf] flex-shrink-0" />
                              <span className="text-[13px] font-mono font-bold text-[#012d1d] tracking-wide">
                                {prev}
                              </span>
                            </div>
                          </td>

                          {/* Reset fila */}
                          <td className="px-2 py-2.5 text-center">
                            {changed && (
                              <button
                                onClick={() => resetFila(f.id)}
                                title="Descartar cambios de esta fila"
                                className="p-1.5 rounded-md text-[#aebfbf] hover:bg-amber-50 hover:text-amber-600 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ContentCard>
          ))
        )}

        {/* Botón inferior cuando hay cambios */}
        {dirty && !cargando && (
          <div className="sticky bottom-4 flex justify-end mt-2">
            <button
              onClick={guardarTodo}
              disabled={guardando}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#012d1d] text-white text-[13px] font-bold rounded-xl shadow-lg hover:bg-[#1a3d2d] transition-colors disabled:opacity-60"
            >
              {guardando ? <Spinner size="xs" className="text-white" /> : <Save className="w-4 h-4" />}
              Guardar todos los cambios
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
