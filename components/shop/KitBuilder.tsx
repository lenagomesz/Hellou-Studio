'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, ShoppingBag, Truck } from 'lucide-react';
import { ProductDetail } from '@/components/shop/ProductDetail';
import { useCart } from '@/components/shop/CartContext';
import { getShippingProgress, type ProductKit } from '@/lib/product-kits';

const price = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function KitBuilder({ kit, threshold }: { kit: ProductKit; threshold: number }) {
  const { items, total } = useCart();
  const [step, setStep] = useState(0);
  const [added, setAdded] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const product = kit.products[step];
  const complete = step === kit.products.length;
  const shipping = getShippingProgress(total, threshold);
  const hasDigital = items.some(item => item.product.type === 'digital');

  function nextStep() {
    setStep(current => current + 1);
    setAdded(false);
    titleRef.current?.focus();
    titleRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  return <div>
    <header className="mb-8">
      <p className="text-xs font-bold uppercase tracking-widest text-pink-600 dark:text-pink-400">{kit.eyebrow}</p>
      <h1 ref={titleRef} tabIndex={-1} className="mt-3 scroll-mt-28 text-3xl font-black tracking-tight text-gray-900 outline-none sm:text-4xl dark:text-white">{kit.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">{kit.description} Configure e adicione cada peça ao carrinho, uma de cada vez.</p>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">A partir de {price(kit.startingPrice)} · soma dos produtos, sem desconto adicional de kit.</p>
    </header>
    <ol aria-label="Etapas do kit" className="mb-8 grid gap-2 sm:grid-cols-3">{kit.products.map((item, index) => <li key={item.id} aria-current={step === index ? 'step' : undefined} className={`flex items-center gap-3 rounded-xl border p-3 text-xs ${step === index ? 'border-pink-300 bg-pink-50 text-pink-800 dark:border-pink-700 dark:bg-pink-950/30 dark:text-pink-200' : 'border-gray-100 text-gray-500 dark:border-gray-800 dark:text-gray-400'}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white font-bold shadow-sm dark:bg-gray-800">{index < step ? <Check aria-label="Etapa concluída" className="h-4 w-4 text-emerald-600" /> : index + 1}</span><span>{item.name}</span></li>)}</ol>
    {hasDigital ? <div role="alert" className="rounded-2xl border border-orange-200 bg-orange-50 p-6 text-sm text-orange-900 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">Seu carrinho contém arquivos digitais. Finalize essa compra antes de montar um kit de produtos físicos.<Link href="/cart" className="mt-3 block font-bold underline">Ver carrinho</Link></div> : complete ?
      <div className="rounded-3xl border border-pink-100 bg-pink-50/60 p-8 text-center dark:border-pink-900 dark:bg-pink-950/20">
        <Check className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Seu kit está no carrinho!</h2>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Confira as cores, quantidades e o valor final antes de continuar.</p>
        <Link href="/cart" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-pink-600 px-6 py-3 font-bold text-white hover:bg-pink-700">Conferir meu carrinho <ShoppingBag className="h-4 w-4" aria-hidden="true" /></Link>
      </div> : added ? <div role="status" className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-900 dark:bg-emerald-950/20">
        <p className="font-bold text-emerald-800 dark:text-emerald-200">{product.name} adicionado!</p>
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">Suas escolhas foram salvas no carrinho.</p>
        <button type="button" onClick={nextStep} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-pink-600">{step < kit.products.length - 1 ? 'Escolher próxima peça' : 'Concluir kit'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
      </div> : <ProductDetail key={product.id} product={product} options={product.product_options} onAdded={() => setAdded(true)} freeShippingThreshold={threshold} />}
    {!hasDigital && <aside className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900" aria-label="Resumo do carrinho">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-600 dark:text-gray-300">Subtotal do seu carrinho <strong className="ml-2 text-gray-900 dark:text-white">{price(total)}</strong></p><Link href="/cart" className="text-xs font-bold text-pink-600 dark:text-pink-400">Ver carrinho →</Link></div>
      <p className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Truck className="h-4 w-4" aria-hidden="true" />{shipping.eligible ? 'Seu subtotal já atingiu o valor para frete grátis.' : `Faltam ${price(shipping.remaining)} para frete grátis.`}</p>
      <div role="progressbar" aria-label="Progresso para frete grátis" aria-valuenow={Math.round(shipping.percent)} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-1.5 overflow-hidden rounded-full bg-pink-100 dark:bg-gray-800"><div className="h-full rounded-full bg-pink-500" style={{ width: `${shipping.percent}%` }} /></div>
      <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">Inclui outros itens que já estavam no carrinho. Você pode interromper a montagem; as peças adicionadas continuam salvas.</p>
    </aside>}
  </div>;
}
