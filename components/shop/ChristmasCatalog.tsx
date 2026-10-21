import { Gift, Sparkles, Star, TreePine } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import type { Product, ProductCategory } from '@/types/database';

export function ChristmasCatalog({ products, categories }: { products: Product[]; categories: ProductCategory[] }) {
  if (products.length === 0) return null;
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
        <div aria-hidden="true" className="relative hidden shrink-0 px-3 sm:block">
          <Star className="absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 fill-amber-400 text-amber-500" />
          <TreePine className="h-20 w-20 text-emerald-700 dark:text-emerald-400" strokeWidth={1.5} />
          <Sparkles className="absolute -right-1 top-2 h-5 w-5 text-amber-500" />
          <Gift className="absolute -bottom-1 right-0 h-7 w-7 text-red-600 dark:text-red-400" />
        </div>
      </div>
      <div className="relative grid grid-cols-2 gap-2.5 min-[520px]:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
        {products.map((product) => <ProductCard key={product.id} product={product} category={categories.find((item) => item.slug === product.category)} />)}
      </div>
    </section>
  );
}
