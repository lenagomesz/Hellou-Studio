'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

export function ProductCard({ product, basePath = "/products", category }: { product: Product; basePath?: string; category?: Pick<ProductCategory, 'name' | 'color'> }) {
  const [zoomed, setZoomed] = useState(false);
  const currentPrice = product.sale_price ?? product.base_price;

  useEffect(() => {
    const timer = setInterval(() => setZoomed((z) => !z), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Link
      href={`${basePath}/${product.id}`}
      prefetch={false}
      className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:shadow-gray-900/50"
    >
      <div className="aspect-square overflow-hidden bg-gradient-to-br from-pink-50 to-orange-50 dark:from-gray-800 dark:to-gray-700">
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
      <div className="p-3 sm:p-4">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-pink-600">
          {category?.name ?? CATEGORY_LABELS[product.category] ?? product.category}
        </p>
        {product.tags && product.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>
            ))}
          </div>
        )}
        <h3 className="mt-1 line-clamp-1 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
          {product.name}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
          <p className="text-sm font-semibold text-gray-900 sm:text-base dark:text-white">{formatPrice(currentPrice)}</p>
          {product.sale_price !== null && product.sale_price < product.base_price && (
            <span className="text-[10px] text-gray-400 line-through sm:text-xs">{formatPrice(product.base_price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
