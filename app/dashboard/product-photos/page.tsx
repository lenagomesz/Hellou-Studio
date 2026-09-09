'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronRight,
  Download,
  Eye,
  ImagePlus,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  MAX_GENERATIONS_PER_BATCH,
  MAX_PRODUCT_IMAGES,
  PRODUCT_PHOTO_ANGLES,
  productGallery,
  type ProductPhotoAngle,
} from '@/lib/ai/product-photo';

type ProductPhotoProduct = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  image_url_2: string | null;
  images: string[] | null;
  active: boolean;
};

type GeneratedPhoto = {
  id: string;
  url: string;
  angle: ProductPhotoAngle;
  sourceImageUrl: string;
  quality: string;
  approved: boolean;
};

const ANGLE_DESCRIPTIONS: Record<ProductPhotoAngle, string> = {
  front: 'Frente centralizada',
  'three-quarter-left': '45° pela esquerda',
  'three-quarter-right': '45° pela direita',
  side: 'Perfil lateral',
  back: 'Parte de trás',
  top: 'Vista de cima',
  detail: 'Acabamento de perto',
};

const REVIEW_ITEMS = [
  'Formato e proporções continuam iguais ao produto real',
  'Cores, material e acabamento conferem com a foto original',
  'Textos, nomes, quantidade de peças e detalhes não foram inventados',
  'Fundo, sombras e perspectiva parecem uma fotografia real',
];

