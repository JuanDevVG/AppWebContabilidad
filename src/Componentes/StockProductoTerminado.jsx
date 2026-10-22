import { useState, useEffect } from 'react';
import { getStockProductoTerminado } from '../utils/apiService';
import {
  AlertError,
  PageHeader, ContentCard,
  Th, Td, THead, TBody, LoadingRows, EmptyRow,
} from '../ui/index.jsx';

function fmtKg(n)     { return `${Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })} kg`; }
function fmtMoneda(n) {
  return Number(n || 0).toLocaleString('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
}

export default function StockProductoTerminado() {
  const [stock,    setStock]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const res = await getStockProductoTerminado();
      setStock(res);
    } catch (err) {
      setErrorMsg(err.message || 'Error al cargar stock');
    } finally {
      setLoading(false);
    }
  }

  const totalKg  = stock.reduce((s, r) => s + Number(r.stock_kg), 0);
  const totalVal = stock.reduce((s, r) => s + Number(r.valor_total), 0);

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f5f8f8] p-6 custom-scrollbar">
        <div className="flex items-center justify-between mb-5">
          <PageHeader title="Stock Prod. Terminado" />
          <button
            onClick={cargar}
            className="text-[12px] font-medium text-[#6b8f8f] hover:text-[#012d1d] transition-colors"
          >
            Actualizar
          </button>
        </div>

        {errorMsg && <AlertError className="mb-4">{errorMsg}</AlertError>}

        {/* Resumen */}
        {!loading && stock.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { label: 'Total en stock', val: fmtKg(totalKg) },
              { label: 'Valor total inventario', val: fmtMoneda(totalVal) },
            ].map(({ label, val }) => (
              <ContentCard key={label}>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8f8f] mb-1">{label}</p>
                  <p className="text-[20px] font-bold text-[#012d1d]">{val}</p>
                </div>
              </ContentCard>
            ))}
          </div>
        )}

        <ContentCard>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <THead>
                <Th>Código</Th>
                <Th>Producto</Th>
                <Th right>Stock (kg)</Th>
                <Th right>Costo prom. /kg</Th>
                <Th right>Valor total</Th>
              </THead>
              <TBody>
                {loading ? (
                  <LoadingRows cols={5} />
                ) : stock.length === 0 ? (
                  <EmptyRow cols={5} title="Sin stock de productos terminados" />
                ) : (
                  stock.map(r => (
                    <tr key={r.id} className="border-b border-[#f0f5f5] hover:bg-[#f8fbfb]">
                      <Td>
                        <span className="font-mono text-[11px] font-semibold text-[#1a2e2e]">{r.codigo}</span>
                      </Td>
                      <Td><span className="font-medium">{r.nombre}</span></Td>
                      <Td right>
                        <span className={`font-semibold ${Number(r.stock_kg) > 0 ? 'text-emerald-700' : 'text-[#aebfbf]'}`}>
                          {fmtKg(r.stock_kg)}
                        </span>
                      </Td>
                      <Td right>{fmtMoneda(r.costo_promedio)}</Td>
                      <Td right>
                        <span className="font-semibold text-[#1a2e2e]">{fmtMoneda(r.valor_total)}</span>
                      </Td>
                    </tr>
                  ))
                )}
              </TBody>
            </table>
          </div>
        </ContentCard>

        <p className="mt-3 text-[11px] text-[#6b8f8f]">
          Costo promedio ponderado calculado sobre todas las entradas por beneficio.
          Stock = entradas (beneficios) − salidas (ventas).
          {/* Pendiente: ajustes de stock PT (AJUSTE_POSITIVO/NEGATIVO) */}
        </p>
      </div>
    </main>
  );
}
