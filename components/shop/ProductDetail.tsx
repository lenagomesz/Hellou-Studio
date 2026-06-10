'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Product, ProductOption } from '@/types/database';
import { useCart } from '@/components/shop/CartContext';

const CATEGORY_LABELS: Record<string, string> = {
  chaveiros: 'Chaveiros',
  escritorio: 'Escritório',
  criaturas: 'Criaturas',
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function ProductDetail({
  product,
  options,
}: {
  product: Product;
  options: ProductOption[];
}) {
  const { addItem, status } = useCart();
  const [feedback, setFeedback] = useState<'idle' | 'added' | 'error'>('idle');

  const inStockOptions = useMemo(
    () => options.filter((o) => o.stock > 0),
    [options],
  );

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(() =>
    inStockOptions[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);

  const selectedOption =
    options.find((o) => o.id === selectedOptionId) ?? null;

  const finalPrice =
    product.base_price + (selectedOption?.price_modifier ?? 0);

  const maxQuantity = selectedOption?.stock ?? 99;
  const canAddToCart = options.length === 0 || selectedOption !== null;
  const isSyncing = status === 'syncing';

  const handleAddToCart = async () => {
    if (!canAddToCart) return;
    try {
      await addItem({
        product: {
          id: product.id,
          name: product.name,
          base_price: product.base_price,
          image_url: product.image_url,
          category: product.category,
        },
        option: selectedOption
          ? {
              id: selectedOption.id,
              name: selectedOption.name,
              price_modifier: selectedOption.price_modifier,
              stock: selectedOption.stock,
              color: selectedOption.color,
            }
          : null,
        quantity,
      });
      setFeedback('added');
      window.setTimeout(() => setFeedback('idle'), 2500);
    } catch {
      setFeedback('error');
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="group relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 shadow-sm">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-7xl text-pink-200">
              ◇
            </div>
          )}
          {/* Badge de categoria */}
          <span className="absolute top-3 left-3 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-pink-600 dark:text-pink-400 shadow-sm">
            {CATEGORY_LABELS[product.category] ?? product.category}
          </span>
          {/* Badge de frete grátis se aplicável */}
          {finalPrice >= 99 && (
            <span className="absolute top-3 right-3 rounded-full bg-green-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              Frete grátis
            </span>
          )}
        </div>
        {/* Mini galeria placeholder com gradientes */}
        <div className="grid grid-cols-4 gap-2">
          {[
            'from-pink-100 to-orange-50',
            'from-orange-100 to-pink-50',
            'from-purple-100 to-pink-50',
            'from-amber-100 to-orange-50',
          ].map((gradient, i) => (
            <div key={i} className={`aspect-square rounded-xl bg-gradient-to-br ${gradient} ${i === 0 && product.image_url ? 'ring-2 ring-pink-400' : ''} overflow-hidden`}>
              {i === 0 && product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt="" className="h-full w-full object-cover opacity-80" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg text-gray-300/60">
                  {['📸', '🎨', '📐', '✨'][i]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-pink-600 dark:text-pink-400">
            {CATEGORY_LABELS[product.category] ?? product.category}
          </p>
          <span className="rounded-full bg-green-50 dark:bg-green-950/50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">Em estoque</span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
        <div className="mt-3 flex items-baseline gap-3">
          <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">
            {formatPrice(finalPrice)}
          </p>
          {finalPrice >= 99 && (
            <span className="text-xs text-green-600 font-medium">+ frete grátis</span>
          )}
        </div>

        {product.description ? (
          <p className="mt-4 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {product.description}
          </p>
        ) : null}

        {options.length > 0 ? (
          <div className="mt-6 space-y-5">
            {/* Color swatches (only if any option has color) */}
            {options.some((o) => o.color) && (() => {
              const colors = Array.from(new Set(options.filter((o) => o.color).map((o) => o.color!)));
              const selectedColor = selectedOption?.color ?? colors[0] ?? null;
              return (
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Cor</h2>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {colors.map((color) => {
                      const isActive = selectedColor === color;
                      const colorOptions = options.filter((o) => o.color === color);
                      const allOutOfStock = colorOptions.every((o) => o.stock === 0);
                      return (
                        <button
                          key={color}
                          type="button"
                          disabled={allOutOfStock}
                          onClick={() => {
                            const firstInStock = colorOptions.find((o) => o.stock > 0);
                            if (firstInStock) {
                              setSelectedOptionId(firstInStock.id);
                              setQuantity(1);
                            }
                          }}
                          className={`relative h-8 w-8 rounded-full border-2 transition-all ${
                            allOutOfStock
                              ? 'cursor-not-allowed opacity-40'
                              : isActive
                                ? 'border-pink-500 ring-2 ring-pink-200 scale-110'
                                : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                          }`}
                          title={color}
                        >
                          <span
                            className="absolute inset-1 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {allOutOfStock && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="block h-[2px] w-6 rotate-45 bg-gray-400 rounded" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Size / Variation pills */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {options.every((o) => ['P', 'M', 'G'].includes(o.name.toUpperCase())) ? 'Tamanho' : 'Variação'}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(() => {
                  const hasColors = options.some((o) => o.color);
                  const selectedColor = selectedOption?.color ?? null;
                  const visibleOptions = hasColors && selectedColor
                    ? options.filter((o) => o.color === selectedColor)
                    : options;
                  return visibleOptions.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    const outOfStock = option.stock === 0;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          if (outOfStock) return;
                          setSelectedOptionId(option.id);
                          setQuantity(1);
                        }}
                        disabled={outOfStock}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          outOfStock
                            ? 'cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 line-through'
                            : isSelected
                              ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400'
                              : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="block">{option.name}</span>
                        {option.price_modifier !== 0 ? (
                          <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                            {option.price_modifier > 0 ? '+' : ''}
                            {formatPrice(option.price_modifier)}
                          </span>
                        ) : null}
                      </button>
                    );
                  });
                })()}
              </div>
              {selectedOption ? (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {selectedOption.stock} em estoque
                </p>
              ) : null}
            </div>

            {options.some((o) => o.dimensions) ? (
              <details className="group rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 text-sm font-semibold text-white select-none">
                  <span>📐 Tabela de dimensões</span>
                  <span className="transition-transform duration-200 group-open:rotate-180">▾</span>
                </summary>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tamanho</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Dimensões</th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.filter((o) => o.dimensions).map((option, idx) => (
                      <tr
                        key={option.id}
                        className={`transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-pink-50/30 dark:bg-gray-800/50'} hover:bg-pink-50 dark:hover:bg-gray-800`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {option.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">
                          {option.dimensions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6">
          <label
            htmlFor="quantity"
            className="block text-sm font-semibold text-gray-900 dark:text-white"
          >
            Quantidade
          </label>
          <div className="mt-2 inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span className="min-w-[2.5rem] px-2 text-center text-sm font-medium">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => Math.min(maxQuantity, q + 1))
              }
              className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-8">
          <button
            type="button"
            disabled={!canAddToCart || isSyncing}
            onClick={() => void handleAddToCart()}
            className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!canAddToCart
              ? 'Selecione uma variação'
              : isSyncing
                ? 'Adicionando...'
                : 'Adicionar ao carrinho'}
          </button>
          {feedback === 'added' ? (
            <p className="mt-3 rounded-lg bg-green-50 dark:bg-green-950/50 px-3 py-2 text-xs text-green-700 dark:text-green-400">
              Item adicionado ao carrinho.{' '}
              <Link href="/cart" className="font-semibold underline">
                Ver carrinho
              </Link>
            </p>
          ) : feedback === 'error' ? (
            <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-950/50 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              Não foi possível adicionar. Tente novamente.
            </p>
          ) : null}
        </div>

        <div className="mt-8 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-pink-50/30 dark:from-gray-900 dark:to-gray-900 p-5">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Sobre este produto</p>
          <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950/50 text-[10px]">🖨️</span>
              <span>Impresso em 3D sob demanda após a confirmação do pedido</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/50 text-[10px]">⏱️</span>
              <span>Prazo de produção: 3 a 5 dias úteis + frete</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/50 text-[10px]">♻️</span>
              <span>Material PLA biodegradável de alta qualidade</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/50 text-[10px]">🚚</span>
              <span>Frete grátis acima de R$99</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-gray-400 dark:text-gray-500">
          <span className="inline-flex items-center gap-1">🔒 Pagamento seguro</span>
          <span className="inline-flex items-center gap-1">✨ Bom acabamento</span>
          <span className="inline-flex items-center gap-1">💬 Atendimento humanizado</span>
        </div>
      </div>
    </div>
  );
}
