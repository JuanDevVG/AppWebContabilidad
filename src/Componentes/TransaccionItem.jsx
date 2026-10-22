import { Td } from '../ui/index.jsx';

function TransaccionItem({ fecha, descripcion, proveedor, cantidad, total }) {
  return (
    <tr className="hover:bg-[#fafcfc] transition-colors group">
      <Td muted>{fecha}</Td>
      <Td>
        <p className="font-medium">{descripcion}</p>
        <p className="text-[11px] text-[#6b8f8f] mt-0.5">Producto galpón</p>
      </Td>
      <Td muted>{proveedor}</Td>
      <Td center>{cantidad}</Td>
      <Td right className="font-semibold">{total}</Td>
      <Td center>
        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 rounded-md text-[#7a9898] hover:text-[#1a2e2e] hover:bg-[#eef3f3] transition-colors">
            <span className="material-symbols-outlined text-[17px]">edit</span>
          </button>
          <button className="p-1.5 rounded-md text-[#7a9898] hover:text-red-500 hover:bg-red-50 transition-colors">
            <span className="material-symbols-outlined text-[17px]">delete</span>
          </button>
        </div>
      </Td>
    </tr>
  );
}

export default TransaccionItem;
