function TotalInversion({ nombre = 'Inversores', total, descripcion, color }) {
  const VARIANT = {
    'bg-green-800':  { bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'text-[#6b8f8f]', value: 'text-emerald-700', icon: 'text-emerald-400' },
    'bg-blue-900':   { bg: 'bg-sky-50',     border: 'border-sky-200',     label: 'text-[#6b8f8f]', value: 'text-sky-700',     icon: 'text-sky-400'   },
    'bg-rose-800':   { bg: 'bg-red-50',     border: 'border-red-200',     label: 'text-[#6b8f8f]', value: 'text-red-700',     icon: 'text-red-400'   },
    'bg-yellow-800': { bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'text-[#6b8f8f]', value: 'text-amber-700',   icon: 'text-amber-400' },
  };
  const v = VARIANT[color] ?? VARIANT['bg-green-800'];

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${v.bg} ${v.border} min-w-[160px]`}>
      <span className={`material-symbols-outlined text-[20px] mt-0.5 flex-shrink-0 ${v.icon}`}>
        paid
      </span>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-wide truncate ${v.label}`}>{nombre}</p>
        <p className={`text-[18px] font-bold leading-snug mt-0.5 ${v.value}`}>{total}</p>
        {descripcion && <p className={`text-[11px] mt-0.5 ${v.label}`}>{descripcion}</p>}
      </div>
    </div>
  );
}

export default TotalInversion;
