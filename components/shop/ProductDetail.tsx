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
        <div className="aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-orange-50">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-7xl text-pink-200">
              ◇
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <p className="text-xs font-medium uppercase tracking-wider text-pink-600">
          {CATEGORY_LABELS[product.category] ?? product.category}
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{product.name}</h1>
        <p className="mt-2 text-2xl sm:text-3xl font-semibold text-gray-900">
          {formatPrice(finalPrice)}
        </p>

        {product.description ? (
          <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">
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
                  <h2 className="text-sm font-semibold text-gray-900">Cor</h2>
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
              <h2 className="text-sm font-semibold text-gray-900">
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
                            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 line-through'
                            : isSelected
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <span className="block">{option.name}</span>
                        {option.price_modifier !== 0 ? (
                          <span className="block text-xs font-normal text-gray-500">
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
                <p className="mt-2 text-xs text-gray-500">
                  {selectedOption.stock} em estoque
                </p>
              ) : null}
            </div>

            {options.some((o) => o.dimensions) ? (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-pink-500 to-orange-400 text-white">
                      <th className="px-4 py-2.5 text-left font-semibold">Tamanho</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Dimensões</th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.filter((o) => o.dimensions).map((option, idx) => (
                      <tr
                        key={option.id}
                        className={idx % 2 === 0 ? 'bg-pink-50/50' : 'bg-orange-50/50'}
                      >
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          {option.name}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">
                          {option.dimensions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6">
          <label
            htmlFor="quantity"
            className="block text-sm font-semibold text-gray-900"
          >
            Quantidade
          </label>
          <div className="mt-2 inline-flex items-center rounded-lg border border-gray-300">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-gray-700 hover:bg-gray-50"
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
              className="px-3 py-2 text-gray-700 hover:bg-gray-50"
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
            <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
              Item adicionado ao carrinho.{' '}
              <Link href="/cart" className="font-semibold underline">
                Ver carrinho
              </Link>
            </p>
          ) : feedback === 'error' ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              Não foi possível adicionar. Tente novamente.
            </p>
          ) : null}
        </div>

        <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-600">
          <p className="font-medium text-gray-900">Como funciona</p>
          <p className="mt-1">
            Cada peça é impressa em 3D após a confirmação do pedido. O prazo de
            produção é de 3 a 5 dias úteis, mais o frete.
          </p>
        </div>
      </div>
    </div>
  );
}
