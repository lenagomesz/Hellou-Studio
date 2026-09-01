'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/shop/CartContext';
import { getShippingProgress } from '@/lib/product-kits';
import { DEFAULT_STORE_SETTINGS } from '@/lib/store-settings-schema';

interface RecommendedProduct {
  id: string;
  name: string;
  starting_price: number;
  image_url: string | null;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function ProductRecommendations({ excludeId, title, threshold = DEFAULT_STORE_SETTINGS.commerce.freeShippingThreshold }: { excludeId?: string; title?: string; threshold?: number }) {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const { items, total } = useCart();
  const excludedIds = [...new Set([...items.map(item => item.product_id), ...(excludeId ? [excludeId] : [])])].sort().join(',');
  const hasDigital = items.some(item => item.product.type === 'digital');
  const shipping = getShippingProgress(total, threshold);
  const remaining = shipping.remaining;

  useEffect(() => {
    if (hasDigital) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ exclude: excludedIds, remaining: String(remaining) });
    fetch(`/api/recommendations?${params}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Sugestões indisponíveis'); return response.json(); })
      .then((data: { products: RecommendedProduct[] }) => { if (!controller.signal.aborted) setProducts(data.products ?? []); })
      .catch(() => { if (!controller.signal.aborted) setProducts([]); });
    return () => controller.abort();
  }, [excludedIds, remaining, hasDigital]);

  const visibleProducts = products.filter(product => !excludedIds.split(',').includes(product.id));
  if (hasDigital || visibleProducts.length === 0) return null;

  return (
    <section className="mt-10 rounded-3xl border border-pink-100 bg-pink-50/40 p-4 sm:p-6 dark:border-pink-900/40 dark:bg-pink-950/10">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-pink-600 dark:text-pink-400">Um detalhe a mais</p>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{remaining > 0 ? 'Complete seu pedido com um favorito' : (title ?? 'Combina com o seu pedido')}</h2>
      <p className="mb-5 mt-2 text-sm text-gray-500 dark:text-gray-400">{remaining > 0 ? `Faltam ${formatPrice(remaining)} para frete grátis. Confira estas sugestões e escolha os detalhes de cada peça.` : 'Peças para complementar sua escolha, sem repetir os produtos do carrinho.'}</p>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {visibleProducts.map((p) => (
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
              <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{p.name}</p>
              <p className="mt-1 text-sm font-semibold text-pink-600 dark:text-pink-400">
                <span className="mr-1 text-[9px] font-semibold uppercase tracking-wide text-pink-500 dark:text-pink-400">A partir de</span>
                {formatPrice(p.starting_price)}
              </p>
              {remaining > 0 && Math.round(p.starting_price * 100) >= Math.round(remaining * 100) && <p className="mt-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Com esta peça, você atinge o frete grátis</p>}
              <p className="mt-3 text-xs font-bold text-pink-600 dark:text-pink-400">Escolher detalhes →</p>
            </div>
          </Link>
        ))}
      </div>
      <Link href="/kits" className="mt-5 inline-block text-sm font-bold text-pink-600 dark:text-pink-400">Prefere uma combinação pronta? Conheça os kits →</Link>
    </section>
  );
}
