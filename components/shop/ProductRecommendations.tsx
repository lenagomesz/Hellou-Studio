'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RecommendedProduct {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
  category: string;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function ProductRecommendations({ excludeId, title }: { excludeId?: string; title?: string }) {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);

  useEffect(() => {
    const params = excludeId ? `?exclude=${excludeId}` : '';
    fetch(`/api/recommendations${params}`)
      .then((r) => r.json())
      .then((data: { products: RecommendedProduct[] }) => setProducts(data.products ?? []))
      .catch(() => {});
  }, [excludeId]);

  if (products.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        {title ?? 'Você também pode gostar'}
      </h2>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm transition hover:shadow-md"
          >
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-50 to-orange-50 text-4xl text-pink-200">
                  ◇
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
              <p className="mt-1 text-sm font-semibold text-pink-600 dark:text-pink-400">{formatPrice(p.base_price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
