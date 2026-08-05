'use client';

import { useState } from 'react';
import { useProductEditor } from '../hooks/useProductEditor';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { ProductCategorySelect } from '@/components/admin/ProductCategorySelect';
import { CustomizationSectionsEditor } from '@/components/admin/CustomizationSectionsEditor';
import { DEFAULT_CUSTOMIZATION_COPY } from '@/lib/product-customization';

export function BasicInfoSection() {
  const { state, dispatch } = useProductEditor();

  const handleSetField = (field: keyof typeof state, value: unknown) => {
    dispatch({ type: 'SET_FIELD', field, value });
  };

  return (
    <>
      <CollapsibleSection
        title="01 · Identidade"
        description="Informações principais"
        validationStatus={state.errors.name ? 'error' : state.name ? 'valid' : 'idle'}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome
            </label>
            <input
              id="name"
              type="text"
              value={state.name}
              onChange={(e) => handleSetField('name', e.target.value)}
              maxLength={120}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            {state.errors.name && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <textarea
              id="description"
              value={state.description}
              onChange={(e) => handleSetField('description', e.target.value)}
              maxLength={1000}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Categoria
              </label>
              <ProductCategorySelect
                id="category"
                value={state.category}
                onChange={(cat: string) => handleSetField('category', cat)}
                exclude={['encomenda']}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label htmlFor="base_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Preço base (R$)
              </label>
              <input
                id="base_price"
                type="number"
                step="0.01"
                min="0"
                value={state.basePrice}
                onChange={(e) => handleSetField('basePrice', Number(e.target.value))}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              {state.errors.basePrice && (
                <p className="mt-1 text-xs text-red-600">{state.errors.basePrice}</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Como este produto é atendido?</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ['made_to_order', 'Sob demanda', 'Produzir após o pagamento'],
                ['ready_stock', 'Pronta-entrega', 'Usar apenas peças prontas'],
                ['hybrid', 'Híbrido', 'Pronto quando houver, produzir se faltar'],
              ] as const).map(([value, label, detail]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSetField('fulfillmentMode', value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    state.fulfillmentMode === value
                      ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-500/10 dark:bg-pink-500/10'
                      : 'border-gray-200 hover:border-pink-200 dark:border-gray-700'
                  }`}
                >
                  <span className="block text-sm font-bold text-gray-900 dark:text-white">{label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-gray-500">{detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 transition ${
              state.isWholesale
                ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-500/10'
                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
            }`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={state.isWholesale}
                onChange={(e) => handleSetField('isWholesale', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span>
                <span className="block text-sm font-bold text-gray-900 dark:text-white">Disponível para lojistas?</span>
                <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                  O produto mantém a compra normal de 1 unidade e também oferece 20, 50, 100 ou uma quantidade digitada pelo cliente.
                </span>
              </span>
            </label>
            {state.isWholesale && (
              <label className="mt-4 block max-w-xs">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Mínimo para compra de lojista</span>
                <input
                  type="number"
                  min={2}
                  max={999}
                  step={1}
                  required
                  value={state.minimumOrderQuantity}
                  onChange={(e) => handleSetField('minimumOrderQuantity', Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-orange-900 dark:bg-gray-900 dark:text-white"
                />
                <span className="mt-1 block text-xs text-gray-500">
                  A opção de 1 unidade continua disponível no varejo; pedidos com mais unidades respeitam este mínimo.
                </span>
              </label>
            )}
          </div>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
              state.isCustomizable
                ? 'border-pink-300 bg-pink-50 dark:border-pink-800 dark:bg-pink-500/10'
                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
            }`}
          >
            <input
              type="checkbox"
              checked={state.isCustomizable}
              onChange={(e) => handleSetField('isCustomizable', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            <span>
              <span className="block text-sm font-bold text-gray-900 dark:text-white">Produto personalizado?</span>
              <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                Se marcado, o cliente deverá escrever a personalização desejada antes de adicionar o produto ao carrinho.
              </span>
            </span>
          </label>

          {state.isCustomizable && (
            <section className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50/80 to-orange-50/60 p-4 dark:border-pink-900/50 dark:from-pink-950/20 dark:to-orange-950/10 sm:p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Texto para o cliente</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Como pedir a personalização</h2>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Pergunta exibida ao cliente *</span>
                  <input
                    value={state.customizationQuestion}
                    onChange={(e) => handleSetField('customizationQuestion', e.target.value)}
                    maxLength={120}
                    placeholder={DEFAULT_CUSTOMIZATION_COPY.question}
                    className="mt-1 w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm dark:border-pink-900 dark:bg-gray-900"
                  />
                  <span className="mt-1 block text-right text-[11px] text-gray-400">{state.customizationQuestion.length}/120</span>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Orientação abaixo da pergunta</span>
                  <textarea
                    value={state.customizationHelpText}
                    onChange={(e) => handleSetField('customizationHelpText', e.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder={DEFAULT_CUSTOMIZATION_COPY.helpText}
                    className="mt-1 w-full resize-none rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm dark:border-pink-900 dark:bg-gray-900"
                  />
                  <span className="mt-1 block text-right text-[11px] text-gray-400">{state.customizationHelpText.length}/300</span>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Exemplo dentro do campo</span>
                  <input
                    value={state.customizationPlaceholder}
                    onChange={(e) => handleSetField('customizationPlaceholder', e.target.value)}
                    maxLength={180}
                    placeholder={DEFAULT_CUSTOMIZATION_COPY.placeholder}
                    className="mt-1 w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm dark:border-pink-900 dark:bg-gray-900"
                  />
                  <span className="mt-1 block text-right text-[11px] text-gray-400">{state.customizationPlaceholder.length}/180</span>
                </label>
              </div>

              <div className="mt-4 rounded-xl border border-pink-100 bg-white p-3 dark:border-pink-900/60 dark:bg-gray-900">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Prévia para o cliente</p>
                <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                  {state.customizationQuestion || DEFAULT_CUSTOMIZATION_COPY.question} <span className="text-pink-600">*</span>
                </p>
                {state.customizationHelpText && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{state.customizationHelpText}</p>}
                <div className="mt-2 rounded-lg border border-pink-100 px-3 py-2 text-sm text-gray-400 dark:border-pink-900/60">
                  {state.customizationPlaceholder || 'Campo sem exemplo'}
                </div>
              </div>
            </section>
          )}

          {state.isCustomizable && (
            <CustomizationSectionsEditor
              value={state.customizationSections}
              onChange={(sections) => handleSetField('customizationSections', sections)}
            />
          )}
        </div>
      </CollapsibleSection>
    </>
  );
}
