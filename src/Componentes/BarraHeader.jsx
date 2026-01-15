function BarraHeader() {
    return (
        <header
            className="h-16 border-b border-[#e6f4f4] dark:border-[#1e3a3a] bg-white dark:bg-[#152e2e] flex items-center justify-between px-8 z-10">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-full max-w-md">
                    <span
                        className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#45a1a1] text-lg">search</span>
                    <input
                        className="w-full bg-background-light dark:bg-[#1a3636] border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-[#45a1a1]/60"
                        placeholder="Search transactions, suppliers or ID..." type="text" />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button
                    className="relative p-2 text-[#45a1a1] hover:bg-background-light dark:hover:bg-[#1a3636] rounded-lg transition-colors">
                    <span className="material-symbols-outlined">notifications</span>
                    <span
                        className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#152e2e]"></span>
                </button>
                <div className="h-8 w-[1px] bg-[#e6f4f4] dark:border-[#1e3a3a] mx-2"></div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold leading-none">Sarah Jenkins</p>
                        <p className="text-[10px] text-[#45a1a1] font-medium">Finance Lead</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 bg-cover bg-center"
                        data-alt="Portrait of Sarah Jenkins, finance manager"
                    ></div>
                </div>
            </div>
        </header>
    );
}

export default BarraHeader;