export default function ProductPhotosPage() {
  const [products, setProducts] = useState<ProductPhotoProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [sourceImageUrl, setSourceImageUrl] = useState('');
  const [angles, setAngles] = useState<ProductPhotoAngle[]>(['three-quarter-left', 'three-quarter-right']);
  const [framing, setFraming] = useState('same');
  const [lighting, setLighting] = useState('preserve');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState<'1K' | '2K' | '4K'>('2K');
  const [instructions, setInstructions] = useState('');
  const [generated, setGenerated] = useState<GeneratedPhoto[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [makeCoverUrl, setMakeCoverUrl] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<boolean[]>(REVIEW_ITEMS.map(() => false));
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/products?active=all&type=physical&limit=100')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? 'Não foi possível carregar os produtos.');
        return data;
      })
      .then((data) => setProducts(data.products ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os produtos.'))
      .finally(() => setLoadingProducts(false));
  }, []);

  const selectedProduct = products.find((product) => product.id === productId) ?? null;
  const sourceImages = selectedProduct ? productGallery(selectedProduct) : [];
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return products;
    return products.filter((product) => `${product.name} ${product.category}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [products, search]);
  const approved = generated.filter((photo) => photo.approved);
  const selectedResult = generated.find((photo) => photo.id === selectedResultId) ?? generated[0] ?? null;
  const allReviewed = reviewed.every(Boolean);

  function chooseProduct(product: ProductPhotoProduct) {
    if (generating || saving) return;
    if (generated.length > 0 && product.id !== productId && !window.confirm('Trocar de produto limpará os resultados desta tela. Continuar?')) return;
    const gallery = productGallery(product);
    setProductId(product.id);
    setSourceImageUrl(gallery[0] ?? '');
    setGenerated([]);
    setSelectedResultId(null);
    setMakeCoverUrl(null);
    setReviewed(REVIEW_ITEMS.map(() => false));
    setError('');
    setSuccess('');
  }

  function toggleAngle(angle: ProductPhotoAngle) {
    setAngles((current) => current.includes(angle)
      ? current.filter((item) => item !== angle)
      : current.length < MAX_GENERATIONS_PER_BATCH ? [...current, angle] : current);
  }

  async function generatePhotos() {
    if (!selectedProduct || !sourceImageUrl || angles.length === 0) return;
    const freeSlots = MAX_PRODUCT_IMAGES - sourceImages.length;
    if (freeSlots <= 0) {
      setError(`A galeria já possui ${MAX_PRODUCT_IMAGES} fotos. Remova uma antes de gerar.`);
      return;
    }
    if (angles.length > freeSlots) {
      setError(`Há espaço para apenas ${freeSlots} ${freeSlots === 1 ? 'foto' : 'fotos'} neste produto. Selecione menos ângulos ou remova fotos da galeria.`);
      return;
    }
    setGenerating(true);
    setError('');
    setSuccess('');
    setProgress({ current: 0, total: angles.length });
    const results: GeneratedPhoto[] = [];
    const errors: string[] = [];
    for (const [index, angle] of angles.entries()) {
      setProgress({ current: index + 1, total: angles.length });
      try {
        const response = await fetch('/api/admin/ai/product-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, sourceImageUrl, angle, framing, lighting, aspectRatio, quality, instructions }),
        });
        const data = await response.json().catch(() => ({})) as { image?: Omit<GeneratedPhoto, 'id' | 'approved'>; error?: string };
        if (!response.ok || !data.image) throw new Error(data.error ?? 'A geração não devolveu uma imagem.');
        results.push({ ...data.image, id: crypto.randomUUID(), approved: false });
      } catch (cause) {
        errors.push(`${ANGLE_DESCRIPTIONS[angle]}: ${cause instanceof Error ? cause.message : 'falhou'}`);
      }
    }
    setGenerated((current) => [...current, ...results]);
    setSelectedResultId((current) => current ?? results[0]?.id ?? null);
    setReviewed(REVIEW_ITEMS.map(() => false));
    if (errors.length) setError(errors.join(' '));
    if (results.length) setSuccess(`${results.length} ${results.length === 1 ? 'rascunho gerado' : 'rascunhos gerados'}. Compare e aprove somente os fiéis ao produto.`);
    setGenerating(false);
  }

  async function discardPhoto(photo: GeneratedPhoto) {
    setGenerated((current) => current.filter((item) => item.id !== photo.id));
    if (selectedResultId === photo.id) setSelectedResultId(null);
    if (makeCoverUrl === photo.url) setMakeCoverUrl(null);
    await fetch('/api/admin/ai/product-photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, url: photo.url }),
    }).catch(() => undefined);
  }

  async function saveApproved() {
    if (!selectedProduct || approved.length === 0 || !allReviewed) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/admin/ai/product-photos/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, urls: approved.map((photo) => photo.url), makeCoverUrl }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; gallery?: string[]; cover?: string };
      if (!response.ok || !data.gallery) throw new Error(data.error ?? 'Não foi possível salvar as fotos.');
      setProducts((current) => current.map((product) => product.id === productId ? {
        ...product,
        image_url: data.cover ?? product.image_url,
        images: data.gallery ?? product.images,
      } : product));
      setGenerated((current) => current.filter((photo) => !photo.approved));
      setMakeCoverUrl(null);
      setReviewed(REVIEW_ITEMS.map(() => false));
      setSuccess(`${approved.length} ${approved.length === 1 ? 'foto adicionada' : 'fotos adicionadas'} ao produto com sucesso.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar as fotos.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50 to-orange-50 p-5 shadow-sm dark:border-pink-950 dark:from-slate-950 dark:via-slate-900 dark:to-orange-950/30 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-pink-700 dark:bg-pink-950 dark:text-pink-300"><WandSparkles className="h-3.5 w-3.5" /> Estúdio de produto com IA</span>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Mais ângulos, o mesmo produto de verdade</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Crie fotos complementares mantendo o fundo cadastrado, compare com a original e publique somente o que estiver fiel. Nenhuma imagem entra na loja sem sua aprovação.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/80 px-3 py-3 shadow-sm dark:bg-slate-900/80"><strong className="block text-lg text-pink-600">{products.length}</strong><span className="text-[10px] text-slate-500">produtos</span></div>
            <div className="rounded-2xl bg-white/80 px-3 py-3 shadow-sm dark:bg-slate-900/80"><strong className="block text-lg text-orange-500">{generated.length}</strong><span className="text-[10px] text-slate-500">rascunhos</span></div>
            <div className="rounded-2xl bg-white/80 px-3 py-3 shadow-sm dark:bg-slate-900/80"><strong className="block text-lg text-emerald-600">{approved.length}</strong><span className="text-[10px] text-slate-500">aprovadas</span></div>
          </div>
        </div>
      </header>

      {error && <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Fechar erro"><X className="h-4 w-4" /></button></div>}
      {success && <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300"><Check className="h-4 w-4" /> {success}</div>}

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-pink-600">Etapa 1</p><h2 className="mt-1 font-bold text-slate-900 dark:text-white">Escolha o produto</h2></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-800">{filteredProducts.length}</span></div>
            <div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-pink-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></div>
            <div className="mt-3 max-h-[370px] space-y-2 overflow-y-auto pr-1">
              {loadingProducts ? <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : filteredProducts.map((product) => {
                const images = productGallery(product);
                return <button key={product.id} type="button" onClick={() => chooseProduct(product)} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${productId === product.id ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/30' : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800'}`}>
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">{images[0] ? <img src={images[0]} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="m-3 h-6 w-6 text-slate-300" />}</div>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-800 dark:text-slate-100">{product.name}</strong><small className="mt-0.5 block text-[10px] text-slate-400">{images.length} de {MAX_PRODUCT_IMAGES} fotos · {product.active ? 'ativo' : 'inativo'}</small></span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>;
              })}
            </div>
          </section>
        </aside>

        <main className="min-w-0 space-y-6">
          {!selectedProduct ? (
            <section className="grid min-h-[480px] place-items-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50"><div><Camera className="mx-auto h-12 w-12 text-pink-200" /><h2 className="mt-4 text-lg font-bold text-slate-700 dark:text-slate-200">Selecione um produto para começar</h2><p className="mt-2 text-sm text-slate-500">Você usará uma foto já cadastrada como referência visual.</p></div></section>
          ) : (
            <>
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-pink-600">Etapa 2</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Foto-base e direção criativa</h2><p className="mt-1 text-xs text-slate-500">O fundo desta foto será mantido em todos os novos ângulos.</p></div><Link href={`/dashboard/products/${selectedProduct.id}/edit`} className="text-xs font-bold text-pink-600 hover:underline">Editar galeria original</Link></div>

                {sourceImages.length === 0 ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800"><strong>Este produto ainda não tem foto.</strong><p className="mt-1">Cadastre uma imagem real primeiro para que a IA tenha uma referência fiel.</p></div> : <>
                  <div className="mt-5 flex gap-3 overflow-x-auto pb-2">{sourceImages.map((url, index) => <button key={url} type="button" onClick={() => setSourceImageUrl(url)} className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 bg-slate-100 ${sourceImageUrl === url ? 'border-pink-500 ring-4 ring-pink-100 dark:ring-pink-950' : 'border-transparent'}`}><img src={url} alt={`Referência ${index + 1}`} className="h-full w-full object-cover" />{sourceImageUrl === url && <span className="absolute bottom-1 left-1 rounded-full bg-pink-600 px-2 py-0.5 text-[9px] font-bold text-white">Base</span>}</button>)}</div>

                  <div className="mt-6"><div className="flex items-center justify-between"><label className="text-xs font-bold text-slate-700 dark:text-slate-200">Ângulos desejados</label><span className="text-[10px] text-slate-400">até {MAX_GENERATIONS_PER_BATCH} por rodada</span></div><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.keys(PRODUCT_PHOTO_ANGLES) as ProductPhotoAngle[]).map((angle) => <button key={angle} type="button" onClick={() => toggleAngle(angle)} className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${angles.includes(angle) ? 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'} ${!angles.includes(angle) && angles.length >= MAX_GENERATIONS_PER_BATCH ? 'opacity-45' : ''}`}>{angles.includes(angle) && <Check className="mr-1 inline h-3.5 w-3.5" />}{ANGLE_DESCRIPTIONS[angle]}</button>)}</div></div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Enquadramento<select value={framing} onChange={(event) => setFraming(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-950"><option value="same">Igual ao original</option><option value="closer">Mais próximo</option><option value="wider">Mais aberto</option></select></label>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Iluminação<select value={lighting} onChange={(event) => setLighting(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-950"><option value="preserve">Preservar original</option><option value="soft">Suavizar sombras</option><option value="bright">Clarear discretamente</option></select></label>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Formato<select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-950"><option value="1:1">Quadrado 1:1</option><option value="4:5">Retrato 4:5</option><option value="3:4">Retrato 3:4</option></select></label>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Qualidade<select value={quality} onChange={(event) => setQuality(event.target.value as '1K' | '2K' | '4K')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-950"><option value="2K">Alta 2K · recomendada</option><option value="4K">Máxima 4K · mais lenta</option><option value="1K">Rápida 1K</option></select></label>
                  </div>
                  <label className="mt-5 block text-xs font-bold text-slate-700 dark:text-slate-200">Orientação opcional<textarea value={instructions} onChange={(event) => setInstructions(event.target.value.slice(0, 600))} rows={2} placeholder="Ex.: destaque o acabamento do nome, mas não altere nenhuma letra." className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-pink-400 dark:border-slate-700 dark:bg-slate-950" /><span className="mt-1 block text-right text-[10px] font-normal text-slate-400">{instructions.length}/600</span></label>
                  <button type="button" onClick={() => void generatePhotos()} disabled={generating || angles.length === 0 || !sourceImageUrl} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none">{generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando {progress.current} de {progress.total}...</> : <><Sparkles className="h-4 w-4" /> Gerar {angles.length} {angles.length === 1 ? 'novo ângulo' : 'novos ângulos'}</>}</button>
                </>}
              </section>

              {generated.length > 0 && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-pink-600">Etapa 3</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Compare e aprove</h2><p className="mt-1 text-xs text-slate-500">Clique em um rascunho para comparar em tamanho maior.</p></div>
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <figure><figcaption className="mb-2 text-xs font-bold text-slate-500">Original utilizada</figcaption><div className="aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950"><img src={sourceImageUrl} alt="Foto original do produto" className="h-full w-full object-contain" /></div></figure>
                  {selectedResult && <figure><figcaption className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500"><span>Resultado · {ANGLE_DESCRIPTIONS[selectedResult.angle]}</span><a href={selectedResult.url} download className="inline-flex items-center gap-1 text-pink-600"><Download className="h-3.5 w-3.5" /> Baixar</a></figcaption><div className="aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950"><img src={selectedResult.url} alt="Foto gerada para revisão" className="h-full w-full object-contain" /></div></figure>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{generated.map((photo) => <article key={photo.id} className={`overflow-hidden rounded-2xl border-2 ${selectedResult?.id === photo.id ? 'border-pink-500' : photo.approved ? 'border-emerald-400' : 'border-slate-200 dark:border-slate-700'}`}><button type="button" onClick={() => setSelectedResultId(photo.id)} className="relative block aspect-square w-full bg-slate-100"><img src={photo.url} alt={ANGLE_DESCRIPTIONS[photo.angle]} className="h-full w-full object-cover" />{photo.approved && <span className="absolute left-2 top-2 rounded-full bg-emerald-600 p-1 text-white"><Check className="h-3 w-3" /></span>}</button><div className="p-2"><p className="truncate text-[10px] font-bold text-slate-600 dark:text-slate-300">{ANGLE_DESCRIPTIONS[photo.angle]}</p><div className="mt-2 grid grid-cols-2 gap-1"><button type="button" onClick={() => setGenerated((current) => current.map((item) => item.id === photo.id ? { ...item, approved: !item.approved } : item))} className={`rounded-lg px-2 py-1.5 text-[10px] font-bold ${photo.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700'}`}>{photo.approved ? 'Aprovada' : 'Aprovar'}</button><button type="button" onClick={() => void discardPhoto(photo)} className="rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Trash2 className="mx-auto h-3.5 w-3.5" /></button></div></div></article>)}</div>
              </section>}

              {approved.length > 0 && <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-950 dark:bg-emerald-950/20 sm:p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" /><div><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Etapa 4 · verificação humana</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Confirme que a foto representa o que será entregue</h2><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">Fotos bonitas ajudam a vender; fotos fiéis evitam devoluções e aumentam a confiança.</p></div></div>
                <div className="mt-5 space-y-2">{REVIEW_ITEMS.map((item, index) => <label key={item} className="flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3 text-xs text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"><input type="checkbox" checked={reviewed[index]} onChange={(event) => setReviewed((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))} className="mt-0.5 h-4 w-4 accent-emerald-600" /><span>{item}</span></label>)}</div>
                <div className="mt-5"><p className="text-xs font-bold text-slate-700 dark:text-slate-200">Capa do produto</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => setMakeCoverUrl(null)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${makeCoverUrl === null ? 'border-emerald-500 bg-white text-emerald-700' : 'border-slate-200 text-slate-500'}`}>Manter capa atual</button>{approved.map((photo) => <button key={photo.id} type="button" onClick={() => setMakeCoverUrl(photo.url)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${makeCoverUrl === photo.url ? 'border-emerald-500 bg-white text-emerald-700' : 'border-slate-200 text-slate-500'}`}>Usar {ANGLE_DESCRIPTIONS[photo.angle]} como capa</button>)}</div></div>
                <button type="button" onClick={() => void saveApproved()} disabled={!allReviewed || saving} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} {saving ? 'Salvando no produto...' : `Adicionar ${approved.length} ${approved.length === 1 ? 'foto' : 'fotos'} ao produto`}</button>
              </section>}

              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800 dark:border-blue-950 dark:bg-blue-950/30 dark:text-blue-300"><Eye className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Boa prática:</strong> gere primeiro vistas de 45°, lateral e traseira. Use close-up somente quando o detalhe estiver visível na original. Se letras, encaixes ou quantidades mudarem, descarte e tente novamente com uma orientação mais específica.</p></div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
