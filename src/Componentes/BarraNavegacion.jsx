function BarraNavegacion() {
  return (
    <aside
      className="w-64 flex-shrink-0 border-r border-[#e6f4f4] dark:border-[#1e3a3a] bg-white dark:bg-[#152e2e] flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary rounded-lg text-white">
            <img src="assets/logo.png" alt="Logo" />
          </div>
          <div>
            <h1 className="text-[#0c1d1d] dark:text-white text-base font-bold leading-tight">Capipollo</h1>
            <p className="text-[#45a1a1] text-xs font-normal">Contabilidad</p>
          </div>
        </div>
        <nav className="space-y-1">
          <a className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-[#45a1a1] hover:bg-background-light dark:hover:bg-primary/10 rounded-lg transition-colors"
            href="#">
            <span className="material-symbols-outlined material-filled">dashboard</span>
            Inicio
          </a>
          <a className="flex items-center gap-3 px-3 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg"
            href="#">
            <span className="material-symbols-outlined material-filled">receipt_long</span>
            Inversiones / Compras
          </a>
        </nav>
      </div>

    </aside>
  )
}
export default BarraNavegacion