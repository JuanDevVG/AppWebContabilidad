import TransaccionItem from './TransaccionItem.jsx';
import { ContentCard, CardHeader, CardTitle, THead, TBody, Th } from '../ui/index.jsx';

function TransaccionesList() {
  return (
    <div className="lg:col-span-8">
      <ContentCard>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
          <button className="p-1.5 rounded-md text-[#7a9898] hover:text-[#1a2e2e] hover:bg-[#eef3f3] transition-colors">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
          </button>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <THead>
              <Th>Fecha</Th>
              <Th>Descripción</Th>
              <Th>Proveedor</Th>
              <Th center>Cant.</Th>
              <Th right>Total</Th>
              <Th center>Acciones</Th>
            </THead>
            <TBody>
              <TransaccionItem fecha="Oct 18, 2025" descripcion="Bombillo Amarillo" proveedor="Ferremax"   cantidad={10} total="$4.000"  />
              <TransaccionItem fecha="Oct 18, 2025" descripcion="Alambre"           proveedor="Ferremax"   cantidad={13} total="$4.400"  />
              <TransaccionItem fecha="Oct 18, 2025" descripcion="Puntillas"         proveedor="Ferregus"   cantidad={34} total="$6.900"  />
              <TransaccionItem fecha="Oct 18, 2025" descripcion="Lona Verde"        proveedor="Ferretiando" cantidad={11} total="$8.000"  />
              <TransaccionItem fecha="Oct 18, 2025" descripcion="Cemento"           proveedor="Pepito"     cantidad={10} total="$10.000" />
            </TBody>
          </table>
        </div>
      </ContentCard>
    </div>
  );
}

export default TransaccionesList;
