import PolloEngorde from '../assets/images/PolloEngorde.png';
import { getCurrentUser } from '../utils/apiService';

function BarraHeader({ onOpenMobileNav }) {
  const user = getCurrentUser();
  const nombre = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Usuario';
  const rol = user?.rol || '';

  return (
    <header className="h-14 border-b border-[#e4ecec] bg-white flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10">
      {/* Hamburger (solo móvil) */}
      <button
        onClick={onOpenMobileNav}
        className="md:hidden mr-2 p-2 text-[#7a9898] hover:text-[#1a2e2e] hover:bg-[#f0f5f5] rounded-md transition-colors flex-shrink-0"
        aria-label="Abrir menú"
      >
        <span className="material-symbols-outlined text-[22px]">menu</span>
      </button>

      {/* Búsqueda global */}
      <div className="relative w-full max-w-sm hidden sm:block">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#aebfbf] text-[18px] pointer-events-none select-none">
          search
        </span>
        <input
          type="text"
          placeholder="Buscar..."
          className="w-full bg-[#f5f8f8] border border-transparent rounded-md pl-9 pr-4 py-[6px] text-[13px] text-[#1a2e2e] placeholder:text-[#aebfbf] focus:outline-none focus:border-[#dde8e8] focus:bg-white transition-colors"
        />
      </div>

      {/* Acciones y usuario */}
      <div className="flex items-center gap-1">
        {/* Notificaciones */}
        <button className="relative p-2 text-[#7a9898] hover:text-[#1a2e2e] hover:bg-[#f0f5f5] rounded-md transition-colors">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        <div className="w-px h-5 bg-[#e4ecec] mx-2" />

        {/* Perfil */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-semibold text-[#1a2e2e] leading-none">{nombre}</p>
            {rol && <p className="text-[11px] text-[#6b8f8f] mt-0.5">{rol}</p>}
          </div>
          <div className="w-8 h-8 rounded-full bg-[#eef3f3] border border-[#dde8e8] overflow-hidden flex-shrink-0">
            <img src={PolloEngorde} alt="Perfil" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default BarraHeader;
