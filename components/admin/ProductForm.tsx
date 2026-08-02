'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { Product, ProductOption } from '@/types/database';
import { ProductCategorySelect } from '@/components/admin/ProductCategorySelect';
import { ProductLivePreview } from '@/components/admin/ProductLivePreview';
import { ProductTagSelect, replaceProductTags } from '@/components/admin/ProductTagSelect';
import { OptionsManager } from '@/components/admin/OptionsManager';
import { ImageUploadField } from '@/components/admin/ImageUploadField';
import { CustomizationSectionsEditor } from '@/components/admin/CustomizationSectionsEditor';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ArrowDown, ArrowUp, CheckCircle2, Loader2, Upload } from 'lucide-react';
import {
  DEFAULT_CUSTOMIZATION_COPY,
  type ProductCustomizationSection,
} from '@/lib/product-customization';

type ProductFormProps =
  | { mode: 'create'; product?: undefined }
  | { mode: 'edit'; product: Product; productOptions?: ProductOption[] };

type DraftOption = {
  id: string;
  name: string;
  dimensions: string;
  notes: string;
  color: string;
  priceModifier: string;
  stock: string;
  imageUrl: string;
};

function createDraftOption(): DraftOption {
  return { id: crypto.randomUUID(), name: '', dimensions: '', notes: '', color: '', priceModifier: '0', stock: '0', imageUrl: '' };
}

