'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { Product, ProductOption } from '@/types/database';
import { ProductCategorySelect } from '@/components/admin/ProductCategorySelect';
import { ProductLivePreview } from '@/components/admin/ProductLivePreview';
import { ProductTagSelect, replaceProductTags } from '@/components/admin/ProductTagSelect';

type ProductFormProps =
  | { mode: 'create'; product?: undefined }
  | { mode: 'edit'; product: Product; productOptions?: ProductOption[] };

type DraftOption = {
  id: string;
  name: string;
  dimensions: string;
  color: string;
  priceModifier: string;
  stock: string;
};

function createDraftOption(): DraftOption {
  return { id: crypto.randomUUID(), name: '', dimensions: '', color: '', priceModifier: '0', stock: '0' };
}

export function ProductForm(props: ProductFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const canChangeProductStatus = session?.user?.accessLevel !== 'partner';
  const initial = props.mode === 'edit' ? props.product : null;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<string>(initial?.category ?? 'chaveiros');
  const [basePrice, setBasePrice] = useState<string>(
    initial ? String(initial.base_price) : '',
  );
  const [salePrice, setSalePrice] = useState<string>(
    initial?.sale_price ? String(initial.sale_price) : '',
  );
  const [images, setImages] = useState<string[]>(() => {
    const list: string[] = [];
    if (initial?.images && initial.images.length > 0) return initial.images;
    if (initial?.image_url) list.push(initial.image_url);
    return list;
  });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [fulfillmentMode, setFulfillmentMode] = useState<'made_to_order' | 'ready_stock' | 'hybrid'>(initial?.fulfillment_mode ?? 'made_to_order');
  const [isCustomizable, setIsCustomizable] = useState(initial?.is_customizable ?? false);
  const [options, setOptions] = useState<DraftOption[]>(() => props.mode === 'create' ? [createDraftOption()] : []);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const priceNumber = Number(basePrice);
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      setError('Preço base inválido');
      return;
    }

    const salePriceNumber = salePrice ? Number(salePrice) : null;
    if (salePriceNumber !== null && (Number.isNaN(salePriceNumber) || salePriceNumber < 0)) {
      setError('Preço promocional inválido');
      return;
    }

    const normalizedOptions = options
      .filter((option) => option.name.trim())
      .map((option) => ({
        name: option.name.trim(),
        dimensions: option.dimensions.trim() || null,
        color: option.color || null,
        price_modifier: Number(option.priceModifier || 0),
        stock: Number(option.stock || 0),
      }));
    if (normalizedOptions.some((option) => Number.isNaN(option.price_modifier) || Number.isNaN(option.stock) || option.stock < 0 || !Number.isInteger(option.stock))) {
      setError('Revise o preço adicional e o estoque das variações');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      base_price: priceNumber,
      sale_price: salePriceNumber,
      image_url: images[0] || null,
      images: images.length > 0 ? images : null,
      ...(canChangeProductStatus ? { active } : props.mode === 'create' ? { active: true } : {}),
      fulfillment_mode: fulfillmentMode,
      is_customizable: isCustomizable,
      options: props.mode === 'create' ? normalizedOptions : undefined,
    };

    const url =
      props.mode === 'edit' ? `/api/products/${props.product.id}` : '/api/products';
    const method = props.mode === 'edit' ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Erro ao salvar');
      setSubmitting(false);
      return;
    }

    const data = (await res.json()) as { product: Product };
    const productId = data.product?.id ?? (props.mode === 'edit' ? props.product.id : '');
    try {
      await replaceProductTags(productId, tagIds);
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : 'Não foi possível salvar as tags');
      setSubmitting(false);
      return;
    }
    router.push(props.mode === 'create' ? `/dashboard/products/${productId}/edit` : `/dashboard/products/${productId}`);
    router.refresh();
  }

  async function handleDelete() {
    if (props.mode !== 'edit') return;
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    setSubmitting(true);
    const res = await fetch(`/api/products/${props.product.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Erro ao excluir');
      setSubmitting(false);
      return;
    }
    router.push('/dashboard/products');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="rounded-[26px] bg-white dark:bg-gray-900 p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-5 sm:p-8">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">01 · Identidade</p><h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Informações principais</h2></div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nome
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descrição
          </label>
          <textarea
            id="description"
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Categoria
            </label>
            <ProductCategorySelect
              id="category"
              value={category}
              onChange={setCategory}
              exclude={['encomenda']}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label htmlFor="base_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preço base (R$)
            </label>
            <input
              id="base_price"
              type="number"
              step="0.01"
              min="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Como este produto é atendido?</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {([
              ['made_to_order', 'Sob demanda', 'Produzir após o pagamento'],
              ['ready_stock', 'Pronta-entrega', 'Usar apenas peças prontas'],
              ['hybrid', 'Híbrido', 'Pronto quando houver, produzir se faltar'],
            ] as const).map(([value, label, detail]) => <button key={value} type="button" onClick={() => setFulfillmentMode(value)} className={`rounded-xl border p-3 text-left transition ${fulfillmentMode === value ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-500/10 dark:bg-pink-500/10' : 'border-gray-200 hover:border-pink-200 dark:border-gray-700'}`}><span className="block text-sm font-bold text-gray-900 dark:text-white">{label}</span><span className="mt-0.5 block text-xs leading-5 text-gray-500">{detail}</span></button>)}
          </div>
        </div>

        <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${isCustomizable ? 'border-pink-300 bg-pink-50 dark:border-pink-800 dark:bg-pink-500/10' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'}`}>
          <input type="checkbox" checked={isCustomizable} onChange={(event) => setIsCustomizable(event.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
          <span>
            <span className="block text-sm font-bold text-gray-900 dark:text-white">Produto personalizado?</span>
            <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">Se marcado, o cliente deverá escrever a personalização desejada antes de adicionar o produto ao carrinho.</span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preço promocional (R$)
            </label>
            <input
              id="sale_price"
              type="number"
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="Deixe vazio se não houver promoção"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            {salePrice && basePrice && Number(salePrice) < Number(basePrice) && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                {Math.round((1 - Number(salePrice) / Number(basePrice)) * 100)}% de desconto
              </p>
            )}
          </div>
          <div />
        </div>

        {props.mode === 'create' && (
          <section className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/80 to-orange-50/60 p-4 dark:border-pink-900/40 dark:from-pink-950/20 dark:to-orange-950/10 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">02 · Variações</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Tamanhos, cores e estoque inicial</h2>
                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">Cada linha pode representar uma combinação, como “M · Rosa”. No campo adicional, use 5 para cobrar R$ 5,00 a mais nessa variação.</p>
              </div>
              <button type="button" onClick={() => setOptions((current) => [...current, createDraftOption()])} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-pink-600 shadow-sm ring-1 ring-pink-200 transition hover:bg-pink-50 dark:bg-gray-900 dark:ring-pink-900">
                + Adicionar variação
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {options.map((option, index) => (
                <div key={option.id} className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/90">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">Variação {index + 1}</span>
                    <button type="button" onClick={() => setOptions((current) => current.filter((item) => item.id !== option.id))} className="text-xs font-semibold text-red-500 hover:text-red-700">Remover</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <label className="lg:col-span-2"><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Nome ou tamanho</span><input value={option.name} onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, name: event.target.value } : item))} placeholder="Ex.: P, M, G ou Único" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
                    <label><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Dimensões</span><input value={option.dimensions} onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, dimensions: event.target.value } : item))} placeholder="Ex.: 12 × 8 cm" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
                    <label>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Cor <span className="font-normal text-gray-400">(opcional)</span></span>
                      <div className="mt-1 flex items-center rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
                        <input
                          type="color"
                          value={option.color || '#ec4899'}
                          aria-label="Selecionar cor da variação"
                          onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, color: event.target.value } : item))}
                          className={`h-8 w-10 cursor-pointer border-0 bg-transparent ${option.color ? '' : 'opacity-40'}`}
                        />
                        <input
                          value={option.color}
                          onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, color: event.target.value } : item))}
                          placeholder="Sem cor"
                          className="min-w-0 flex-1 bg-transparent px-1 text-xs uppercase outline-none placeholder:normal-case placeholder:text-gray-400"
                        />
                        {option.color && (
                          <button
                            type="button"
                            onClick={() => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, color: '' } : item))}
                            className="rounded-md px-2 py-1 text-[10px] font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </label>
                    <label><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Adicional (R$)</span><input type="number" step="0.01" value={option.priceModifier} onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, priceModifier: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
                    <label><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Pronta-entrega</span><input type="number" min="0" step="1" value={option.stock} onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, stock: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
                  </div>
                </div>
              ))}
              {options.length === 0 && <button type="button" onClick={() => setOptions([createDraftOption()])} className="w-full rounded-xl border border-dashed border-pink-300 p-4 text-sm font-semibold text-pink-600">Adicionar a primeira variação</button>}
            </div>
          </section>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Imagens do produto
          </label>
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {images.map((url, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Imagem ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const arr = [...images];
                          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                          setImages(arr);
                        }}
                        className="rounded-full bg-white/90 p-1.5 text-xs font-bold text-gray-800 hover:bg-white"
                        title="Mover para esquerda"
                      >
                        ←
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="rounded-full bg-red-500 p-1.5 text-xs font-bold text-white hover:bg-red-600"
                      title="Remover"
                    >
                      ✕
                    </button>
                    {idx < images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const arr = [...images];
                          [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                          setImages(arr);
                        }}
                        className="rounded-full bg-white/90 p-1.5 text-xs font-bold text-gray-800 hover:bg-white"
                        title="Mover para direita"
                      >
                        →
                      </button>
                    )}
                  </div>
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 rounded bg-pink-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Capa
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://... (cole a URL da imagem)"
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              type="button"
              onClick={() => {
                const url = newImageUrl.trim();
                if (url && !images.includes(url)) {
                  setImages([...images, url]);
                  setNewImageUrl('');
                }
              }}
              disabled={!newImageUrl.trim()}
              className="rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition"
            >
              Adicionar
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            A primeira imagem será usada como capa. Arraste para reordenar.
          </p>
        </div>

        <div><p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Tags do produto</p><ProductTagSelect productId={props.mode === 'edit' ? props.product.id : undefined} value={tagIds} onChange={setTagIds} /></div>

        {canChangeProductStatus && <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Produto ativo (visível na loja)</span>
        </label>}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <ProductLivePreview
            name={name}
            description={description}
            category={category}
            basePrice={Number(basePrice) || 0}
            salePrice={salePrice ? Number(salePrice) : null}
            images={images}
            type="physical"
            active={active}
            compact
            options={props.mode === 'edit'
              ? (props.productOptions ?? []).map((option) => ({ id: option.id, name: option.name, priceModifier: option.price_modifier }))
              : options.filter((option) => option.name.trim()).map((option) => ({ id: option.id, name: option.name, priceModifier: Number(option.priceModifier) || 0 }))}
          />
          <div className="rounded-2xl border border-pink-100 bg-pink-50/70 p-4 text-xs leading-5 text-slate-600 dark:border-pink-900/40 dark:bg-pink-500/10 dark:text-slate-300">
            O preview acompanha nome, preço, capa, categoria e variações em tempo real. Salve para publicar as alterações na loja.
          </div>
        </aside>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-pink-600 disabled:opacity-50 transition dark:bg-white dark:text-slate-950"
          >
            {submitting ? 'Salvando...' : props.mode === 'edit' ? 'Salvar alterações' : 'Criar produto'}
          </button>
          <Link
            href={
              props.mode === 'edit'
                ? `/dashboard/products/${props.product.id}`
                : '/dashboard/products'
            }
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancelar
          </Link>
        </div>

        {props.mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="rounded-lg border border-red-300 dark:border-red-700 px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 transition"
          >
            Excluir produto
          </button>
        )}
      </div>
    </form>
  );
}
