import TotalInversion from './TotalInversion.jsx'
import FormRegistroInversion from './FormRegistroInversion.jsx'
import TransaccionesList from './TransaccionesList.jsx'
import BarraHeader from './BarraHeader.jsx'

function ControlInversiones() {
    return (
        <main className="flex-1 flex flex-col overflow-hidden flex-1">
            <BarraHeader />
            <div className="overflow-y-auto bg-background-light dark:bg-background-dark p-8 custom-scrollbar">
                <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-[#0c1d1d] dark:text-white text-3xl font-black leading-tight tracking-tight">Control de Inversiones</h2>
                        <p className="text-[#45a1a1] text-sm">Control de Inversiones para proyecto Producción y Comercialización de Pollos de Engorde Capipollo</p>
                    </div>

                    <TotalInversion />
                </div>

                <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <FormRegistroInversion />
                    <TransaccionesList />
                </section>
            </div>
        </main>
    )
}

export default ControlInversiones