'use client';

import { useState } from 'react';
import { Gift, Sparkles, Star, TreePine } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import type { Product, ProductCategory } from '@/types/database';
import { selectCollectionBestSellers } from '@/lib/collection-best-sellers';

export function ChristmasCatalog({ products, categories }: { products: Product[]; categories: ProductCategory[] }) {
  const [treeClicks, setTreeClicks] = useState(0);
  const [treeShaking, setTreeShaking] = useState(false);
  const [couponRevealed, setCouponRevealed] = useState(false);
  if (products.length === 0) return null;
  const bestSellers = selectCollectionBestSellers(products);
  const bestSellerIds = new Set(bestSellers.map(product => product.id));
  const remainingProducts = products.filter(product => !bestSellerIds.has(product.id));

  function handleSecretTree() {
    if (couponRevealed) return;
    if (treeClicks === 0) {
      setTreeClicks(1);
      setTreeShaking(true);
      window.setTimeout(() => setTreeShaking(false), 600);
      return;
    }
    setTreeClicks(2);
    setCouponRevealed(true);
    void navigator.clipboard?.writeText('NATALHELLOU5').catch(() => undefined);
  }
  return (
    <section aria-labelledby="christmas-products-title" className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-red-50 p-4 sm:p-6 dark:border-emerald-900 dark:from-emerald-950 dark:via-gray-900 dark:to-red-950/40">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex justify-around border-t-2 border-emerald-800/30">
        {['bg-red-500', 'bg-amber-400', 'bg-emerald-600', 'bg-red-500', 'bg-amber-400', 'bg-emerald-600', 'bg-red-500'].map((color, index) => (
          <span key={index} className={`h-3 w-2 rounded-b-full ${color} shadow-sm`} />
        ))}
      </div>
      <div className="relative mb-6 flex items-center justify-between gap-3 border-b border-emerald-200/70 pb-5 pt-4 dark:border-emerald-800">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-red-700 dark:text-red-300"><Gift className="h-4 w-4" aria-hidden="true" />Presentes cheios de encanto</p>
          <h2 id="christmas-products-title" className="mt-2 text-2xl font-black text-emerald-950 sm:text-3xl dark:text-emerald-50">Catálogo de Natal 2026</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-800 dark:text-emerald-200">Peças especiais para presentear, decorar e espalhar a magia do Natal.</p>
        </div>
        <button type="button" onClick={handleSecretTree} aria-label="Árvore de Natal secreta" className={`relative shrink-0 rounded-2xl px-3 py-1 transition hover:bg-emerald-100/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:hover:bg-emerald-900/40 ${treeShaking ? 'animate-[christmas-shake_0.55s_ease-in-out]' : ''}`}>
          <Star className="absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 fill-amber-400 text-amber-500" />
          <TreePine className="h-14 w-14 text-emerald-700 sm:h-20 sm:w-20 dark:text-emerald-400" strokeWidth={1.5} />
          <Sparkles className="absolute -right-1 top-2 h-5 w-5 text-amber-500" />
          <Gift className="absolute -bottom-1 right-0 h-7 w-7 text-red-600 dark:text-red-400" />
        </button>
      </div>
      {couponRevealed && <div className="relative mb-5 flex flex-col items-center justify-between gap-3 rounded-2xl border border-red-200 bg-white p-4 text-center shadow-sm sm:flex-row sm:text-left dark:border-red-900 dark:bg-gray-900"><div><p className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">Você encontrou um presente secreto!</p><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Use na primeira compra e ganhe R$ 5 de desconto.</p></div><button type="button" onClick={() => void navigator.clipboard?.writeText('NATALHELLOU5')} className="rounded-xl bg-gradient-to-r from-red-600 to-pink-500 px-5 py-3 font-black tracking-wider text-white shadow-md">NATALHELLOU5</button></div>}
      {bestSellers.length > 0 && <div className="relative mb-7 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 sm:p-4 dark:border-amber-800 dark:bg-amber-950/20">
        <h3 className="mb-1 flex items-center gap-2 text-lg font-black text-emerald-950 dark:text-emerald-50"><Star className="h-5 w-5 fill-amber-400 text-amber-500" aria-hidden="true" />Mais vendidos do Natal</h3>
        <p className="mb-4 text-xs text-emerald-800 dark:text-emerald-200">Os favoritos em pedidos confirmados.</p>
        <div className="grid grid-cols-2 gap-2.5 min-[520px]:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
          {bestSellers.map(product => <ProductCard key={product.id} product={{ ...product, is_best_seller: true }} category={categories.find(item => item.slug === product.category)} />)}
        </div>
      </div>}
      {bestSellers.length > 0 && remainingProducts.length > 0 && <h3 className="relative mb-4 text-lg font-bold text-emerald-950 dark:text-emerald-50">Mais peças para o seu Natal</h3>}
      <div className="relative grid grid-cols-2 gap-2.5 min-[520px]:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
        {remainingProducts.map((product) => <ProductCard key={product.id} product={product} category={categories.find((item) => item.slug === product.category)} />)}
      </div>
    </section>
  );
}
