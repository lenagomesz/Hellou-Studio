import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Boxes, ExternalLink, Package, Pencil, ShoppingCart, Tags } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase';
import { OptionsManager } from '@/components/admin/OptionsManager';
import { attachProductTags } from '@/lib/product-tags';
import type { Product, ProductCategory, ProductOption } from '@/types/database';

export const dynamic = 'force-dynamic';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

async function getProductDashboard(id: string) {
  const admin = getSupabaseAdmin();
  const [productRes, optionsRes, salesRes] = await Promise.all([
    admin.from('products').select('*').eq('id', id).maybeSingle(),
    admin.from('product_options').select('*').eq('product_id', id).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    admin.from('order_items').select('quantity, unit_price, order:orders(status)').eq('product_id', id),
  ]);
  if (!productRes.data) return null;

  const [product] = await attachProductTags([productRes.data as Product]);
  const { data: category } = await admin.from('product_categories').select('*').eq('slug', product.category).maybeSingle();
  const validSales = (salesRes.data ?? []).filter((item) => {
    const relation = Array.isArray(item.order) ? item.order[0] : item.order;
    return relation?.status !== 'canceled' && relation?.status !== 'refunded';
  });

  return {
    product,
    category: category as ProductCategory | null,
    options: (optionsRes.data ?? []) as ProductOption[],
    unitsSold: validSales.reduce((sum, item) => sum + Number(item.quantity), 0),
    revenue: validSales.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0),
  };
}

export default async function ProductDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const result = await getProductDashboard(id);
  if (!result) notFound();
  const { product, category, options, unitsSold, revenue } = result;
  const images = Array.from(new Set([product.image_url, ...(product.images ?? [])].filter((image): image is string => Boolean(image))));
  const totalStock = options.reduce((sum, option) => sum + option.stock, 0);
  const storefrontHref = product.type === 'digital' ? `/stl/${product.id}` : `/products/${product.id}`;

  return (
    <div className="w-full space-y-6">
      <header className="rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/70 to-orange-50 p-6 shadow-sm sm:p-8">
        <Link href="/dashboard/products" className="text-sm font-medium text-slate-500 hover:text-pink-600">← Voltar para produtos</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">{product.type === 'digital' ? 'Arquivo STL' : 'Produto físico'}</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{product.name}</h1><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-700">{category?.name ?? product.category}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${product.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{product.active ? 'Ativo na loja' : 'Inativo'}</span>{product.tags?.map((tag) => <span key={tag.id} className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>)}</div></div>
          <div className="flex flex-wrap gap-2"><Link href={storefrontHref} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><ExternalLink className="h-4 w-4" />Ver na loja</Link><Link href={`/dashboard/products/${product.id}/edit`} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-pink-600"><Pencil className="h-4 w-4" />Editar produto</Link></div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Preço atual</p><p className="mt-2 text-2xl font-black text-slate-950">{formatPrice(product.sale_price ?? product.base_price)}</p>{product.sale_price != null && <p className="text-xs text-slate-400 line-through">{formatPrice(product.base_price)}</p>}</article>
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><ShoppingCart className="h-5 w-5 text-pink-500" /><p className="mt-2 text-2xl font-black text-slate-950">{unitsSold}</p><p className="text-xs text-slate-500">unidades vendidas</p></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><Package className="h-5 w-5 text-orange-500" /><p className="mt-2 text-2xl font-black text-slate-950">{totalStock}</p><p className="text-xs text-slate-500">unidades em pronta-entrega</p></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><Boxes className="h-5 w-5 text-violet-500" /><p className="mt-2 text-2xl font-black text-slate-950">{formatPrice(revenue)}</p><p className="text-xs text-slate-500">faturamento registrado</p></article>
      </section>

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-orange-50">{images[0] ? <Image src={images[0]} alt={product.name} fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center text-6xl text-pink-200">◇</div>}</div>{images.length > 1 && <div className="mt-3 grid grid-cols-5 gap-2">{images.slice(1, 6).map((image) => <Image key={image} src={image} alt="" width={160} height={160} unoptimized className="aspect-square w-full rounded-xl object-cover" />)}</div>}</section>
        <section className="space-y-5 rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Informações comerciais</p><h2 className="mt-1 text-xl font-bold text-slate-950">Detalhes do cadastro</h2></div><dl className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Descrição</dt><dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{product.description || 'Sem descrição cadastrada.'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Atendimento</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{product.fulfillment_mode === 'ready_stock' ? 'Pronta-entrega' : product.fulfillment_mode === 'hybrid' ? 'Híbrido' : 'Sob demanda'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Personalização</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{product.is_customizable ? 'Cliente deve informar um texto' : 'Não personalizável'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Galeria</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{images.length} imagens</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Variações</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{options.length} cadastradas</dd></div></dl><div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5"><Link href={`/dashboard/products/${product.id}/price-history`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Histórico de preços</Link><Link href={`/dashboard/products/${product.id}/edit`} className="rounded-xl border border-pink-200 px-4 py-2.5 text-sm font-bold text-pink-600"><Tags className="mr-1 inline h-4 w-4" />Editar tags e cadastro</Link></div></section>
      </div>

      {product.type === 'physical' && <section className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8"><h2 className="text-xl font-bold text-slate-950">Tamanhos, cores e variações</h2><p className="mt-1 text-sm text-slate-500">Gerencie preço adicional e estoque sem sair do resumo do produto.</p><div className="mt-5"><OptionsManager productId={product.id} initialOptions={options} basePrice={product.sale_price ?? product.base_price} /></div></section>}
    </div>
  );
}
