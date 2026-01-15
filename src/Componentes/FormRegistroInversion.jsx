function FormRegistroInversion() {
    return (
        <>
            <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white dark:bg-[#152e2e] rounded-xl border border-[#cdeaea] dark:border-[#1e3a3a] shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[#e6f4f4] dark:border-[#1e3a3a]">
                        <h3 className="text-[#0c1d1d] dark:text-white text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">add_circle</span>
                            Nuevo Registro
                        </h3>
                    </div>

                    <form className="p-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-[#45a1a1] uppercase mb-1.5 ml-1">
                                    Inversor
                                </label>
                                <select className="w-full bg-background-light dark:bg-[#1a3636] border-none rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-primary/20">
                                    <option>José Daniel</option>
                                    <option>Juan Pablo</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="fechaInversion" className="block text-xs font-bold text-[#45a1a1] uppercase mb-1.5 ml-1">Fecha de Inversión</label>
                                <div className="relative">
                                    <span
                                        className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#45a1a1] text-lg">calendar_today</span>
                                    <input type="date" id="fechaInversion" className="w-full bg-background-light dark:bg-[#1a3636] border-none rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-primary/20" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="productoServicio" className="block text-xs font-bold text-[#45a1a1] uppercase mb-1.5 ml-1">Producto / Descripcion Servicio</label>
                                <input id="productoServicio" type="text" placeholder="Ej. Bombillo Amarillo" className="w-full bg-background-light dark:bg-[#1a3636] border-none rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-primary/20"/>
                            </div>
                            <div>
                                <label htmlFor="proveedor" className="block text-xs font-bold text-[#45a1a1] uppercase mb-1.5 ml-1">Proveedor</label>
                                <input id="proveedor" type="text" placeholder="Ej. Ferremax" className="w-full bg-background-light dark:bg-[#1a3636] border-none rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-primary/20"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="cantidad"
                                        className="block text-xs font-bold text-[#45a1a1] uppercase mb-1.5 ml-1">Cantidad</label>
                                    <input id="cantidad"
                                        className="w-full bg-background-light dark:bg-[#1a3636] border-none rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-primary/20 text-right"
                                        type="number" />
                                </div>
                                <div>
                                    <label htmlFor="valorUnitario"
                                        className="block text-xs font-bold text-[#45a1a1] uppercase mb-1.5 ml-1">Valor Unitario ($)</label>
                                    <input id="valorUnitario"
                                        className="w-full bg-background-light dark:bg-[#1a3636] border-none rounded-lg text-sm px-4 py-3 focus:ring-2 focus:ring-primary/20 text-right"
                                        placeholder="0.00" type="number" />
                                </div>
                            </div>
                            <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-lg border border-dashed border-primary/20">
                                <p className="block text-[10px] font-bold text-primary uppercase mb-1">Cálculo Total Inversión</p>
                                <div className="text-2xl font-black text-primary">$0.00</div>
                            </div>
                        </div>
                        <button className="w-full bg-primary hover:bg-[#005a5a] text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4"
                                type="submit" >
                            <span className="material-symbols-outlined">playlist_add</span>
                            Registrar Inversión
                        </button>
                    </form>
                </div>
            </div>
        </>
    )
}

export default FormRegistroInversion