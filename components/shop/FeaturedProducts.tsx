'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product, ProductCategory } from '@/types/database';
import { ProductCard } from '@/components/shop/ProductCard';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function FeaturedProductsClient({
  physicalProducts,
  digitalProducts,
  categories,
}: {
  physicalProducts: Product[];
  digitalProducts: Product[];
  categories: ProductCategory[];
}) {
  const [selectedTab, setSelectedTab] = useState<'physical' | 'digital'>('physical');

  const featured = selectedTab === 'physical' ? physicalProducts : digitalProducts;

  if (featured.length === 0) return null;

  return (
    <section className="bg-gradient-to-b from-white via-pink-50/25 to-orange-50/30 py-12 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 sm:py-20">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-5">
        <ScrollReveal direction="left">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-600 dark:text-pink-400">Escolhas da Hellou</span>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-gray-950 dark:text-white sm:text-4xl md:text-5xl">
                Lançamentos{' '}
                <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 bg-clip-text text-transparent">Recentes</span>
              </h2>
              <p className="mt-2 max-w-lg text-xs leading-5 text-gray-500 dark:text-gray-400 sm:text-sm">Novas peças e arquivos para escolher, personalizar e criar do seu jeito.</p>
            </div>
            <Link
              href={selectedTab === 'physical' ? '/products' : '/stl'}
              className="group flex items-center gap-1.5 rounded-full border border-pink-200 bg-white px-5 py-2.5 text-xs font-bold text-pink-600 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:text-orange-600 hover:shadow-md dark:border-pink-900 dark:bg-gray-900 dark:text-pink-400"
            >
              Ver tudo
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* Abas de filtro */}
          <div className="mb-7 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'physical', label: 'Produtos físicos' },
              { id: 'digital', label: 'Arquivos STL' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as 'physical' | 'digital')}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                  selectedTab === tab.id
                    ? 'border-transparent bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg shadow-pink-500/20'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-pink-300 hover:bg-pink-50 hover:text-pink-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-pink-800 dark:hover:bg-pink-950/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 gap-2.5 min-[520px]:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
          {featured.map((product, i) => (
            <ScrollReveal key={product.id} delay={i * 100} direction={i % 2 === 0 ? 'up' : 'scale'}>
              <ProductCard product={product} category={categories.find((category) => category.slug === product.category)} showcase />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
