'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, ExternalLink, Gift, Loader2, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { DEFAULT_STORE_SETTINGS, type StoreSettings } from '@/lib/store-settings-schema';
import { createProductSlug } from '@/lib/product-commercial';

type Kit = StoreSettings['kits'][number];
type ProductChoice = {
  id: string;
  name: string;
  image_url: string | null;
  type: string;
  active: boolean;
  category: string;
  is_wholesale?: boolean;
  fulfillment_mode?: string;
  product_options?: Array<{ stock: number; active?: boolean }>;
};

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/10';

function isKitChoiceAvailable(product: ProductChoice) {
  return product.active && product.type === 'physical' && product.category !== 'encomenda' && !product.is_wholesale
    && (product.fulfillment_mode !== 'ready_stock' || product.product_options?.some(option => option.active !== false && option.stock > 0));
}

function unavailableReason(product: ProductChoice) {
  if (product.is_wholesale) return 'Produto exclusivo de atacado';
  if (product.fulfillment_mode === 'ready_stock' && !product.product_options?.some(option => option.active !== false && option.stock > 0)) return 'Sem estoque disponível';
  return 'Produto indisponível para kits';
}

export default function KitsAdminPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [savedKits, setSavedKits] = useState<Kit[]>(DEFAULT_STORE_SETTINGS.kits);
  const [products, setProducts] = useState<ProductChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [aiInstructions, setAiInstructions] = useState<Record<number, string>>({});
  const [message, setMessage] = useState('');
  const dirty = useMemo(() => JSON.stringify(settings.kits) !== JSON.stringify(savedKits), [savedKits, settings.kits]);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/store-settings', { cache: 'no-store' }).then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Erro ao carregar os kits');
        return payload.settings as StoreSettings;
      }),
      fetch('/api/products?active=true&type=physical&limit=100', { cache: 'no-store' }).then(response => response.json()),
    ]).then(([loadedSettings, productPayload]) => {
      setSettings(loadedSettings);
      setSavedKits(loadedSettings.kits);
      setProducts((productPayload.products ?? []).filter((product: ProductChoice) => product.type === 'physical' && product.active));
    }).catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false));
  }, []);

  function updateKit(index: number, patch: Partial<Kit>) {
    setSettings(current => ({ ...current, kits: current.kits.map((kit, kitIndex) => kitIndex === index ? { ...kit, ...patch } : kit) }));
    setMessage('');
  }

  function addKit() {
    const number = settings.kits.length + 1;
    setSettings(current => ({
      ...current,
      kits: [...current.kits, { slug: `novo-kit-${number}`, title: `Novo kit ${number}`, eyebrow: 'Feitos para combinar', description: 'Descreva esta combinação especial.', tone: 'pink', productIds: [], active: false }],
    }));
  }

  function deleteKit(index: number) {
    setSettings(current => ({ ...current, kits: current.kits.filter((_, kitIndex) => kitIndex !== index) }));
    setAiInstructions(current => Object.fromEntries(
      Object.entries(current)
        .map(([key, instruction]) => [Number(key), instruction] as const)
        .filter(([key]) => key !== index)
        .map(([key, instruction]) => [key > index ? key - 1 : key, instruction]),
    ));
    setMessage('');
  }

  async function improveWithAI(index: number) {
    const kit = settings.kits[index];
    const productNames = kit.productIds
      .map(productId => products.find(product => product.id === productId)?.name)
      .filter((name): name is string => Boolean(name));
    if (productNames.length < 2) {
      setMessage('Selecione pelo menos dois produtos antes de gerar os textos com IA.');
      return;
    }

    setGeneratingIndex(index);
    setMessage('');
    try {
      const response = await fetch('/api/admin/ai/kit-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current: { title: kit.title, eyebrow: kit.eyebrow, description: kit.description },
          productNames,
          instruction: aiInstructions[index]?.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { content?: Pick<Kit, 'title' | 'eyebrow' | 'description'>; error?: string };
      if (!response.ok || !payload.content) throw new Error(payload.error || 'Não foi possível gerar os textos do kit.');
      updateKit(index, payload.content);
      setMessage('Sugestão da IA aplicada. Revise o texto e clique em Salvar kits.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível gerar os textos do kit.');
    } finally {
      setGeneratingIndex(null);
    }
  }

  async function save() {
    if (settings.kits.some(kit => !kit.title.trim() || !kit.slug.trim())) {
      setMessage('Todos os kits precisam de nome e endereço.');
      return;
    }
    if (settings.kits.some(kit => kit.active && kit.productIds.length < 2)) {
      setMessage('Cada kit ativo precisa ter pelo menos dois produtos.');
      return;
    }
    if (settings.kits.some(kit => kit.active && kit.productIds.some(productId => {
      const product = products.find(item => item.id === productId);
      return !product || !isKitChoiceAvailable(product);
    }))) {
      setMessage('Um kit ativo contém produto sem estoque ou indisponível. Remova esse produto ou desative o kit.');
      return;
    }
    const slugs = settings.kits.map(kit => createProductSlug(kit.slug));
    if (new Set(slugs).size !== slugs.length) {
      setMessage('Os endereços dos kits não podem se repetir.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const normalizedSettings = { ...settings, kits: settings.kits.map((kit, index) => ({ ...kit, slug: slugs[index] })) };
      const response = await fetch('/api/admin/store-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(normalizedSettings) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao salvar os kits');
      setSettings(payload.settings);
      setSavedKits(payload.settings.kits);
      setMessage('Kits salvos e atualizados na loja.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao salvar os kits');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-pink-600" /><span className="ml-3 text-sm text-slate-500">Carregando kits…</span></div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/70 to-orange-50 p-6 shadow-sm sm:p-8">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Catálogo</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Editar kits</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Escolha o nome, os textos e os produtos de cada combinação exibida na loja.</p></div>
        <Link href="/kits" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><ExternalLink className="h-4 w-4" /> Ver kits na loja</Link>
      </header>

      {message && <div role="status" className={`rounded-xl border p-4 text-sm font-medium ${message.includes('salvos') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{message.includes('salvos') && <CheckCircle2 className="mr-2 inline h-4 w-4" />}{message}</div>}

      <div className="space-y-5">
        {settings.kits.map((kit, index) => (
          <article key={`${kit.slug}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={kit.active} onChange={event => updateKit(index, { active: event.target.checked })} className="rounded text-pink-600" /> Kit ativo</label>
              <button type="button" onClick={() => deleteKit(index)} className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-xs font-bold text-red-600"><Trash2 className="h-4 w-4" /> Excluir</button>
            </div>
            <div className="mt-5 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-pink-50 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-56 flex-1 text-xs font-bold text-violet-900">
                  Orientação para a IA (opcional)
                  <input
                    value={aiInstructions[index] ?? ''}
                    maxLength={500}
                    onChange={event => setAiInstructions(current => ({ ...current, [index]: event.target.value }))}
                    placeholder="Ex.: destaque que é uma opção de presente"
                    className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-950 outline-none focus:border-violet-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void improveWithAI(index)}
                  disabled={generatingIndex !== null || kit.productIds.length < 2}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generatingIndex === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generatingIndex === index ? 'Criando…' : 'Melhorar textos com IA'}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-violet-700">A IA usa os produtos marcados e aplica a sugestão somente neste formulário. Você revisa antes de salvar.</p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Nome<input value={kit.title} maxLength={80} onChange={event => updateKit(index, { title: event.target.value })} className={inputClass} /></label>
              <label className="text-xs font-bold text-slate-700">Endereço da URL<input value={kit.slug} maxLength={80} onChange={event => updateKit(index, { slug: createProductSlug(event.target.value) })} className={inputClass} /><span className="mt-1 block font-normal text-slate-400">/kits/{kit.slug || 'nome-do-kit'}</span></label>
              <label className="text-xs font-bold text-slate-700">Chamada curta<input value={kit.eyebrow} maxLength={100} onChange={event => updateKit(index, { eyebrow: event.target.value })} className={inputClass} /></label>
              <label className="text-xs font-bold text-slate-700">Cor<select value={kit.tone} onChange={event => updateKit(index, { tone: event.target.value as Kit['tone'] })} className={inputClass}><option value="pink">Rosa</option><option value="violet">Violeta</option><option value="orange">Laranja</option></select></label>
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">Descrição<textarea rows={3} value={kit.description} maxLength={350} onChange={event => updateKit(index, { description: event.target.value })} className={`${inputClass} resize-none`} /></label>
            </div>
            <div className="mt-5"><p className="text-xs font-bold text-slate-700">Produtos do kit ({kit.productIds.length})</p><p className="mt-1 text-[11px] text-slate-400">Marque pelo menos dois produtos. A ordem abaixo será usada na apresentação.</p>
              <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-2 sm:grid-cols-2">
                {products.map(product => {
                  const selected = kit.productIds.includes(product.id);
                  const available = isKitChoiceAvailable(product);
                  return <label key={product.id} className={`flex items-center gap-3 rounded-xl p-2 ${available || selected ? 'cursor-pointer hover:bg-pink-50' : 'cursor-not-allowed opacity-55'}`}>
                    <input type="checkbox" checked={selected} disabled={!available && !selected} onChange={event => updateKit(index, { productIds: event.target.checked ? [...kit.productIds, product.id] : kit.productIds.filter(id => id !== product.id) })} className="rounded text-pink-600" />
                    {product.image_url ? <Image src={product.image_url} alt="" width={40} height={40} className="h-10 w-10 rounded-lg object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100"><Gift className="h-4 w-4 text-slate-300" /></span>}
                    <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-700">{product.name}</span>{!available && <span className="block text-[10px] font-semibold text-amber-700">{unavailableReason(product)}</span>}</span>
                  </label>;
                })}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="sticky bottom-4 z-20 flex flex-wrap justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <button type="button" onClick={addKit} disabled={settings.kits.length >= 12} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-pink-300 px-4 py-3 text-sm font-bold text-pink-700 disabled:opacity-50"><Plus className="h-4 w-4" /> Adicionar kit</button>
        <button type="button" onClick={save} disabled={!dirty || saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Salvando…' : 'Salvar kits'}</button>
      </div>
    </div>
  );
}
