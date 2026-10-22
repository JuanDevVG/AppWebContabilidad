import { useState, useEffect, useMemo } from 'react';
import { Save } from 'lucide-react';
import {
  getParametrosEmpresa, updateParametrosEmpresa, getCuentasContables, mensajeError,
} from '../utils/apiService';
import {
  PageHeader, ContentCard, Spinner, Field, FieldSelect, AlertError, AlertSuccess, BtnPrimary,
} from '../ui/index.jsx';

const TIPOS_PERSONA = [
  { value: 'NATURAL',  label: 'Persona natural',  ayuda: 'Sugerida: 3130 Capital de personas naturales' },
  { value: 'JURIDICA', label: 'Persona jurídica', ayuda: 'Sugerida: 3105 Capital suscrito y pagado' },
];

export default function ParametrosEmpresa() {
  const [params, setParams]       = useState(null);
  const [cuentas, setCuentas]     = useState([]);
  const [tipo, setTipo]           = useState('');
  const [cuentaId, setCuentaId]   = useState('');
  const [cargando, setCargando]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');
  const [ok, setOk]               = useState('');

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const [p, cs] = await Promise.all([getParametrosEmpresa(), getCuentasContables()]);
        setParams(p);
        setCuentas(Array.isArray(cs) ? cs : []);
        setTipo(p.tipo_persona || '');
        setCuentaId(p.cuenta_patrimonio_apertura_id ? String(p.cuenta_patrimonio_apertura_id) : '');
      } catch (e) {
        setError(mensajeError(e, 'Error al cargar los parámetros.'));
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const cuentasPatrimonio = useMemo(
    () => cuentas.filter((c) => c.codigo.startsWith('31') && c.acepta_transacciones && c.activo),
    [cuentas],
  );

  function elegirTipo(nuevo) {
    setTipo(nuevo);
    setOk('');
    const sugerida = params?.cuenta_sugerida_por_tipo?.[nuevo];
    if (sugerida) setCuentaId(String(sugerida));
  }

  async function guardar() {
    setError('');
    setOk('');
    if (!tipo) { setError('Elige si la empresa es persona natural o jurídica.'); return; }
    setGuardando(true);
    try {
      const p = await updateParametrosEmpresa({
        tipo_persona: tipo,
        cuenta_patrimonio_apertura_id: cuentaId ? Number(cuentaId) : null,
      });
      setParams(p);
      setCuentaId(p.cuenta_patrimonio_apertura_id ? String(p.cuenta_patrimonio_apertura_id) : '');
      setOk('Parámetros guardados.');
    } catch (e) {
      setError(mensajeError(e, 'Error al guardar.'));
    } finally {
      setGuardando(false);
    }
  }

  const ayudaTipo = TIPOS_PERSONA.find((t) => t.value === tipo)?.ayuda;

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <PageHeader
          title="Parámetros de Empresa"
          subtitle="Tipo de persona y cuenta de patrimonio para los saldos iniciales de caja y bancos"
        />

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[#6b8f8f]">
            <Spinner size="md" className="text-[#6b8f8f]" />
            <span className="text-[13px]">Cargando parámetros…</span>
          </div>
        ) : (
          <ContentCard className="max-w-xl">
            <div className="p-5 space-y-4">
              {error && <AlertError>{error}</AlertError>}
              {ok && <AlertSuccess>{ok}</AlertSuccess>}

              {!params?.cuenta_patrimonio_apertura_id && (
                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-[18px] flex-shrink-0 mt-0.5">warning</span>
                  <p className="text-[12px] text-amber-800">
                    Sin esta configuración no se pueden registrar cajas o bancos con saldo inicial.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold text-[#1a4731] mb-1.5">Tipo de persona</label>
                <div className="flex rounded-lg overflow-hidden border border-[#c8ddd6]">
                  {TIPOS_PERSONA.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => elegirTipo(t.value)}
                      className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors ${
                        tipo === t.value ? 'bg-[#1a7a4a] text-white' : 'text-[#6b8f8f] hover:bg-[#f0f7f4]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {ayudaTipo && <p className="text-[11px] text-[#6b8f8f] mt-1">{ayudaTipo}</p>}
              </div>

              <Field label="Cuenta de patrimonio para el saldo inicial">
                <FieldSelect value={cuentaId} onChange={(e) => { setCuentaId(e.target.value); setOk(''); }}>
                  <option value="">— Seleccionar —</option>
                  {cuentasPatrimonio.map((c) => (
                    <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>
                  ))}
                </FieldSelect>
              </Field>
              <p className="text-[11px] text-[#6b8f8f] -mt-2">
                Solo cuentas del grupo 31 que aceptan movimientos. Para otra cuenta (por ejemplo
                3115 Aportes sociales), créala primero en el Plan de Cuentas.
              </p>

              <div className="flex justify-end pt-1">
                <BtnPrimary onClick={guardar} disabled={guardando}>
                  {guardando ? <Spinner size="xs" className="text-white" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar
                </BtnPrimary>
              </div>
            </div>
          </ContentCard>
        )}
      </div>
    </main>
  );
}
