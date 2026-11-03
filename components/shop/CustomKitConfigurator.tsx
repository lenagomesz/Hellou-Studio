'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { useCart } from '@/components/shop/CartContext';
import type { Product, ProductOption } from '@/types/database';
export type KitSelectableProduct = Omit<Product, 'product_options'> & { product_options?: ProductOption[] };

const TRAY_COLOR_LABELS = new Set(['Branco', 'Vermelho', 'Verde Musgo', 'Verde musgo', 'Marrom', 'Caramelo']);
const displayTrayColor = (label: string) => label.toLocaleLowerCase('pt-BR') === 'verde musgo' ? 'Verde' : label;
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function CustomKitConfigurator({ mode, kitProduct, kitOptions, products }: { mode: 'natal' | 'religioso'; kitProduct: Product; kitOptions: ProductOption[]; products: KitSelectableProduct[] }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [colorId, setColorId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [optionIds, setOptionIds] = useState<Record<string, string>>({});
  const [productColorIds, setProductColorIds] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const traySection = kitProduct.customization_sections?.find(section => section.type === 'color' || section.type === 'color_text');
  const trayColors = (traySection?.colors ?? []).filter(item => TRAY_COLOR_LABELS.has(item.label));
  const selectedTrayColor = trayColors.find(item => item.id === colorId);
  const selectedCount = Object.values(quantities).reduce((sum, value) => sum + value, 0);
  const selectedProducts = products.filter(product => (quantities[product.id] ?? 0) > 0);
  const total = useMemo(() => mode === 'natal' ? ({ 2: 69.9, 3: 89.9, 4: 109.9, 5: 119.9 }[selectedCount] ?? 69.9) : 26 + selectedProducts.reduce((sum, product) => { const chosen = product.product_options?.find(option => option.id === optionIds[product.id]) ?? product.product_options?.[0]; return sum + ((product.sale_price ?? product.base_price) + (chosen?.price_modifier ?? 0)) * (quantities[product.id] ?? 0); }, 0), [mode, optionIds, quantities, selectedCount, selectedProducts]);
  const canContinue = step === 1 ? Boolean(selectedTrayColor) : mode === 'natal' ? selectedCount >= 2 && selectedCount <= 5 : selectedCount > 0;

  function change(productId: string, delta: number) {
    setQuantities(current => {
      const next = Math.max(0, (current[productId] ?? 0) + delta);
      if (delta > 0 && selectedCount >= 5) return current;
      return { ...current, [productId]: next };
    });
  }

  async function addKit() {
    setSaving(true);
    setError('');
    try {
      if (!traySection || !selectedTrayColor) throw new Error('Escolha uma cor disponível para a bandeja.');
      const itemSummary = selectedProducts.map(product => `${quantities[product.id]}x ${product.name}`).join(', ');
      const kitCustomization = `${traySection.label}: Cor: ${selectedTrayColor.label} · Texto: Itens do kit: ${itemSummary}`;
      if (mode === 'natal') {
        const option = kitOptions.find(item => item.name.includes(`${selectedCount} itens`));
        await addItem({ product: kitProduct, option: option ?? null, quantity: 1, customization_text: kitCustomization });
      } else {
        await addItem({ product: kitProduct, option: null, quantity: 1, customization_text: kitCustomization });
        for (const product of selectedProducts) {
          const option = product.product_options?.find(item => item.id === optionIds[product.id]) ?? product.product_options?.[0] ?? null;
          const colorSection = product.customization_sections?.find(section => section.type === 'color' || section.type === 'color_text');
          const productColor = colorSection?.colors.find(item => item.id === productColorIds[product.id]) ?? colorSection?.colors[0];
          const customization = colorSection && productColor ? `${colorSection.label}: Cor: ${productColor.label}` : null;
          await addItem({ product, option, quantity: quantities[product.id], customization_text: customization, suppressNotification: true });
        }
      }
      setStep(4);
      router.push('/cart');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível adicionar o kit ao carrinho.');
    } finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-5xl text-gray-900 dark:text-gray-100">
    <div className="mb-7 grid grid-cols-4 gap-2">{['Bandeja', 'Itens', 'Resumo', 'Pronto'].map((label, index) => <div key={label} className={`rounded-xl px-2 py-3 text-center text-xs font-bold ${step === index + 1 ? 'bg-pink-600 text-white' : step > index + 1 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{step > index + 1 ? <Check className="mx-auto h-4 w-4" /> : `${index + 1}. ${label}`}</div>)}</div>
    {step === 1 && <section><h2 className="text-2xl font-black">Escolha a cor da bandeja média</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-400">A bandeja média é obrigatória e já faz parte do kit.</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{trayColors.map(item => <button key={item.id} type="button" aria-pressed={colorId === item.id} onClick={() => setColorId(item.id)} className={`rounded-2xl border-2 p-4 text-sm font-bold ${colorId === item.id ? 'border-pink-500 bg-pink-50 text-pink-900 dark:border-pink-400 dark:bg-pink-950/60 dark:text-pink-100' : 'border-gray-200 bg-white text-gray-800 hover:border-pink-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-pink-500'}`}><span className="mx-auto mb-3 block h-14 w-full rounded-xl shadow-inner" style={{ backgroundColor: item.value }} />{displayTrayColor(item.label)}</button>)}</div></section>}
    {step === 2 && <section><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-black">Escolha as peças</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{mode === 'natal' ? `Escolha de 2 a 5 peças. ${selectedCount}/5 selecionadas. O preço muda automaticamente conforme a quantidade.` : `Escolha de 1 a 5 peças religiosas. ${selectedCount}/5 selecionadas.`}</p></div></div><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">{products.map(product => { const colorSection = product.customization_sections?.find(section => section.type === 'color' || section.type === 'color_text'); return <article key={product.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"><div className="aspect-square overflow-hidden rounded-xl bg-pink-50 dark:bg-gray-800">{product.image_url && <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />}</div><h3 className="mt-3 text-sm font-bold">{product.name}</h3>{mode === 'religioso' && <p className="text-xs font-semibold text-pink-600 dark:text-pink-400">{money(product.sale_price ?? product.base_price)}</p>}{mode === 'religioso' && product.product_options && product.product_options.length > 0 && <select aria-label={`Modelo de ${product.name}`} value={optionIds[product.id] ?? product.product_options[0].id} onChange={event => setOptionIds(current => ({ ...current, [product.id]: event.target.value }))} className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/30 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100">{product.product_options.map(option => <option key={option.id} value={option.id}>{option.name}{option.price_modifier ? ` (+${money(option.price_modifier)})` : ''}</option>)}</select>}{mode === 'religioso' && colorSection && colorSection.colors.length > 0 && <select aria-label={`Cor de ${product.name}`} value={productColorIds[product.id] ?? colorSection.colors[0].id} onChange={event => setProductColorIds(current => ({ ...current, [product.id]: event.target.value }))} className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/30 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100">{colorSection.colors.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>}<div className="mt-3 flex items-center justify-between"><button type="button" aria-label={`Diminuir quantidade de ${product.name}`} disabled={!(quantities[product.id] > 0)} onClick={() => change(product.id,-1)} className="h-9 w-9 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700">−</button><strong>{quantities[product.id] ?? 0}</strong><button type="button" aria-label={`Aumentar quantidade de ${product.name}`} disabled={selectedCount >= 5} onClick={() => change(product.id,1)} className="h-9 w-9 rounded-lg bg-pink-600 text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600">+</button></div></article>})}</div></section>}
    {step === 3 && <section className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"><h2 className="text-2xl font-black">Resumo do seu kit</h2><p className="mt-4"><strong>Bandeja média:</strong> {selectedTrayColor ? displayTrayColor(selectedTrayColor.label) : ''}</p><ul className="mt-4 space-y-2">{selectedProducts.map(product => <li key={product.id} className="flex justify-between"><span>{quantities[product.id]}x {product.name}</span>{mode === 'religioso' && <span>{money((product.sale_price ?? product.base_price) * quantities[product.id])}</span>}</li>)}</ul><p className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700 text-2xl font-black">Total: {money(total)}</p></section>}
    {step === 4 && <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-950/50"><Check className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" /><h2 className="mt-3 text-2xl font-black">Kit adicionado ao carrinho</h2><a href="/cart" className="mt-5 inline-flex rounded-xl bg-gray-900 px-6 py-3 font-bold text-white dark:bg-emerald-700 dark:hover:bg-emerald-600">Ver carrinho</a></section>}
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>}
    {step < 4 && <div className="mt-8 flex justify-between"><button type="button" disabled={step === 1} onClick={() => setStep(step - 1)} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"><ChevronLeft className="h-4 w-4" />Voltar</button>{step === 3 ? <button type="button" disabled={saving} onClick={addKit} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 font-bold text-white"><ShoppingBag className="h-4 w-4" />{saving ? 'Adicionando...' : 'Adicionar kit'}</button> : <button type="button" disabled={!canContinue} onClick={() => setStep(step + 1)} className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-6 py-3 font-bold text-white disabled:opacity-40">Continuar<ChevronRight className="h-4 w-4" /></button>}</div>}
  </div>;
}
