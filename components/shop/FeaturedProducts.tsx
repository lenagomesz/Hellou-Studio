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
    <section className="bg-white/80 dark:bg-gray-950/80 py-12 sm:py-20 backdrop-blur-sm shadow-[0_-1px_0_0_rgba(251,191,36,0.1),0_1px_0_0_rgba(251,191,36,0.1)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal direction="left">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-950/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-400 ring-1 ring-orange-100 dark:ring-orange-800">
                Destaques
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl md:text-4xl">
                Lançamentos{' '}
                <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent animate-gradient-x">
                  Recentes
                </span>
              </h2>
            </div>
            <Link
              href={selectedTab === 'physical' ? '/products' : '/stl'}
              className="group flex items-center gap-1.5 rounded-full border border-orange-200/60 dark:border-orange-800/40 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-semibold text-orange-600 dark:text-orange-400 shadow-sm transition-all duration-300 hover:border-pink-300 hover:text-pink-600 dark:hover:text-pink-400 hover:shadow-md hover:scale-[1.03] active:scale-[0.98]"
            >
              Ver tudo
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* Abas de filtro */}
          <div className="flex gap-3 mb-8">
            {[
              { id: 'physical', label: '🖨️ Produtos Novos' },
              { id: 'digital', label: '📥 Arquivos STL' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as 'physical' | 'digital')}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  selectedTab === tab.id
                    ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg'
                    : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-pink-300 hover:text-pink-600 dark:hover:text-pink-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {featured.map((product, i) => (
            <ScrollReveal key={product.id} delay={i * 100} direction={i % 2 === 0 ? 'up' : 'scale'}>
              <div className="hover-lift transition-all duration-500">
                <ProductCard product={product} category={categories.find((category) => category.slug === product.category)} />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
