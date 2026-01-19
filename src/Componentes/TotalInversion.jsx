function TotalInversion({nombre="Inversores", total, descripcion, color}) {
  return (
    <section className="flex gap-4">
      <div
        className={`flex items-center gap-3 bg-primary px-4 py-3 rounded-xl border border-[#cdeaea] dark:border-[#1e3a3a] shadow-sm`}>
        <span className="material-symbols-outlined text-white">shopping_cart</span>
        <div>
          <h3 className="text-lg font-bold text-white leading-none mb-2">{nombre}</h3>
          <p className="text-[13px] tracking-wide text-white leading-none mb-1">{descripcion}</p>
          <p className="text-lg font-bold leading-none text-yellow-400">{total}</p>
        </div>
      </div>
    </section>
  )
}



export default TotalInversion