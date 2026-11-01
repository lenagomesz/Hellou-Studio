'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { useCart } from '@/components/shop/CartContext';
import type { Product, ProductOption } from '@/types/database';
export type KitSelectableProduct = Omit<Product, 'product_options'> & { product_options?: ProductOption[] };

const COLORS = [
  ['Creme', '#F2D0AB'], ['Vermelho', '#E02424'], ['Verde', '#577543'], ['Marrom', '#611800'], ['Caramelo', '#C98245'],
] as const;
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function CustomKitConfigurator({ mode, kitProduct, kitOptions, products }: { mode: 'natal' | 'religioso'; kitProduct: Product; kitOptions: ProductOption[]; products: KitSelectableProduct[] }) {
  const { addItem } = useCart();
  const [step, setStep] = useState(1);
  const [color, setColor] = useState('');
  const [count, setCount] = useState(2);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [optionIds, setOptionIds] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const selectedCount = Object.values(quantities).reduce((sum, value) => sum + value, 0);
  const selectedProducts = products.filter(product => (quantities[product.id] ?? 0) > 0);
  const total = useMemo(() => mode === 'natal' ? ({ 2: 69.9, 3: 89.9, 4: 109.9, 5: 119.9 }[count] ?? 69.9) : 24.9 + selectedProducts.reduce((sum, product) => { const chosen = product.product_options?.find(option => option.id === optionIds[product.id]) ?? product.product_options?.[0]; return sum + ((product.sale_price ?? product.base_price) + (chosen?.price_modifier ?? 0)) * (quantities[product.id] ?? 0); }, 0), [count, mode, optionIds, quantities, selectedProducts]);
  const canContinue = step === 1 ? Boolean(color) : mode === 'natal' ? selectedCount === count : selectedCount > 0;

  function change(productId: string, delta: number) {
    setQuantities(current => {
      const next = Math.max(0, (current[productId] ?? 0) + delta);
      if (mode === 'natal' && delta > 0 && selectedCount >= count) return current;
      return { ...current, [productId]: next };
    });
  }

  async function addKit() {
    setSaving(true);
    try {
      const summary = `Cor da bandeja: ${color}. Itens: ${selectedProducts.map(product => `${quantities[product.id]}x ${product.name}`).join(', ')}.`;
      if (mode === 'natal') {
        const option = kitOptions.find(item => item.name.includes(`${count} itens`));
        await addItem({ product: kitProduct, option: option ?? null, quantity: 1, customization_text: summary });
      } else {
        await addItem({ product: kitProduct, option: null, quantity: 1, customization_text: `Bandeja média do kit · cor ${color}` });
        for (const product of selectedProducts) { const option = product.product_options?.find(item => item.id === optionIds[product.id]) ?? product.product_options?.[0] ?? null; await addItem({ product, option, quantity: quantities[product.id], customization_text: 'Componente do Monte seu Kit Religioso' }); }
      }
      setStep(4);
    } finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-5xl">
    <div className="mb-7 grid grid-cols-4 gap-2">{['Bandeja', 'Itens', 'Resumo', 'Pronto'].map((label, index) => <div key={label} className={`rounded-xl px-2 py-3 text-center text-xs font-bold ${step === index + 1 ? 'bg-pink-600 text-white' : step > index + 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{step > index + 1 ? <Check className="mx-auto h-4 w-4" /> : `${index + 1}. ${label}`}</div>)}</div>
    {step === 1 && <section><h2 className="text-2xl font-black">Escolha a cor da bandeja média</h2><p className="mt-2 text-sm text-gray-500">A bandeja média é obrigatória e já faz parte do kit.</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{COLORS.map(([name, hex]) => <button key={name} type="button" onClick={() => setColor(name)} className={`rounded-2xl border-2 p-4 text-sm font-bold ${color === name ? 'border-pink-500 bg-pink-50' : 'border-gray-100'}`}><span className="mx-auto mb-3 block h-14 w-full rounded-xl shadow-inner" style={{ backgroundColor: hex }} />{name}</button>)}</div></section>}
    {step === 2 && <section><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-black">Escolha as peças</h2><p className="mt-2 text-sm text-gray-500">{mode === 'natal' ? `Selecione exatamente ${count} itens.` : 'Adicione as peças religiosas que desejar.'}</p></div>{mode === 'natal' && <select value={count} onChange={event => { setCount(Number(event.target.value)); setQuantities({}); }} className="rounded-xl border p-3 font-bold">{[2,3,4,5].map(value => <option key={value} value={value}>{value} itens</option>)}</select>}</div><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">{products.map(product => <article key={product.id} className="overflow-hidden rounded-2xl border bg-white p-3"><div className="aspect-square overflow-hidden rounded-xl bg-pink-50">{product.image_url && <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />}</div><h3 className="mt-3 text-sm font-bold">{product.name}</h3>{mode === 'religioso' && <p className="text-xs text-pink-600">{money(product.sale_price ?? product.base_price)}</p>}{mode === 'religioso' && product.product_options && product.product_options.length > 0 && <select value={optionIds[product.id] ?? product.product_options[0].id} onChange={event => setOptionIds(current => ({ ...current, [product.id]: event.target.value }))} className="mt-2 w-full rounded-lg border p-2 text-xs">{product.product_options.map(option => <option key={option.id} value={option.id}>{option.name}{option.price_modifier ? ` (+${money(option.price_modifier)})` : ''}</option>)}</select>}<div className="mt-3 flex items-center justify-between"><button type="button" onClick={() => change(product.id,-1)} className="h-9 w-9 rounded-lg bg-gray-100">−</button><strong>{quantities[product.id] ?? 0}</strong><button type="button" onClick={() => change(product.id,1)} className="h-9 w-9 rounded-lg bg-pink-600 text-white">+</button></div></article>)}</div></section>}
    {step === 3 && <section className="rounded-3xl border bg-white p-6"><h2 className="text-2xl font-black">Resumo do seu kit</h2><p className="mt-4"><strong>Bandeja média:</strong> {color}</p><ul className="mt-4 space-y-2">{selectedProducts.map(product => <li key={product.id} className="flex justify-between"><span>{quantities[product.id]}x {product.name}</span>{mode === 'religioso' && <span>{money((product.sale_price ?? product.base_price) * quantities[product.id])}</span>}</li>)}</ul><p className="mt-6 border-t pt-4 text-2xl font-black">Total: {money(total)}</p></section>}
    {step === 4 && <section className="rounded-3xl bg-emerald-50 p-8 text-center"><Check className="mx-auto h-10 w-10 text-emerald-600" /><h2 className="mt-3 text-2xl font-black">Kit adicionado ao carrinho</h2><a href="/cart" className="mt-5 inline-flex rounded-xl bg-gray-900 px-6 py-3 font-bold text-white">Ver carrinho</a></section>}
    {step < 4 && <div className="mt-8 flex justify-between"><button type="button" disabled={step === 1} onClick={() => setStep(step - 1)} className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 font-bold disabled:opacity-30"><ChevronLeft className="h-4 w-4" />Voltar</button>{step === 3 ? <button type="button" disabled={saving} onClick={addKit} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 font-bold text-white"><ShoppingBag className="h-4 w-4" />{saving ? 'Adicionando...' : 'Adicionar kit'}</button> : <button type="button" disabled={!canContinue} onClick={() => setStep(step + 1)} className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-6 py-3 font-bold text-white disabled:opacity-40">Continuar<ChevronRight className="h-4 w-4" /></button>}</div>}
  </div>;
}
