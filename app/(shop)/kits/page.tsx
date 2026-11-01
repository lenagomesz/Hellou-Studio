import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/shop/ProductCard';
import { getKitCatalog } from '@/lib/kit-catalog';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Kits para presentear e decorar', description: 'Combine seus favoritos da Hellou Studio em kits para o setup, a penteadeira e a decoração. Personalize cada peça.', alternates: { canonical: '/kits' } };

export default async function KitsPage() {
  const products = await getKitCatalog();
  const customKits = products.filter(product => ['monte-seu-kit-natalino', 'monte-seu-kit-religioso'].includes(product.slug ?? ''));
  return <div className="min-h-screen bg-gradient-to-b from-pink-50/60 to-white dark:from-gray-950 dark:to-gray-950"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <nav aria-label="Caminho da página" className="text-xs text-gray-500 dark:text-gray-400"><Link href="/">Início</Link><span className="mx-2">/</span><span>Kits</span></nav>
    <h1 className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-gray-300">Kits Hellou Studio</h1>
    <p className="mt-3 max-w-2xl text-sm text-gray-600">Escolha entre o kit natalino com valores fixos ou o kit religioso calculado pelas peças selecionadas.</p>
    <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5">{customKits.map(product => <ProductCard key={product.id} product={product} />)}</div>
  </div></div>;
}
