'use client';

import { useProductEditor } from '../hooks/useProductEditor';
import { CollapsibleSection } from '../shared/CollapsibleSection';

export function PricingSection() {
  const { state, dispatch } = useProductEditor();

  const handleSetField = (field: keyof typeof state, value: unknown) => {
    dispatch({ type: 'SET_FIELD', field, value });
  };

  const discountPercent = state.salePrice && state.basePrice && state.salePrice < state.basePrice
    ? Math.round((1 - state.salePrice / state.basePrice) * 100)
    : null;

  const marginPercent = state.costPrice && state.basePrice && state.basePrice > 0
    ? Math.round(((state.basePrice - state.costPrice) / state.basePrice) * 100)
    : null;

  return (
    <>
      <CollapsibleSection
        title="Preço promocional"
        description="Desconto para o cliente"
        validationStatus="idle"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preço promocional (R$)
            </label>
            <input
              id="sale_price"
              type="number"
              step="0.01"
              min="0"
              value={state.salePrice || ''}
              onChange={(e) => handleSetField('salePrice', e.target.value ? Number(e.target.value) : null)}
              placeholder="Deixe vazio se não houver promoção"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            {discountPercent && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                {discountPercent}% de desconto
              </p>
            )}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Dados profissionais"
        description="Custo, logística e identificação"
        validationStatus="idle"
      >
        <div className="space-y-4">
          <p className="text-xs leading-5 text-gray-500">
            Esses dados ajudam a calcular margem, frete e organizar o catálogo. Não são exibidos ao cliente.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">SKU</span>
              <input
                value={state.sku}
                maxLength={80}
                onChange={(e) => handleSetField('sku', e.target.value.toUpperCase())}
                placeholder="Ex.: CHV-BALM-ROSA"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm uppercase dark:border-gray-700 dark:bg-gray-800"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Custo unitário (R$)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={state.costPrice || ''}
                onChange={(e) => handleSetField('costPrice', e.target.value ? Number(e.target.value) : null)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Peso embalado (g)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={state.weightGrams || ''}
                onChange={(e) => handleSetField('weightGrams', e.target.value ? Number(e.target.value) : 0)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Comprimento (cm)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={state.lengthCm || ''}
                onChange={(e) => handleSetField('lengthCm', e.target.value ? Number(e.target.value) : 0)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Largura (cm)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={state.widthCm || ''}
                onChange={(e) => handleSetField('widthCm', e.target.value ? Number(e.target.value) : 0)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Altura (cm)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={state.heightCm || ''}
                onChange={(e) => handleSetField('heightCm', e.target.value ? Number(e.target.value) : 0)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </label>
          </div>
          {marginPercent && (
            <p className="text-xs font-semibold text-emerald-700">
              Margem bruta estimada: {marginPercent}%
            </p>
          )}
        </div>
      </CollapsibleSection>
    </>
  );
}
