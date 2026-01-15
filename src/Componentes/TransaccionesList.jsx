import TransaccionItem from "./TransaccionItem.jsx";

function TransaccionesList() {
    return (
        <>
            <div className="lg:col-span-8">
                <div className="bg-white dark:bg-[#152e2e] rounded-xl border border-[#cdeaea] dark:border-[#1e3a3a] shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[#e6f4f4] dark:border-[#1e3a3a] flex items-center justify-between bg-white dark:bg-[#152e2e] sticky top-0">
                        <h3 className="text-[#0c1d1d] dark:text-white text-lg font-bold">Transacciones Recientes</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-background-light/50 dark:bg-[#1a3636]/50">
                                    <th
                                        className="px-6 py-4 text-[10px] font-bold text-[#45a1a1] uppercase tracking-wider">
                                        Fecha</th>
                                    <th
                                        className="px-6 py-4 text-[10px] font-bold text-[#45a1a1] uppercase tracking-wider">
                                        Descripción</th>
                                    <th
                                        className="px-6 py-4 text-[10px] font-bold text-[#45a1a1] uppercase tracking-wider">
                                        Proveedor</th>
                                    <th
                                        className="px-6 py-4 text-[10px] font-bold text-[#45a1a1] uppercase tracking-wider">
                                        Cantidad</th>
                                    <th
                                        className="px-6 py-4 text-[10px] font-bold text-[#45a1a1] uppercase tracking-wider text-right">
                                        Total</th>
                                    <th
                                        className="px-6 py-4 text-[10px] font-bold text-[#45a1a1] uppercase tracking-wider text-center">
                                        Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e6f4f4] dark:divide-[#1e3a3a]">

                                <TransaccionItem fecha="Oct 18, 2025" descripción="Bombillo Amarillo" proveedor="Ferremax" cantidad={10} total="$4.000" />
                                <TransaccionItem fecha="Oct 18, 2025" descripción="Alambre" proveedor="Ferremax" cantidad={13} total="$4.400" />
                                <TransaccionItem fecha="Oct 18, 2025" descripción="Puntillas " proveedor="Ferregus" cantidad={34} total="$6.900" />
                                <TransaccionItem fecha="Oct 18, 2025" descripción="Lona Verde" proveedor="Ferretiando" cantidad={11} total="$8.000" />
                                <TransaccionItem fecha="Oct 18, 2025" descripción="Cemento" proveedor="Pepito" cantidad={10} total="$10.000" />
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    )
}

export default TransaccionesList