'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Product, ProductCategory } from '@/types/database';
import { productIdentifier } from '@/lib/seo';
import { FavoriteButton } from '@/components/shop/FavoriteButton';

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

export function ProductCard({ product, basePath = "/products", category, showcase = false }: { product: Product; basePath?: string; category?: Pick<ProductCategory, 'name' | 'color'>; showcase?: boolean }) {
  const isReligiousKit = product.slug === 'monte-seu-kit-religioso';
  const currentPrice = isReligiousKit ? 45.9 : product.sale_price ?? product.base_price;
  const images = useMemo(
    () => Array.from(new Set([product.image_url, product.image_url_2, ...(product.images ?? [])].filter((image): image is string => Boolean(image?.trim())))),
    [product.image_url, product.image_url_2, product.images],
  );
  const [activeImage, setActiveImage] = useState(0);
  const hasImageGallery = images.length > 1;
  const hasAdditionalPriceOptions = isReligiousKit || (product.product_options?.some(
    (option) => option.price_modifier > 0,
  ) ?? false);

  useEffect(() => {
    if (!hasImageGallery) return;
    const interval = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % images.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [hasImageGallery, images.length]);

  return (
    <article className={`group relative flex h-full flex-col overflow-hidden bg-white transition dark:bg-gray-900 dark:hover:shadow-gray-900/50 ${showcase ? 'rounded-2xl border border-pink-100/80 shadow-[0_8px_26px_-20px_rgba(219,39,119,.45)] hover:-translate-y-1 hover:border-pink-200 hover:shadow-[0_22px_45px_-24px_rgba(219,39,119,.42)] dark:border-gray-800 dark:hover:border-pink-900' : 'rounded-2xl border border-gray-100 shadow-sm hover:shadow-md dark:border-gray-800'}`}>
      <Link href={`${basePath}/${productIdentifier(product)}`} prefetch={false} className="flex flex-1 flex-col">
      <div className={`relative aspect-square shrink-0 overflow-hidden bg-gradient-to-br from-pink-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 ${showcase ? 'm-1.5 mb-0 rounded-[13px]' : ''}`}>
        {(product.is_wholesale || product.is_best_seller) && (
          <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1 sm:left-3 sm:top-3">
            {product.is_wholesale && (
              <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm sm:text-[10px]">
                Lojistas · mín. {Math.max(2, product.minimum_order_quantity ?? 2)} un.
              </span>
            )}
            {product.is_best_seller && (
              <span className="rounded-full bg-pink-600 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm sm:text-[10px]">
                Mais vendido
              </span>
            )}
          </div>
        )}
        {images.length > 0 ? (
          <>
            {images.map((image, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image}
                src={image}
                alt={product.image_alt_texts?.[image] || product.name}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out motion-safe:group-hover:scale-[1.03] ${index === activeImage ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
              />
            ))}
            {hasImageGallery && <span className="absolute bottom-2 right-2 rounded-full bg-black/45 px-2 py-1 text-[9px] font-bold text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">{activeImage + 1}/{images.length}</span>}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-pink-200 dark:text-gray-700">
            ◇
          </div>
        )}
      </div>
      <div className={`flex min-w-0 flex-1 flex-col p-3 ${showcase ? 'sm:p-3.5' : 'sm:p-4'}`}>
        <p className="truncate text-[10px] sm:text-xs font-bold uppercase tracking-wider text-pink-600">
          {category?.name ?? CATEGORY_LABELS[product.category] ?? product.category}
        </p>
        <h3 title={product.name} className={`${showcase ? 'font-bold' : 'font-semibold'} mt-1 h-4 shrink-0 line-clamp-1 text-xs leading-4 text-gray-900 sm:h-5 sm:text-sm sm:leading-5 dark:text-white`}>
          {product.name}
        </h3>
        <p className="mt-1 h-8 shrink-0 line-clamp-2 text-[11px] leading-4 text-gray-500 dark:text-gray-400 sm:h-9 sm:text-xs sm:leading-[18px]">
          {product.description || '\u00A0'}
        </p>
        {showcase && (
          <div aria-label="Características do produto" tabIndex={0} className="mt-2 flex h-5 min-w-0 shrink-0 items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&>span]:shrink-0 [&::-webkit-scrollbar]:hidden">
            {product.is_customizable && <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[8px] font-bold text-pink-700 dark:bg-pink-950/40 dark:text-pink-300">Personalizável</span>}
            {product.fulfillment_mode === 'ready_stock' && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[8px] font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">Pronta entrega</span>}
            {product.type !== 'digital' && product.fulfillment_mode !== 'ready_stock' && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[8px] font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">Feito sob demanda</span>}
            {product.tags?.map((tag) => <span key={tag.id} className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>)}
          </div>
        )}
        {!showcase && product.type !== 'digital' && (
          <div aria-label="Características do produto" tabIndex={0} className="mt-1 flex h-4 min-w-0 shrink-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[10px] font-semibold [scrollbar-width:none] [&>span]:shrink-0 [&::-webkit-scrollbar]:hidden">
            <span className="text-orange-700 dark:text-orange-300">{product.fulfillment_mode === 'ready_stock' ? 'Pronta entrega' : 'Feito sob demanda'}</span>
            {product.tags?.map((tag) => <span key={tag.id} className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>)}
          </div>
        )}
        <div className="mt-auto flex shrink-0 flex-col items-stretch gap-2 pt-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
            {hasAdditionalPriceOptions && <span title="A partir de" className="min-w-0 truncate text-[8px] font-bold uppercase tracking-wide text-pink-500 dark:text-pink-400 sm:text-[9px]">A partir de</span>}
            <p className={`${showcase ? 'font-black tracking-tight' : 'font-semibold'} shrink-0 text-sm text-gray-900 sm:text-base dark:text-white`}>{formatPrice(currentPrice)}</p>
            {product.sale_price !== null && product.sale_price < product.base_price && <span title={formatPrice(product.base_price)} className="min-w-0 truncate text-[9px] text-gray-400 line-through sm:text-[10px]">{formatPrice(product.base_price)}</span>}
          </div>
          {product.type !== 'digital' && <span className="w-full shrink-0 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-3.5 py-2 text-center text-[11px] font-black text-white shadow-sm shadow-pink-500/25 transition group-hover:scale-[1.03] group-hover:shadow-md group-hover:shadow-orange-400/30 lg:w-auto">Comprar</span>}
        </div>
      </div>
      </Link>
      <FavoriteButton productId={product.id} productName={product.name} className="absolute right-2 top-2 z-20 sm:right-3 sm:top-3" />
    </article>
  );
}
