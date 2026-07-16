'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { Product, ProductOption } from '@/types/database';
import { useCart } from '@/components/shop/CartContext';
import { ImageGallery } from '@/components/shop/ImageGallery';
import { getProductColorName, getProductColorValue } from '@/lib/product-colors';

const CATEGORY_LABELS: Record<string, string> = {
  chaveiros: 'Chaveiros',
  escritorio: 'Escritório',
  criaturas: 'Criaturas',
  decoracao: 'Decoração',
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
  ownedOrderId = null,
}: Readonly<{
  product: Product;
  options: ProductOption[];
  ownedOrderId?: string | null;
}>) {
  const { addItem, removeItem, status } = useCart();
  const { status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const replaceCartItemId = searchParams.get('replace');
  const [feedback, setFeedback] = useState<'idle' | 'added' | 'error'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [shared, setShared] = useState(false);
  const isAuthenticated = sessionStatus === 'authenticated';
  const isOwnedDigital = product.type === 'digital' && Boolean(ownedOrderId);
  const requiresReadyStock = product.fulfillment_mode === 'ready_stock';

  const inStockOptions = useMemo(
    () => options.filter((option) => !requiresReadyStock || option.stock > 0),
    [options, requiresReadyStock],
  );

  const preselectedOptionId = searchParams.get('option');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(() =>
    (preselectedOptionId && options.some(o => o.id === preselectedOptionId)) ? preselectedOptionId : inStockOptions[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [customizationText, setCustomizationText] = useState(() => searchParams.get('customization') ?? '');
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);

  const selectedOption =
    options.find((o) => o.id === selectedOptionId) ?? null;

  const finalPrice =
    (product.sale_price ?? product.base_price) + (selectedOption?.price_modifier ?? 0);
  const originalPrice = product.base_price + (selectedOption?.price_modifier ?? 0);

  const currentDisplayImage = displayImageUrl || selectedOption?.image_url || product.image_url;

  const galleryImages = useMemo(() => {
    const registeredImages = Array.isArray(product.images) ? product.images : [];
    return Array.from(
      new Set(
        [currentDisplayImage, ...registeredImages, product.image_url_2]
          .filter((image): image is string => typeof image === 'string')
          .map((image) => image.trim())
          .filter(Boolean),
      ),
    );
  }, [currentDisplayImage, product.image_url_2, product.images]);

  const maxQuantity = requiresReadyStock ? Math.min(selectedOption?.stock ?? 50, 50) : 50;
  const hasRequiredCustomization = !product.is_customizable || customizationText.trim().length > 0;
  const hasSelectedOption = options.length === 0 || selectedOption !== null;
  const canAddToCart = !isOwnedDigital && hasSelectedOption && hasRequiredCustomization;
  const isSyncing = status === 'syncing';

  const handleAddToCart = async () => {
    if (!canAddToCart) return;

    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=${encodeURIComponent(globalThis.location?.pathname ?? '/' + (globalThis.location?.search ?? ''))}`);
      return;
    }

    try {
      setFeedbackMessage('');
      if (replaceCartItemId) {
        await removeItem(replaceCartItemId);
      }
      await addItem({
        product: {
          id: product.id,
          name: product.name,
          base_price: product.base_price,
          sale_price: product.sale_price,
          image_url: product.image_url,
          category: product.category,
          type: product.type,
          fulfillment_mode: product.fulfillment_mode,
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
        customization_text: product.is_customizable ? customizationText.trim() : null,
      });
      if (replaceCartItemId) {
        router.push('/cart');
        return;
      }
      setFeedback('added');
      globalThis.setTimeout(() => setFeedback('idle'), 2500);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : 'Não foi possível adicionar. Tente novamente.');
      setFeedback('error');
    }
  };

  return (
    <div className="grid gap-2 sm:gap-6 lg:grid-cols-2 lg:gap-8">
      <div className="space-y-6">
        <div className="group relative">
          {galleryImages.length > 0 ? (
            <ImageGallery images={galleryImages} alt={product.name} />
          ) : (
            <div className="aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 shadow-sm flex h-full w-full items-center justify-center text-7xl text-pink-200">
              ◇
            </div>
          )}
          {product.tags && product.tags.length > 0 && (
            <div className="absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
              {product.tags.slice(0, 3).map((tag) => (
                <span key={tag.id} className="rounded-full px-3 py-1 text-[10px] font-bold text-white shadow-md ring-1 ring-white/40" style={{ backgroundColor: tag.color }}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          {/* Badge de frete grátis se aplicável */}
          {finalPrice >= 99 && (
            <span className="absolute top-3 right-3 rounded-full bg-green-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              Frete grátis
            </span>
          )}
        </div>

        {product.type !== 'digital' && (
          <div className="hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-pink-50/30 dark:from-gray-900 dark:to-gray-900 p-5 lg:block">
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
        )}
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-pink-600 dark:text-pink-400">
            {CATEGORY_LABELS[product.category] ?? product.category}
          </p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isOwnedDigital ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400'}`}>
            {isOwnedDigital ? '✓ Adquirido' : 'Em estoque'}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:mt-2 sm:text-3xl dark:text-white">{product.name}</h1>
        <div className="mt-3 flex items-baseline gap-3">
          <p
            key={selectedOptionId ?? 'base-price'}
            aria-live="polite"
            className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent"
          >
            {formatPrice(finalPrice)}
          </p>
          {product.sale_price !== null && product.sale_price < product.base_price && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(originalPrice)}</span>
          )}
          {finalPrice >= 99 && (
            <span className="text-xs text-green-600 font-medium">+ frete grátis</span>
          )}
        </div>

        {product.description ? (
          <p className="mt-4 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {product.description}
          </p>
        ) : null}

        {product.is_customizable && (
          <div className="mt-6 rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-orange-50/60 p-4 dark:border-pink-900/60 dark:from-pink-950/30 dark:to-orange-950/20 sm:p-5">
            <label htmlFor="product-customization" className="block text-sm font-bold text-gray-900 dark:text-white">
              Como você quer personalizar? <span className="text-pink-600">*</span>
            </label>
            <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">Escreva o nome, frase ou orientação que devemos seguir na produção.</p>
            <textarea
              id="product-customization"
              value={customizationText}
              onChange={(event) => setCustomizationText(event.target.value)}
              maxLength={500}
              rows={3}
              required
              placeholder="Ex.: Nome Helena, com a primeira letra maiúscula"
              className="mt-3 w-full resize-none rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 dark:border-pink-900 dark:bg-gray-900 dark:text-white dark:focus:ring-pink-500/10"
            />
            <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px]">
              <span className={hasRequiredCustomization ? 'text-green-600 dark:text-green-400' : 'text-pink-700 dark:text-pink-300'}>{hasRequiredCustomization ? 'Personalização preenchida' : 'Preenchimento obrigatório para adicionar ao carrinho'}</span>
              <span className="text-gray-400">{customizationText.length}/500</span>
            </div>
          </div>
        )}

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
                      const allOutOfStock = requiresReadyStock && colorOptions.every((o) => o.stock === 0);
                      return (
                        <button
                          key={color}
                          type="button"
                          disabled={allOutOfStock}
                          onClick={() => {
                            const firstInStock = colorOptions.find((o) => !requiresReadyStock || o.stock > 0);
                            if (firstInStock) {
                              setSelectedOptionId(firstInStock.id);
                              setDisplayImageUrl(firstInStock.image_url || null);
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
                          title={getProductColorName(color)}
                        >
                          <span
                            className="absolute inset-1 rounded-full"
                            style={{ backgroundColor: getProductColorValue(color) }}
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
            {options.some((option) => option.name.trim()) && <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {options.filter((option) => option.name.trim()).every((o) => ['P', 'M', 'G'].includes(o.name.toUpperCase())) ? 'Tamanho' : 'Variação'}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(() => {
                  const hasColors = options.some((o) => o.color);
                  const selectedColor = selectedOption?.color ?? null;
                  const visibleOptions = (hasColors && selectedColor
                    ? options.filter((o) => o.color === selectedColor)
                    : options).filter((option) => option.name.trim());
                  return visibleOptions.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    const outOfStock = requiresReadyStock && option.stock === 0;
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
                      </button>
                    );
                  });
                })()}
              </div>
              {selectedOption ? (
                <div className="mt-3 rounded-xl border border-pink-100 bg-pink-50/70 px-3 py-2.5 dark:border-pink-900/60 dark:bg-pink-950/30">
                  <p className="text-xs font-bold text-pink-700 dark:text-pink-300">
                    {selectedOption.name ? `Preço com “${selectedOption.name}”` : 'Novo preço'}: {formatPrice(finalPrice)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {requiresReadyStock
                      ? `${selectedOption.stock} em pronta-entrega`
                      : product.fulfillment_mode === 'hybrid' && selectedOption.stock > 0
                        ? `${selectedOption.stock} em pronta-entrega; demais unidades sob demanda`
                        : 'Produzido sob demanda após o pagamento'}
                  </p>
                </div>
              ) : null}
            </div>}

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

        {product.type !== 'digital' && <div className="mt-6">
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
        </div>}

        <div className="mt-8">
          {isOwnedDigital && ownedOrderId ? (
            <Link href={`/account/orders/${ownedOrderId}`} className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
              ✓ Adquirido — acessar arquivo
            </Link>
          ) : (
            <button
              type="button"
              disabled={!canAddToCart || isSyncing}
              onClick={() => void handleAddToCart()}
              className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!hasSelectedOption
                ? 'Selecione uma variação'
                : !hasRequiredCustomization
                  ? 'Preencha a personalização'
                : isSyncing
                  ? 'Adicionando...'
                  : 'Adicionar ao carrinho'}
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              const url = globalThis.location?.href ?? '';
              if (navigator.share) {
                try { await navigator.share({ title: product.name, url }); } catch {}
              } else {
                await navigator.clipboard.writeText(url);
                setShared(true);
                setTimeout(() => setShared(false), 2000);
              }
            }}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186Z" />
            </svg>
            {shared ? 'Link copiado!' : 'Compartilhar'}
          </button>

          {product.type !== 'digital' && (
            <div className="mt-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-pink-50/30 p-5 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900 lg:hidden">
              <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Sobre este produto</p>
              <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-100 text-[10px] dark:bg-pink-950/50">🖨️</span><span>Impresso em 3D sob demanda após a confirmação do pedido</span></div>
                <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[10px] dark:bg-orange-950/50">⏱️</span><span>Prazo de produção: 3 a 5 dias úteis + frete</span></div>
                <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-[10px] dark:bg-green-950/50">♻️</span><span>Material PLA biodegradável de alta qualidade</span></div>
                <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] dark:bg-blue-950/50">🚚</span><span>Frete grátis acima de R$ 99</span></div>
              </div>
            </div>
          )}

          {feedback === 'added' ? (
            <p className="mt-3 rounded-lg bg-green-50 dark:bg-green-950/50 px-3 py-2 text-xs text-green-700 dark:text-green-400">
              Item adicionado ao carrinho.{' '}
              <Link href="/cart" className="font-semibold underline">
                Ver carrinho
              </Link>
            </p>
          ) : feedback === 'error' ? (
            <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-950/50 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              {feedbackMessage || 'Não foi possível adicionar. Tente novamente.'}{' '}
              {feedbackMessage.includes('já comprou') && (
                <Link href="/account/orders" className="font-bold underline">Abrir Meus pedidos</Link>
              )}
            </p>
          ) : null}
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
