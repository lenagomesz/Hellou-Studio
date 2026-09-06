import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KitBuilder } from '@/components/shop/KitBuilder';
import { getKitCatalog } from '@/lib/kit-catalog';
import { buildProductKits } from '@/lib/product-kits';
import { getStoreSettings } from '@/lib/store-settings';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const kit = (await getStoreSettings()).kits.find(item => item.active && item.slug === slug);
  return { title: kit ? `Kit ${kit.title}` : 'Kit indisponível', description: kit?.description };
}

export default async function KitPage({ params }: Props) {
  const { slug } = await params;
  const [products, settings] = await Promise.all([getKitCatalog(), getStoreSettings()]);
  if (!settings.kits.some(item => item.active && item.slug === slug)) notFound();
  const kit = buildProductKits(products, settings.kits).find(item => item.slug === slug);
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <Link href="/kits" className="mb-6 inline-block text-sm font-semibold text-pink-600 dark:text-pink-400">← Todos os kits</Link>
    {kit ? <KitBuilder kit={kit} threshold={settings.commerce.freeShippingThreshold} /> : <div className="rounded-3xl bg-pink-50 p-8 dark:bg-pink-950/20"><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Este kit está indisponível no momento</h1><p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Uma das peças não está disponível. Explore os outros kits ou escolha seus favoritos no catálogo.</p><Link href="/products" className="mt-5 inline-block font-bold text-pink-600">Ver catálogo →</Link></div>}
  </div>;
}
