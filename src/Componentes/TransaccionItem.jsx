function TransaccionItem({fecha, producto, proveedor, cantidad, total}) {
    return (
        <tr class="hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors group">
            <td class="px-6 py-4 text-sm font-medium">{fecha}</td>
            <td class="px-6 py-4">
                <p class="text-sm font-bold">{producto}</p>
                <p class="text-[11px] text-[#45a1a1]">Producto Galpón</p>
            </td>
            <td class="px-6 py-4 text-sm text-[#45a1a1]">{proveedor}</td>
            <td class="px-6 py-4 text-sm font-bold text-right">{cantidad}</td>
            <td class="px-6 py-4 text-sm font-bold text-right">{total}</td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                    <button
                        class="p-1.5 text-[#45a1a1] hover:text-primary transition-colors">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button
                        class="p-1.5 text-[#45a1a1] hover:text-red-500 transition-colors">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    )
}

export default TransaccionItem 