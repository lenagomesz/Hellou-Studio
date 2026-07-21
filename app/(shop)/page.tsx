import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { ArrowRight, Check, Heart, Package, Palette, Sparkles, Truck } from 'lucide-react';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import { getCatalogCategories } from '@/lib/catalog-categories';
import { attachProductTags } from '@/lib/product-tags';
import { FeaturedProductsClient } from '@/components/shop/FeaturedProducts';
import { ButtonLink, SectionHeading, Surface } from '@/components/ui/DesignSystem';
import type { Product } from '@/types/database';

export const metadata: Metadata = {
  title: { absolute: 'Hellou Studio' },
  description: 'Produtos impressos em 3D, peças personalizadas e arquivos STL para projetos criativos.',
  alternates: { canonical: '/' },
};

const PRESENTATION: Record<string, { emoji: string; description: string; color: string }> = {
  chaveiros: { emoji: '🔑', description: 'Pequenos presentes com a sua personalidade.', color: 'from-pink-500 to-rose-400' },
  escritorio: { emoji: '🖊️', description: 'Organização e estilo para sua rotina.', color: 'from-orange-400 to-amber-300' },
  criaturas: { emoji: '🦊', description: 'Criaturas fofas para colecionar e presentear.', color: 'from-violet-500 to-pink-400' },
};

const BENEFITS = [
  { icon: Palette, title: 'Feito para você', description: 'Cores e detalhes escolhidos no seu pedido.' },
  { icon: Package, title: 'Produção cuidadosa', description: 'Cada peça é impressa sob demanda.' },
  { icon: Truck, title: 'Enviamos para o Brasil', description: 'Acompanhamento até a sua porta.' },
  { icon: Heart, title: 'Atendimento próximo', description: 'Ajuda humana quando você precisar.' },
];

const getFeaturedProducts = unstable_cache(async (type: 'physical' | 'digital'): Promise<Product[]> => {
  try {
    const query = getSupabaseAdmin().from('products').select('*').eq('active', true);
    const filtered = type === 'physical'
      ? query.or('type.eq.physical,type.is.null').neq('category', 'encomenda').not('name', 'ilike', 'Encomenda%')
      : query.eq('type', 'digital');
    const { data } = await withTimeout(filtered.order('created_at', { ascending: false }).limit(6));
    return attachProductTags((data ?? []) as Product[]);
  } catch (error) {
    console.error('[home] produtos em destaque indisponíveis', error);
    return [];
  }
}, ['featured-products-limit-6'], { revalidate: 60 });

async function FeaturedProducts() {
  const [physical, digital, physicalCategories, digitalCategories] = await Promise.all([
    getFeaturedProducts('physical'), getFeaturedProducts('digital'), getCatalogCategories('physical'), getCatalogCategories('digital'),
  ]);
  if (!physical.length && !digital.length) return null;
  return <FeaturedProductsClient physicalProducts={physical} digitalProducts={digital} categories={[...physicalCategories, ...digitalCategories].filter((item, index, all) => all.findIndex((entry) => entry.slug === item.slug) === index)} />;
}

