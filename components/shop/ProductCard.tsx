'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Product, ProductCategory } from '@/types/database';

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
  const [zoomed, setZoomed] = useState(false);
  const currentPrice = product.sale_price ?? product.base_price;
  const hasAdditionalPriceOptions = product.product_options?.some(
    (option) => option.price_modifier > 0,
  ) ?? false;

  useEffect(() => {
    const timer = setInterval(() => setZoomed((z) => !z), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Link
      href={`${basePath}/${product.id}`}
      prefetch={false}
      className={`group block overflow-hidden bg-white transition dark:bg-gray-900 dark:hover:shadow-gray-900/50 ${showcase ? 'rounded-2xl border border-pink-100/80 shadow-[0_8px_26px_-20px_rgba(219,39,119,.45)] hover:-translate-y-1 hover:border-pink-200 hover:shadow-[0_22px_45px_-24px_rgba(219,39,119,.42)] dark:border-gray-800 dark:hover:border-pink-900' : 'rounded-2xl border border-gray-100 shadow-sm hover:shadow-md dark:border-gray-800'}`}
    >
      <div className={`relative aspect-square overflow-hidden bg-gradient-to-br from-pink-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 ${showcase ? 'm-1.5 mb-0 rounded-[13px]' : ''}`}>
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
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className={`h-full w-full object-cover transition-transform duration-[4000ms] ease-in-out ${zoomed ? 'scale-[1.08]' : 'scale-100'} group-hover:scale-[1.03]`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-pink-200 dark:text-gray-700">
            ◇
          </div>
        )}
      </div>
      <div className={showcase ? 'p-3 sm:p-3.5' : 'p-3 sm:p-4'}>
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-pink-600">
          {category?.name ?? CATEGORY_LABELS[product.category] ?? product.category}
        </p>
        <h3 className={`${showcase ? 'line-clamp-2 min-h-[2.4rem] font-bold leading-[1.2rem]' : 'line-clamp-1 font-semibold'} mt-1 text-xs text-gray-900 sm:text-sm dark:text-white`}>
          {product.name}
        </h3>
        <p className={`${showcase ? 'hidden sm:line-clamp-2' : 'line-clamp-2'} mt-1 min-h-8 text-[11px] leading-4 text-gray-400 dark:text-gray-400 sm:min-h-9 sm:text-xs sm:leading-[18px]`}>
          {product.description || '\u00A0'}
        </p>
        {showcase && (product.is_customizable || product.fulfillment_mode === 'ready_stock') && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.is_customizable && <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[8px] font-bold text-pink-700 dark:bg-pink-950/40 dark:text-pink-300">Personalizável</span>}
            {product.fulfillment_mode === 'ready_stock' && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[8px] font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">Pronta entrega</span>}
          </div>
        )}
        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-1.5">
            {hasAdditionalPriceOptions && <span className="w-full text-[8px] font-bold uppercase tracking-wide text-pink-500 dark:text-pink-400 sm:text-[9px]">A partir de</span>}
            <p className={`${showcase ? 'font-black tracking-tight' : 'font-semibold'} text-sm text-gray-900 sm:text-base dark:text-white`}>{formatPrice(currentPrice)}</p>
            {product.sale_price !== null && product.sale_price < product.base_price && <span className="text-[9px] text-gray-400 line-through sm:text-[10px]">{formatPrice(product.base_price)}</span>}
          </div>
          {showcase && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-pink-500 to-orange-500 text-white shadow-sm transition group-hover:scale-105 group-hover:shadow-md"><ArrowUpRight className="h-3.5 w-3.5" /></span>}
        </div>
      </div>
    </Link>
  );
}
