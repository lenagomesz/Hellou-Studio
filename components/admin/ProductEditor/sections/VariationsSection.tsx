'use client';

import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useProductEditor } from '../hooks/useProductEditor';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { getProductColorName, getProductColorValue, PRODUCT_COLOR_PALETTE } from '@/lib/product-colors';

export function VariationsSection() {
  const { state, dispatch } = useProductEditor();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formPrice, setFormPrice] = useState('0');
  const [formStock, setFormStock] = useState('0');

  const handleAddVariation = () => {
    const id = crypto.randomUUID();
    const priceModifier = Number(formPrice) || 0;
    const stock = Number(formStock) || 0;

    if (!formName.trim() && !formColor.trim()) {
      alert('Nome ou cor são obrigatórios');
      return;
    }

    dispatch({
      type: 'ADD_VARIATION',
      variation: {
        id,
        name: formName.trim(),
        color: formColor.trim() || undefined,
        priceModifier,
        stock,
        _isDirty: false,
      },
    });

    setFormName('');
    setFormColor('');
    setFormPrice('0');
    setFormStock('0');
    setShowForm(false);
  };

  const handleDeleteVariation = (id: string) => {
    dispatch({ type: 'DELETE_VARIATION', id });
  };

  const handleMoveVariation = (id: string, direction: -1 | 1) => {
    dispatch({ type: 'MOVE_VARIATION', id, direction });
  };

  return (
    <CollapsibleSection
      title="Variações"
      description={`${state.variations.length} variações adicionadas`}
      validationStatus="idle"
    >
      <div className="space-y-4">
        {state.variations.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Nenhuma variação. Produto terá preço único.
          </p>
        ) : (
          <div className="space-y-2">
            {state.variations.map((variation, idx) => (
              <div
                key={variation.id}
                className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-700 p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {variation.color && (
                      <div
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: getProductColorValue(variation.color) }}
                        title={getProductColorName(variation.color)}
                      />
                    )}
                    <span className="font-medium text-sm">{variation.name || '(sem nome)'}</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    +R$ {variation.priceModifier.toFixed(2)} • {variation.stock} em estoque
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveVariation(variation.id, -1)}
                    disabled={idx === 0}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveVariation(variation.id, 1)}
                    disabled={idx === state.variations.length - 1}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteVariation(variation.id)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="space-y-3 border-t pt-4">
            <input
              type="text"
              placeholder="Nome/Tamanho (ex: Red M)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Cor padronizada</p>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_COLOR_PALETTE.map((color) => <button key={color.name} type="button" title={color.name} aria-label={color.name} onClick={() => setFormColor(formColor === color.hex ? '' : color.hex)} className={`h-8 w-8 rounded-full border-2 ${formColor === color.hex ? 'border-pink-500 ring-2 ring-pink-200' : 'border-slate-200'}`} style={{ backgroundColor: color.hex }} />)}
              </div>
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(formColor) ? formColor : '#EC4899'} onChange={(event) => setFormColor(event.target.value.toUpperCase())} aria-label="Cor personalizada" className="mt-3 h-10 w-full cursor-pointer rounded border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-900" />
            </div>
            <input
              type="number"
              placeholder="Preço adicional"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Estoque"
              value={formStock}
              onChange={(e) => setFormStock(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddVariation}
                className="flex-1 rounded bg-pink-600 text-white py-2 text-sm font-medium hover:bg-pink-700"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormName('');
                  setFormColor('');
                  setFormPrice('0');
                  setFormStock('0');
                }}
                className="flex-1 rounded border border-gray-300 dark:border-gray-600 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 rounded border border-dashed border-gray-300 dark:border-gray-600 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            <Plus className="h-4 w-4" />
            Adicionar Variação
          </button>
        )}
      </div>
    </CollapsibleSection>
  );
}
