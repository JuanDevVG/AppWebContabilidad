import TotalInversion from './TotalInversion.jsx'
import FormRegistroInversion from './FormRegistroInversion.jsx'
import TransaccionesList from './TransaccionesList.jsx'
import BarraHeader from './BarraHeader.jsx'

function ControlInversiones() {

    const bgColors = {
        green: 'bg-green-800',
        blue: 'bg-blue-900',
        red: 'bg-rose-800',
        yellow: 'bg-yellow-800',
    }

    return (
        <main className="flex-1 flex flex-col overflow-hidden flex-1">
            <BarraHeader />
            <div className="overflow-y-auto bg-background-light dark:bg-background-dark p-8 custom-scrollbar">
                <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-[#0c1d1d] dark:text-white text-3xl font-black leading-tight tracking-tight">Control de Inversiones</h2>
                        <p className="text-[#45a1a1] text-sm">Control de Inversiones para proyecto de Producción y Comercialización de Pollos de Engorde Capipollo</p>
                    </div>
                    <div className='flex items-center gap-4'>
                        <TotalInversion nombre='Diferencia Inversiones' total="17,750.00" descripcion="Sobre el 50% del total general" color={bgColors.blue} />
                        <TotalInversion nombre="Juan Pablo" total="$80,000.00" descripcion="Total Inversión" color={bgColors.green} />
                        <TotalInversion nombre="José Daniel" total="$44,500.00" descripcion="Total Inversión" color={bgColors.green} />
                        <TotalInversion total="$124,500.00" descripcion="Total General Inversión" color={bgColors.yellow} />
                    </div>

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