import { useState } from 'react';
import { Field, FieldInput, FieldSelect, BtnPrimary, ContentCard, CardHeader, CardTitle } from '../ui/index.jsx';

function FormRegistroInversion() {
  const [categoria, setCategoria] = useState('');

  return (
    <div className="lg:col-span-4 flex flex-col gap-5">
      <ContentCard>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#6b8f8f] text-[18px]">add_circle</span>
            <CardTitle>Nuevo Registro</CardTitle>
          </div>
        </CardHeader>

        <form className="p-5 space-y-3.5" onSubmit={(e) => e.preventDefault()}>
          <Field label="Inversor">
            <FieldSelect>
              <option>José Daniel</option>
              <option>Juan Pablo</option>
            </FieldSelect>
          </Field>

          <Field label="Categoría">
            <FieldSelect value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="lotePollos">Lote Pollos</option>
              <option value="galpon1">Galpón N°1</option>
              <option value="galpon2">Galpón N°2</option>
            </FieldSelect>
          </Field>

          {categoria === 'lotePollos' && (
            <Field label="Número de lote">
              <FieldInput type="text" placeholder="Ej. L260120" />
            </Field>
          )}

          <Field label="Fecha de inversión">
            <FieldInput type="date" icon="calendar_today" />
          </Field>

          <Field label="Concepto">
            <FieldInput type="text" placeholder="Ej. Bombillo Amarillo" icon="description" />
          </Field>

          <Field label="Proveedor">
            <FieldInput type="text" placeholder="Ej. Ferremax" icon="storefront" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad">
              <FieldInput type="number" placeholder="0" className="text-right" />
            </Field>
            <Field label="Valor unitario ($)">
              <FieldInput type="number" placeholder="0.00" className="text-right" />
            </Field>
          </div>

          {/* Cálculo total */}
          <div className="bg-[#f5f8f8] border border-[#e4ecec] rounded-md px-4 py-3">
            <p className="text-[10px] font-semibold text-[#6b8f8f] uppercase tracking-wide mb-0.5">
              Total calculado
            </p>
            <p className="text-[22px] font-bold text-[#1a2e2e]">$0.00</p>
          </div>

          <BtnPrimary type="submit" className="w-full py-2.5 justify-center mt-1">
            <span className="material-symbols-outlined text-[16px]">playlist_add</span>
            Registrar Inversión
          </BtnPrimary>
        </form>
      </ContentCard>
    </div>
  );
}

export default FormRegistroInversion;