function moveDraftOption(options: DraftOption[], index: number, direction: -1 | 1) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= options.length) return options;
  const next = [...options];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
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
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [costPrice, setCostPrice] = useState(initial?.cost_price != null ? String(initial.cost_price) : '');
  const [weightGrams, setWeightGrams] = useState(initial?.weight_grams != null ? String(initial.weight_grams) : '');
  const [lengthCm, setLengthCm] = useState(initial?.length_cm != null ? String(initial.length_cm) : '');
  const [widthCm, setWidthCm] = useState(initial?.width_cm != null ? String(initial.width_cm) : '');
  const [heightCm, setHeightCm] = useState(initial?.height_cm != null ? String(initial.height_cm) : '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [seoTitle, setSeoTitle] = useState(initial?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(initial?.seo_description ?? '');
  const [images, setImages] = useState<string[]>(() => {
    const list: string[] = [];
    if (initial?.images && initial.images.length > 0) return initial.images;
    if (initial?.image_url) list.push(initial.image_url);
    return list;
  });
  const [newImageUrl, setNewImageUrl] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [fulfillmentMode, setFulfillmentMode] = useState<'made_to_order' | 'ready_stock' | 'hybrid'>(initial?.fulfillment_mode ?? 'made_to_order');
  const [isWholesale, setIsWholesale] = useState(initial?.is_wholesale ?? false);
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState(String(initial?.minimum_order_quantity && initial.minimum_order_quantity > 1 ? initial.minimum_order_quantity : 10));
  const [isCustomizable, setIsCustomizable] = useState(initial?.is_customizable ?? false);
  const [customizationQuestion, setCustomizationQuestion] = useState(
    initial?.customization_question ?? DEFAULT_CUSTOMIZATION_COPY.question,
  );
  const [customizationHelpText, setCustomizationHelpText] = useState(
    initial?.customization_help_text ?? DEFAULT_CUSTOMIZATION_COPY.helpText,
  );
  const [customizationPlaceholder, setCustomizationPlaceholder] = useState(
    initial?.customization_placeholder ?? DEFAULT_CUSTOMIZATION_COPY.placeholder,
  );
  const [customizationSections, setCustomizationSections] = useState<ProductCustomizationSection[]>(
    () => initial?.customization_sections ?? [],
  );
  const [options, setOptions] = useState<DraftOption[]>(() => props.mode === 'create' ? [createDraftOption()] : []);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function uploadImages(files: FileList | File[]) {
    const selected = Array.from(files);
    if (selected.length === 0) return;
    if (images.length + selected.length > 6) {
      setError('Você pode cadastrar até 6 imagens por produto');
      return;
    }

    setError(null);
    setUploadingImages(true);
    try {
      const formData = new FormData();
      selected.forEach((file) => formData.append('images', file));
      const response = await fetch('/api/upload/product-images', { method: 'POST', body: formData });
      const data = (await response.json().catch(() => ({}))) as { urls?: string[]; error?: string };
      if (!response.ok || !data.urls) throw new Error(data.error ?? 'Não foi possível enviar as imagens');
      setImages((current) => [...current, ...data.urls!]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Erro ao enviar imagens');
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const priceNumber = Number(basePrice);
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    if (isCustomizable && !customizationQuestion.trim()) {
      setError('Escreva a pergunta de personalização exibida ao cliente');
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
    const costNumber = costPrice ? Number(costPrice) : null;
    const logisticsNumbers = [weightGrams, lengthCm, widthCm, heightCm].filter(Boolean).map(Number);
    if ((costNumber !== null && (!Number.isFinite(costNumber) || costNumber < 0)) || logisticsNumbers.some((value) => !Number.isFinite(value) || value <= 0)) {
      setError('Custo, peso e dimensões devem ser números maiores que zero');
      return;
    }

    const normalizedOptions = options
      .filter((option) => option.name.trim() || option.color.trim())
      .map((option, index) => ({
        name: option.name.trim(),
        dimensions: option.dimensions.trim() || null,
        notes: option.notes.trim() || null,
        color: option.color || null,
        price_modifier: Number(option.priceModifier || 0),
        stock: Number(option.stock || 0),
        image_url: option.imageUrl || null,
        sort_order: index * 10,
      }));
    if (normalizedOptions.some((option) => Number.isNaN(option.price_modifier) || Number.isNaN(option.stock) || option.stock < 0 || !Number.isInteger(option.stock))) {
      setError('Revise o preço adicional e o estoque das variações');
      return;
    }

    const minimumOrderQuantityNumber = Number(minimumOrderQuantity);
    if (isWholesale && (!Number.isInteger(minimumOrderQuantityNumber) || minimumOrderQuantityNumber < 2 || minimumOrderQuantityNumber > 999)) {
      setError('Informe uma quantidade mínima entre 2 e 999 unidades');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      is_wholesale: isWholesale,
      minimum_order_quantity: isWholesale ? minimumOrderQuantityNumber : 1,
      base_price: priceNumber,
      sale_price: salePriceNumber,
      sku: sku.trim() || null,
      cost_price: costPrice ? Number(costPrice) : null,
      weight_grams: weightGrams ? Number(weightGrams) : null,
      length_cm: lengthCm ? Number(lengthCm) : null,
      width_cm: widthCm ? Number(widthCm) : null,
      height_cm: heightCm ? Number(heightCm) : null,
      slug: slug.trim() || null,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
      image_url: images[0] || null,
      images: images.length > 0 ? images : null,
      ...(canChangeProductStatus ? { active } : props.mode === 'create' ? { active: true } : {}),
      fulfillment_mode: fulfillmentMode,
      is_customizable: isCustomizable,
      customization_question: customizationQuestion.trim() || null,
      customization_help_text: customizationHelpText.trim(),
      customization_placeholder: customizationPlaceholder.trim(),
      customization_sections: customizationSections,
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
    if (props.mode === 'create') {
      router.push(`/dashboard/products/${productId}/edit`);
      router.refresh();
      return;
    }

    setSuccess('Alterações salvas. O produto já foi atualizado na loja.');
    setSubmitting(false);
    router.refresh();
  }

  async function handleDelete() {
    if (props.mode !== 'edit') return;
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
      {success && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> {success}
        </div>
      )}

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_460px]">
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

        <div className={`rounded-2xl border p-4 transition ${isWholesale ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-500/10' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'}`}>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={isWholesale} onChange={(event) => setIsWholesale(event.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
            <span>
              <span className="block text-sm font-bold text-gray-900 dark:text-white">Disponível para lojistas?</span>
              <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">O produto mantém sua categoria normal e também aparece na seção “Para lojistas”.</span>
            </span>
          </label>
          {isWholesale && (
            <label className="mt-4 block max-w-xs">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Pedido mínimo (unidades)</span>
              <input type="number" min={2} max={999} step={1} required value={minimumOrderQuantity} onChange={(event) => setMinimumOrderQuantity(event.target.value)} className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-orange-900 dark:bg-gray-900 dark:text-white" />
              <span className="mt-1 block text-xs text-gray-500">Exemplo: 10 significa pedido mínimo de 10 unidades.</span>
            </label>
          )}
        </div>

        <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${isCustomizable ? 'border-pink-300 bg-pink-50 dark:border-pink-800 dark:bg-pink-500/10' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'}`}>
          <input type="checkbox" checked={isCustomizable} onChange={(event) => setIsCustomizable(event.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
          <span>
            <span className="block text-sm font-bold text-gray-900 dark:text-white">Produto personalizado?</span>
            <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">Se marcado, o cliente deverá escrever a personalização desejada antes de adicionar o produto ao carrinho.</span>
          </span>
        </label>

        {isCustomizable && (
          <section className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50/80 to-orange-50/60 p-4 dark:border-pink-900/50 dark:from-pink-950/20 dark:to-orange-950/10 sm:p-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Texto para o cliente</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Como pedir a personalização</h2>
              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">Defina estes textos antes de criar o produto e altere quando quiser na edição.</p>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Pergunta exibida ao cliente *</span>
                <input
                  value={customizationQuestion}
                  onChange={(event) => setCustomizationQuestion(event.target.value)}
                  maxLength={120}
                  required
                  placeholder={DEFAULT_CUSTOMIZATION_COPY.question}
                  className="mt-1 w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm dark:border-pink-900 dark:bg-gray-900"
                />
                <span className="mt-1 block text-right text-[11px] text-gray-400">{customizationQuestion.length}/120</span>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Orientação abaixo da pergunta</span>
                <textarea
                  value={customizationHelpText}
                  onChange={(event) => setCustomizationHelpText(event.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder={DEFAULT_CUSTOMIZATION_COPY.helpText}
                  className="mt-1 w-full resize-none rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm dark:border-pink-900 dark:bg-gray-900"
                />
                <span className="mt-1 block text-right text-[11px] text-gray-400">{customizationHelpText.length}/300</span>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Exemplo dentro do campo</span>
                <input
                  value={customizationPlaceholder}
                  onChange={(event) => setCustomizationPlaceholder(event.target.value)}
                  maxLength={180}
                  placeholder={DEFAULT_CUSTOMIZATION_COPY.placeholder}
                  className="mt-1 w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm dark:border-pink-900 dark:bg-gray-900"
                />
                <span className="mt-1 block text-right text-[11px] text-gray-400">{customizationPlaceholder.length}/180</span>
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-pink-100 bg-white p-3 dark:border-pink-900/60 dark:bg-gray-900">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Prévia para o cliente</p>
              <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                {customizationQuestion || DEFAULT_CUSTOMIZATION_COPY.question} <span className="text-pink-600">*</span>
              </p>
              {customizationHelpText && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{customizationHelpText}</p>}
              <div className="mt-2 rounded-lg border border-pink-100 px-3 py-2 text-sm text-gray-400 dark:border-pink-900/60">
                {customizationPlaceholder || 'Campo sem exemplo'}
              </div>
            </div>
          </section>
        )}

        {isCustomizable && (
          <CustomizationSectionsEditor value={customizationSections} onChange={setCustomizationSections} />
        )}

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

        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-gray-700 dark:bg-gray-800/40 sm:p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Dados profissionais</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Custo, logística e identificação</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">Esses dados ajudam a calcular margem, frete e organizar o catálogo. Não são exibidos ao cliente.</p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label><span className="text-xs font-medium text-gray-600 dark:text-gray-300">SKU</span><input value={sku} maxLength={80} onChange={(event) => setSku(event.target.value.toUpperCase())} placeholder="Ex.: CHV-BALM-ROSA" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm uppercase dark:border-gray-700 dark:bg-gray-800" /></label>
            <label><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Custo unitário (R$)</span><input type="number" min="0" step="0.01" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
            <label><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Peso embalado (g)</span><input type="number" min="1" step="1" value={weightGrams} onChange={(event) => setWeightGrams(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
            <label><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Comprimento (cm)</span><input type="number" min="0.01" step="0.01" value={lengthCm} onChange={(event) => setLengthCm(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
            <label><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Largura (cm)</span><input type="number" min="0.01" step="0.01" value={widthCm} onChange={(event) => setWidthCm(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
            <label><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Altura (cm)</span><input type="number" min="0.01" step="0.01" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
          </div>
          {costPrice && basePrice && Number(basePrice) > 0 && (
            <p className="mt-3 text-xs font-semibold text-emerald-700">Margem bruta estimada: {Math.round(((Number(basePrice) - Number(costPrice)) / Number(basePrice)) * 100)}%</p>
          )}
        </section>

        <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 dark:border-violet-900/40 dark:bg-violet-950/10 sm:p-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">Descoberta</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">SEO do produto</h2></div>
          <div className="mt-4 space-y-4">
            <label className="block"><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Slug da URL</span><input value={slug} maxLength={120} onChange={(event) => setSlug(event.target.value)} placeholder="chaveiro-porta-lip-balm" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /><span className="mt-1 block text-[11px] text-gray-400">Será preparado para URLs amigáveis; o link atual por ID continua funcionando.</span></label>
            <label className="block"><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Título para Google</span><input value={seoTitle} maxLength={70} onChange={(event) => setSeoTitle(event.target.value)} placeholder={name || 'Nome do produto'} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /><span className="mt-1 block text-right text-[11px] text-gray-400">{seoTitle.length}/70</span></label>
            <label className="block"><span className="text-xs font-medium text-gray-600 dark:text-gray-300">Descrição para Google</span><textarea value={seoDescription} maxLength={180} rows={3} onChange={(event) => setSeoDescription(event.target.value)} placeholder={description || 'Descrição resumida do produto'} className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" /><span className="mt-1 block text-right text-[11px] text-gray-400">{seoDescription.length}/180</span></label>
          </div>
        </section>

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
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-gray-500">Variação {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setOptions((current) => moveDraftOption(current, index, -1))} disabled={index === 0} aria-label={`Mover variação ${index + 1} para cima`} title="Mover para cima" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setOptions((current) => moveDraftOption(current, index, 1))} disabled={index === options.length - 1} aria-label={`Mover variação ${index + 1} para baixo`} title="Mover para baixo" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setOptions((current) => current.filter((item) => item.id !== option.id))} className="ml-1 text-xs font-semibold text-red-500 hover:text-red-700">Remover</button>
                    </div>
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
                  <div className="mt-3 sm:max-w-sm">
                    <ImageUploadField
                      compact
                      label="Foto específica desta variação (opcional)"
                      value={option.imageUrl}
                      onChange={(imageUrl) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, imageUrl } : item))}
                    />
                  </div>
                  <label className="mt-3 block">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Observação <span className="font-normal text-gray-400">(opcional)</span></span>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={option.notes}
                      onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, notes: event.target.value } : item))}
                      placeholder="Ex.: acabamento fosco; prazo adicional de 2 dias"
                      className="mt-1 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    />
                  </label>
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
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setImageDragOver(true); }}
            onDragLeave={() => setImageDragOver(false)}
            onDrop={(event) => { event.preventDefault(); setImageDragOver(false); void uploadImages(event.dataTransfer.files); }}
            disabled={uploadingImages || images.length >= 6}
            className={`mb-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition ${imageDragOver ? 'border-pink-500 bg-pink-50' : 'border-gray-300 bg-gray-50/60 hover:border-pink-400 hover:bg-pink-50/50 dark:border-gray-700 dark:bg-gray-800/40'} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {uploadingImages ? <Loader2 className="h-8 w-8 animate-spin text-pink-500" /> : <Upload className="h-8 w-8 text-pink-500" />}
            <span className="mt-2 text-sm font-bold text-gray-800 dark:text-white">{uploadingImages ? 'Enviando imagens...' : 'Arraste imagens aqui ou clique para escolher'}</span>
            <span className="mt-1 text-xs text-gray-500">JPG, PNG ou WebP · máximo de 6 imagens · 8 MB cada · armazenamento automático</span>
          </button>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => event.target.files && void uploadImages(event.target.files)} className="hidden" />
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
              placeholder="Ou cole uma URL de imagem..."
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
            A primeira imagem será usada como capa. As imagens enviadas ficam no bucket products do Supabase.
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

        <aside className="space-y-4 2xl:sticky 2xl:top-6">
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
              ? (props.productOptions ?? []).map((option) => ({ id: option.id, name: option.name, color: option.color, priceModifier: option.price_modifier }))
              : options.filter((option) => option.name.trim() || option.color.trim()).map((option) => ({ id: option.id, name: option.name, color: option.color || null, priceModifier: Number(option.priceModifier) || 0 }))}
          />
          <div className="rounded-2xl border border-pink-100 bg-pink-50/70 p-4 text-xs leading-5 text-slate-600 dark:border-pink-900/40 dark:bg-pink-500/10 dark:text-slate-300">
            O preview acompanha nome, preço, capa, categoria e variações em tempo real. Salve para publicar as alterações na loja.
          </div>
        </aside>
      </div>

      {props.mode === 'edit' && (
        <section className="rounded-[26px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">02 · Variações</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Tamanhos, cores e adicionais</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            O nome é opcional quando uma cor for escolhida. Nesse caso, o cliente verá somente a bolinha da cor.
          </p>
          <div className="mt-5">
            <OptionsManager
              productId={props.product.id}
              initialOptions={props.productOptions ?? []}
              basePrice={Number(salePrice) || Number(basePrice) || 0}
            />
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting || uploadingImages}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-pink-600 disabled:opacity-50 transition dark:bg-white dark:text-slate-950"
          >
            {uploadingImages ? 'Enviando imagens...' : submitting ? 'Salvando...' : props.mode === 'edit' ? 'Salvar alterações' : 'Criar produto'}
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
            onClick={() => setConfirmDelete(true)}
            disabled={submitting}
            className="rounded-lg border border-red-300 dark:border-red-700 px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 transition"
          >
            Excluir produto
          </button>
        )}
      </div>
      <ConfirmDialog open={confirmDelete} title="Excluir produto?" description={`“${name}” será removido da loja permanentemente, junto com suas variações.`} confirmLabel="Excluir" busy={submitting} onCancel={() => setConfirmDelete(false)} onConfirm={handleDelete} />
    </form>
  );
}