export default async function HomePage() {
  const categories = await getCatalogCategories('physical');
  return <div className="overflow-x-hidden bg-gray-50 dark:bg-gray-950">
    <div className="bg-gray-950 px-4 py-2 text-center text-xs font-semibold text-white">Frete grátis acima de R$ 99 · 10% OFF na primeira compra</div>

    <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-950 dark:to-pink-950/20">
      <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-pink-200/40 blur-3xl dark:bg-pink-900/20" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
        <div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-pink-700 shadow-sm dark:border-pink-900 dark:bg-gray-900 dark:text-pink-300"><Sparkles className="h-3.5 w-3.5" />Design que ganha forma</span><h1 className="mt-6 max-w-2xl text-4xl font-black tracking-tight text-gray-950 dark:text-white sm:text-6xl">Peças únicas, <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">feitas em 3D</span>.</h1><p className="mt-5 max-w-xl text-base leading-7 text-gray-600 dark:text-gray-300 sm:text-lg">Escolha um produto, personalize do seu jeito e receba uma peça criada especialmente para você.</p><div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/products">Explorar produtos <ArrowRight className="h-4 w-4" /></ButtonLink><ButtonLink href="/request-print" variant="secondary">Quero uma encomenda</ButtonLink></div><div className="mt-8 flex flex-wrap gap-4 text-xs font-semibold text-gray-500 dark:text-gray-400">{['Pagamento seguro', 'Atendimento humano', 'Feito sob demanda'].map((item) => <span key={item} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" />{item}</span>)}</div></div>
        <Surface className="relative overflow-hidden bg-white/80 p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Comece por aqui</p><h2 className="mt-3 text-2xl font-black text-gray-950 dark:text-white">O que você quer criar hoje?</h2><div className="mt-6 space-y-3"><Link href="/products" className="group flex items-center justify-between rounded-2xl bg-pink-50 p-4 transition hover:bg-pink-100 dark:bg-pink-950/30 dark:hover:bg-pink-950/50"><span><span className="block font-bold text-gray-900 dark:text-white">Produtos físicos</span><span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">Peças prontas ou personalizáveis</span></span><ArrowRight className="h-5 w-5 text-pink-500 transition group-hover:translate-x-1" /></Link><Link href="/stl" className="group flex items-center justify-between rounded-2xl bg-orange-50 p-4 transition hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"><span><span className="block font-bold text-gray-900 dark:text-white">Arquivos STL</span><span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">Modelos digitais para imprimir</span></span><ArrowRight className="h-5 w-5 text-orange-500 transition group-hover:translate-x-1" /></Link></div></Surface>
      </div>
    </section>

    <section className="bg-white py-14 dark:bg-gray-950"><div className="mx-auto max-w-6xl px-4 sm:px-6"><SectionHeading eyebrow="Escolha seu estilo" title="Categorias para começar" description="Uma seleção simples para você encontrar o que combina com seu momento." action={<ButtonLink href="/products" variant="ghost">Ver tudo <ArrowRight className="h-4 w-4" /></ButtonLink>} /><div className="mt-8 grid gap-3 sm:grid-cols-3">{categories.slice(0, 6).map((category) => { const item = PRESENTATION[category.slug] ?? { emoji: '✨', description: 'Ideias criativas impressas em 3D.', color: 'from-blue-500 to-violet-500' }; return <Link key={category.slug} href={`/products?category=${category.slug}`} className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${item.color} p-5 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl`}><span className="text-4xl" aria-hidden="true">{item.emoji}</span><h3 className="mt-8 text-lg font-black">{category.name}</h3><p className="mt-1 max-w-[18rem] text-sm text-white/85">{item.description}</p><ArrowRight className="absolute bottom-5 right-5 h-5 w-5 transition group-hover:translate-x-1" /></Link>; })}</div></div></section>

    <section className="bg-gray-50 py-14 dark:bg-gray-900/40"><div className="mx-auto max-w-6xl px-4 sm:px-6"><SectionHeading eyebrow="Novidades" title="Feitos para inspirar" description="Produtos selecionados para você descobrir o universo Hellou Studio." action={<ButtonLink href="/products" variant="secondary">Ver catálogo</ButtonLink>} /><div className="mt-8"><FeaturedProducts /></div></div></section>

    <section className="bg-white py-14 dark:bg-gray-950"><div className="mx-auto max-w-6xl px-4 sm:px-6"><SectionHeading eyebrow="Do pedido à entrega" title="Uma experiência leve do começo ao fim" /><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{BENEFITS.map(({ icon: Icon, title, description }) => <Surface key={title} className="p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300"><Icon className="h-5 w-5" /></span><h3 className="mt-4 font-bold text-gray-900 dark:text-white">{title}</h3><p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">{description}</p></Surface>)}</div></div></section>

    <section className="bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-14 text-center text-white sm:py-18"><h2 className="text-3xl font-black">Tem uma ideia diferente?</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/85">Conte o que você imaginou e nós ajudamos a transformar em uma peça real.</p><Link href="/request-print" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-pink-600 shadow-lg transition hover:-translate-y-0.5">Solicitar orçamento <ArrowRight className="h-4 w-4" /></Link></section>
  </div>;
}
