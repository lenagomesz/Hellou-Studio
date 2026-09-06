import Link from 'next/link';
import { ArrowUpRight, Gift, Plus, Truck } from 'lucide-react';
import { getShippingProgress, type ProductKit } from '@/lib/product-kits';

const tones = {
  violet: 'from-violet-100 to-indigo-50 dark:from-violet-950/60 dark:to-gray-900',
  pink: 'from-pink-100 to-rose-50 dark:from-pink-950/60 dark:to-gray-900',
  orange: 'from-orange-100 to-amber-50 dark:from-orange-950/60 dark:to-gray-900',
};
const price = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function ProductKits({ kits, threshold, preview = false }: { kits: ProductKit[]; threshold: number; preview?: boolean }) {
  return (
    <section id="kits" aria-labelledby="kits-title" className="scroll-mt-24 py-12 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-xl">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-pink-600 dark:text-pink-400"><Gift className="h-4 w-4" aria-hidden="true" /> Feitos para combinar</p>
          <h2 id="kits-title" className="text-3xl font-black tracking-[-0.045em] text-gray-900 sm:text-4xl md:text-5xl dark:text-white">Pequenos favoritos.<br /><span className="text-pink-600 dark:text-pink-400">Um kit com a sua cara.</span></h2>
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">Combinações para presentear ou cuidar do seu cantinho. Escolha as cores e os detalhes de cada peça.</p>
        </div>
        {preview && <Link href="/kits" className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white px-5 py-3 text-sm font-bold text-pink-700 transition hover:bg-pink-50 dark:border-pink-900 dark:bg-gray-900 dark:text-pink-300">Explorar kits <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>}
      </div>
      {kits.length ? <div className="grid gap-5 md:grid-cols-3">
        {kits.map(kit => {
          const shipping = getShippingProgress(kit.startingPrice, threshold);
          return <article key={kit.slug} className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <Link href={`/kits/${kit.slug}`} aria-label={`Conhecer kit ${kit.title}`} className={`relative flex h-52 shrink-0 items-center justify-center gap-2 bg-gradient-to-br p-6 ${tones[kit.tone]}`}>
              <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-[10px] font-bold text-gray-700 dark:bg-gray-900/85 dark:text-gray-200">{kit.products.length} peças · você escolhe os detalhes</span>
              {kit.products.map((product, index) => <div key={product.id} className={`relative mt-8 min-w-0 max-w-28 flex-1 ${index === 1 ? '-rotate-3' : 'rotate-3'}`}>
                <div className="aspect-square overflow-hidden rounded-2xl bg-white p-1 shadow-sm dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full rounded-xl object-cover" /> : <Gift aria-hidden="true" className="h-full w-full p-5 text-pink-200" />}
                </div>
                {index < kit.products.length - 1 && <Plus aria-hidden="true" className="absolute -right-3 top-1/2 z-10 h-5 w-5 rounded-full bg-white p-1 text-pink-600 shadow-sm" />}
              </div>)}
            </Link>
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">{kit.eyebrow}</p>
              <h3 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{kit.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{kit.description}</p>
              <ul className="my-4 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">{kit.products.map(product => <li key={product.id}>1 × {product.name}</li>)}</ul>
              <div className="mt-auto border-t border-gray-100 pt-4 dark:border-gray-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Combinação a partir de</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-gray-900 dark:text-white">{price(kit.startingPrice)}</p>
                <p className={`mt-3 flex items-center gap-2 text-xs ${shipping.eligible ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}><Truck aria-hidden="true" className="h-4 w-4 shrink-0" />{shipping.eligible ? 'Atinge o valor para frete grátis' : `Faltam ${price(shipping.remaining)} para frete grátis`}</p>
                <Link href={`/kits/${kit.slug}`} className="mt-5 flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-500">Montar meu kit <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
              </div>
            </div>
          </article>;
        })}
      </div> : <div className="rounded-3xl border border-dashed border-pink-200 bg-pink-50/50 p-8 text-center dark:border-pink-900 dark:bg-pink-950/20"><p className="font-semibold text-gray-900 dark:text-white">Estamos preparando novas combinações.</p><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Enquanto isso, escolha seus favoritos no catálogo.</p><Link href="/products" className="mt-4 inline-block text-sm font-bold text-pink-600 dark:text-pink-400">Explorar produtos →</Link></div>}
      <p className="mt-5 text-xs leading-5 text-gray-500 dark:text-gray-400">O valor é a soma de uma unidade de cada produto, sem desconto adicional de kit. Cores, tamanhos e personalizações podem alterar o total. Frete grátis a partir de {price(threshold)}, conforme o subtotal do carrinho.</p>
    </section>
  );
}
