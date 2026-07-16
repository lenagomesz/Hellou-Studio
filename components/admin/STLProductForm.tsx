'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertCircle, FileUp, ImagePlus, Loader2, Upload, X } from 'lucide-react';
import type { Product } from '@/types/database';
import { ProductCategorySelect } from '@/components/admin/ProductCategorySelect';
import { ProductLivePreview } from '@/components/admin/ProductLivePreview';

const MAX_STL_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGES = 6;

type Props =
  | { mode: 'create'; product?: undefined }
  | { mode: 'edit'; product: Product };

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function STLProductForm({ mode, product }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const canChangeProductStatus = session?.user?.accessLevel !== 'partner';
  const stlInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const initialImages = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set([product.image_url, ...(product.images ?? [])].filter((url): url is string => Boolean(url))));
  }, [product]);

  const [file, setFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState(initialImages);
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.base_price) : '');
  const [category, setCategory] = useState(product?.category ?? 'encomenda');
  const [active, setActive] = useState(product?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const previews = imageFiles.map((image) => URL.createObjectURL(image));
    setImagePreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [imageFiles]);

  function validateSTL(selectedFile: File) {
    if (!selectedFile.name.toLowerCase().endsWith('.stl')) return 'Apenas arquivos .stl são aceitos';
    if (selectedFile.size > MAX_STL_SIZE) return 'O arquivo STL deve ter no máximo 100 MB';
    return null;
  }

  function selectSTL(selectedFile?: File) {
    if (!selectedFile) return;
    const validationError = validateSTL(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setFile(selectedFile);
    if (!name) setName(selectedFile.name.replace(/\.stl$/i, '').replace(/[_-]/g, ' '));
  }

  function addImages(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    const invalid = selected.find((image) => !['image/jpeg', 'image/png', 'image/webp'].includes(image.type));
    if (invalid) {
      setError('As imagens devem estar em JPG, PNG ou WebP');
      return;
    }
    const oversized = selected.find((image) => image.size > MAX_IMAGE_SIZE);
    if (oversized) {
      setError(`A imagem ${oversized.name} ultrapassa 8 MB`);
      return;
    }
    const available = MAX_IMAGES - existingImages.length - imageFiles.length;
    if (selected.length > available) {
      setError(`Você pode cadastrar até ${MAX_IMAGES} imagens por produto`);
      return;
    }
    setError('');
    setImageFiles((current) => [...current, ...selected]);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (mode === 'create' && !file) return setError('Selecione um arquivo STL');
    if (!name.trim()) return setError('Nome do produto é obrigatório');
    if (!price || !Number.isFinite(Number(price)) || Number(price) <= 0) return setError('O preço deve ser maior que zero');

    setLoading(true);
    try {
      const formData = new FormData();
      if (file) formData.append('stl', file);
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('price', price);
      formData.append('category', category);
      if (canChangeProductStatus) formData.append('active', String(active));
      formData.append('existingImages', JSON.stringify(existingImages));
      imageFiles.forEach((image) => formData.append('images', image));
      if (product) formData.append('productId', product.id);

      const response = await fetch('/api/upload/stl', {
        method: mode === 'create' ? 'POST' : 'PATCH',
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; product?: Product };
      if (!response.ok || !data.product) throw new Error(data.error ?? 'Não foi possível salvar o produto STL');

      router.push(`/dashboard/products/${data.product.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  }

  const allImages = [
    ...existingImages.map((url) => ({ kind: 'existing' as const, url })),
    ...imagePreviews.map((url, index) => ({ kind: 'new' as const, url, index })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">01 · Arquivo digital</p>
        <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Arquivo STL</h2>
        <p className="mt-1 text-sm text-gray-500">{mode === 'edit' && product.file_path ? 'O arquivo atual será mantido. Selecione outro somente para substituí-lo.' : 'Envie o arquivo que o cliente receberá após a compra.'}</p>
        <div
          onDrop={(event) => { event.preventDefault(); setDragOver(false); selectSTL(event.dataTransfer.files[0]); }}
          onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !file && stlInputRef.current?.click()}
          className={`mt-5 cursor-pointer rounded-xl border-2 border-dashed p-7 text-center transition ${dragOver ? 'border-pink-500 bg-pink-50' : file ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 hover:border-pink-400 dark:border-gray-600'}`}
        >
          <input ref={stlInputRef} type="file" accept=".stl" onChange={(event) => selectSTL(event.target.files?.[0])} className="hidden" />
          {file ? (
            <div className="flex items-center justify-center gap-4">
              <FileUp className="h-9 w-9 text-green-500" />
              <div className="text-left"><p className="font-medium text-gray-900 dark:text-white">{file.name}</p><p className="text-sm text-gray-500">{formatFileSize(file.size)}</p></div>
              <button type="button" aria-label="Remover arquivo STL" onClick={(event) => { event.stopPropagation(); setFile(null); if (stlInputRef.current) stlInputRef.current.value = ''; }} className="rounded-full p-2 text-red-500 hover:bg-red-100"><X className="h-5 w-5" /></button>
            </div>
          ) : (
            <div><Upload className="mx-auto h-11 w-11 text-gray-400" /><p className="mt-3 font-medium text-gray-700 dark:text-gray-300">{mode === 'edit' && product.file_path ? 'Clique ou arraste para substituir o STL' : 'Clique ou arraste o arquivo STL aqui'}</p><p className="mt-1 text-sm text-gray-500">Máximo de 100 MB</p></div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">02 · Galeria</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Imagens do produto</h2><p className="mt-1 text-sm text-gray-500">Mostre o modelo pronto, detalhes e ângulos diferentes. A primeira imagem será a capa.</p></div>
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={allImages.length >= MAX_IMAGES} className="inline-flex items-center gap-2 rounded-xl border border-pink-200 px-4 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50 disabled:opacity-50"><ImagePlus className="h-4 w-4" /> Adicionar imagens</button>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => addImages(event.target.files)} className="hidden" />
        </div>
        {allImages.length === 0 ? (
          <button type="button" onClick={() => imageInputRef.current?.click()} className="mt-5 flex w-full flex-col items-center rounded-xl border-2 border-dashed border-gray-300 p-8 text-gray-500 transition hover:border-pink-400 hover:bg-pink-50/50 dark:border-gray-600"><ImagePlus className="h-10 w-10" /><span className="mt-3 text-sm font-medium">Selecione fotos ou renders do STL</span><span className="mt-1 text-xs">JPG, PNG ou WebP · até 8 MB cada</span></button>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {allImages.map((image, position) => (
              <div key={`${image.kind}-${image.url}`} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={`Imagem ${position + 1} de ${name || 'produto STL'}`} className="h-full w-full object-cover" />
                {position === 0 && <span className="absolute left-2 top-2 rounded-full bg-pink-500 px-2 py-1 text-[10px] font-bold text-white">Capa</span>}
                <button type="button" aria-label={`Remover imagem ${position + 1}`} onClick={() => image.kind === 'existing' ? setExistingImages((current) => current.filter((url) => url !== image.url)) : setImageFiles((current) => current.filter((_, index) => index !== image.index))} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-600 shadow hover:bg-white"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">03 · Informações</p><h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Dados para venda</h2></div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do produto *<input value={name} onChange={(event) => setName(event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" /></label>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="mt-1 w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$) *<input type="number" step="0.01" min="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" /></label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria<ProductCategorySelect value={category} onChange={setCategory} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" /></label>
        </div>
        {canChangeProductStatus && <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" /> Produto ativo e visível na loja</label>}
      </section>

      <ProductLivePreview
        name={name}
        description={description}
        category={category}
        basePrice={Number(price) || 0}
        images={allImages.map((image) => image.url)}
        type="digital"
        active={active}
      />

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg disabled:opacity-50">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}{loading ? 'Salvando...' : mode === 'edit' ? 'Salvar alterações' : 'Criar produto STL'}</button>
        <Link href={product ? `/dashboard/products/${product.id}` : '/dashboard/products'} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Cancelar</Link>
      </div>
    </form>
  );
}
