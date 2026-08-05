'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CheckCircle2 } from 'lucide-react';
import type { Product, ProductOption } from '@/types/database';
import { ProductEditorProvider, useProductEditor } from './ProductEditorContext';
import { createInitialEditorState } from './types/editor-state';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { PricingSection } from './sections/PricingSection';
import { ImagesSection } from './sections/ImagesSection';
import { VariationsSection } from './sections/VariationsSection';
import { SEOSection } from './sections/SEOSection';
import { TagsSection } from './sections/TagsSection';
import { ProductLivePreview } from '../ProductLivePreview';
import { OptionsManager } from '../OptionsManager';
import { ConfirmDialog } from '../ConfirmDialog';
import { replaceProductTags } from '@/components/admin/ProductTagSelect';

type ProductEditorProps =
  | { mode: 'create'; product?: undefined; productOptions?: undefined }
  | { mode: 'edit'; product: Product; productOptions?: ProductOption[] };

function ProductEditorContent({ mode, product, productOptions }: ProductEditorProps & { product?: Product; productOptions?: ProductOption[] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const canChangeProductStatus = session?.user?.accessLevel !== 'partner';
  const { state, dispatch } = useProductEditor();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!state.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    if (state.basePrice <= 0) {
      setError('Preço base inválido');
      return;
    }
    if (state.isCustomizable && !state.customizationQuestion.trim()) {
      setError('Escreva a pergunta de personalização exibida ao cliente');
      return;
    }

    setSubmitting(true);

    // Normalize variations
    const normalizedVariations = state.variations
      .filter((v: any) => v.name.trim() || v.color?.trim())
      .map((v: any, idx: number) => ({
        name: v.name.trim(),
        dimensions: v.dimensions?.trim() || null,
        notes: v.notes?.trim() || null,
        color: v.color || null,
        price_modifier: Number(v.priceModifier || 0),
        stock: Number(v.stock || 0),
        image_url: v.imageUrl || null,
        sort_order: idx * 10,
      }));

    const salePrice = state.salePrice && state.salePrice > 0 ? state.salePrice : null;
    const costPrice = state.costPrice && state.costPrice > 0 ? state.costPrice : null;

    const payload: any = {
      name: state.name.trim(),
      description: state.description.trim() || null,
      category: state.category,
      base_price: state.basePrice,
      sale_price: salePrice,
      sku: state.sku.trim() || null,
      cost_price: costPrice,
      weight_grams: state.weightGrams || null,
      length_cm: state.lengthCm || null,
      width_cm: state.widthCm || null,
      height_cm: state.heightCm || null,
      slug: state.slug.trim() || null,
      seo_title: state.seoTitle.trim() || null,
      seo_description: state.seoDescription.trim() || null,
      image_url: state.images[0] || null,
      images: state.images.length > 0 ? state.images : null,
      fulfillment_mode: state.fulfillmentMode,
      is_wholesale: state.isWholesale,
      minimum_order_quantity: state.isWholesale ? Math.max(2, Math.min(999, state.minimumOrderQuantity)) : 1,
      is_customizable: state.isCustomizable,
      customization_question: state.customizationQuestion.trim() || null,
      customization_help_text: state.customizationHelpText.trim() || null,
      customization_placeholder: state.customizationPlaceholder.trim() || null,
      customization_sections: state.customizationSections,
      ...(canChangeProductStatus ? { active: state.active } : mode === 'create' ? { active: true } : {}),
      ...(mode === 'create' ? { options: normalizedVariations } : {}),
    };

    const url = mode === 'create' ? '/api/products' : `/api/products/${product!.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Erro ao salvar');
      }

      const data = (await res.json()) as { product: Product };
      const productId = data.product?.id ?? (mode === 'edit' ? product!.id : '');

      // Save tags separately
      try {
        await replaceProductTags(productId, state.tags);
      } catch (tagError) {
        console.error('Tag save error:', tagError);
        // Continue anyway
      }

      if (mode === 'create') {
        router.push(`/dashboard/products/${productId}/edit`);
        router.refresh();
      } else {
        setSuccess('Alterações salvas. O produto já foi atualizado na loja.');
        setSubmitting(false);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit') return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/products/${product!.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Erro ao excluir');
      }
      router.push('/dashboard/products');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> {success}
        </div>
      )}

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="rounded-[26px] bg-white dark:bg-gray-900 p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-5 sm:p-8">
          <BasicInfoSection />
          <PricingSection />
          <ImagesSection />
          <VariationsSection />
          <SEOSection />
          <TagsSection />

          {canChangeProductStatus && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.active}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'active', value: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Produto ativo (visível na loja)</span>
            </label>
          )}
        </div>

        <aside className="space-y-4 2xl:sticky 2xl:top-6">
          <ProductLivePreview
            name={state.name}
            description={state.description}
            category={state.category}
            basePrice={state.basePrice}
            salePrice={state.salePrice}
            images={state.images}
            type="physical"
            active={state.active}
            compact
            options={
              mode === 'edit' && productOptions
                ? productOptions.map((opt) => ({
                    id: opt.id,
                    name: opt.name,
                    color: opt.color,
                    priceModifier: opt.price_modifier,
                  }))
                : state.variations
                    .filter((v: any) => v.name.trim() || v.color?.trim())
                    .map((v: any) => ({
                      id: v.id,
                      name: v.name,
                      color: v.color || null,
                      priceModifier: Number(v.priceModifier) || 0,
                    }))
            }
          />
          <div className="rounded-2xl border border-pink-100 bg-pink-50/70 p-4 text-xs leading-5 text-slate-600 dark:border-pink-900/40 dark:bg-pink-500/10 dark:text-slate-300">
            O preview acompanha nome, preço, capa, categoria e variações em tempo real. Salve para publicar as alterações na loja.
          </div>
        </aside>
      </div>

      {mode === 'edit' && (
        <section className="rounded-[26px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">02 · Variações</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Tamanhos, cores e adicionais</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            O nome é opcional quando uma cor for escolhida. Nesse caso, o cliente verá somente a bolinha da cor.
          </p>
          <div className="mt-5">
            <OptionsManager
              productId={product!.id}
              initialOptions={productOptions ?? []}
              basePrice={state.salePrice || state.basePrice || 0}
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
            disabled={submitting}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-pink-600 disabled:opacity-50 transition dark:bg-white dark:text-slate-950"
          >
            {submitting ? 'Salvando...' : mode === 'edit' ? 'Salvar alterações' : 'Criar produto'}
          </button>
          <Link
            href={mode === 'edit' ? `/dashboard/products/${product!.id}` : '/dashboard/products'}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancelar
          </Link>
        </div>

        {mode === 'edit' && (
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

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir produto?"
        description={`"${state.name}" será removido da loja permanentemente, junto com suas variações.`}
        confirmLabel="Excluir"
        busy={submitting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </form>
  );
}

export function ProductEditor(props: ProductEditorProps) {
  const initialState = createInitialEditorState(
    props.mode,
    props.mode === 'edit' && props.product
      ? {
          productId: props.product.id,
          name: props.product.name,
          description: props.product.description || '',
          category: props.product.category,
          basePrice: props.product.base_price,
          salePrice: props.product.sale_price,
          costPrice: props.product.cost_price || null,
          sku: props.product.sku || '',
          fulfillmentMode: (props.product.fulfillment_mode as any) || 'made_to_order',
          isWholesale: props.product.is_wholesale,
          minimumOrderQuantity: props.product.minimum_order_quantity || 1,
          isCustomizable: props.product.is_customizable,
          customizationQuestion: props.product.customization_question || '',
          customizationHelpText: props.product.customization_help_text || '',
          customizationPlaceholder: props.product.customization_placeholder || '',
          customizationSections: props.product.customization_sections || [],
          images: props.product.images || (props.product.image_url ? [props.product.image_url] : []),
          active: props.product.active,
          seoTitle: props.product.seo_title || '',
          seoDescription: props.product.seo_description || '',
          slug: props.product.slug || '',
          tags: props.product.tags?.map(t => t.id) || [],
        }
      : undefined,
  );

  return (
    <ProductEditorProvider initialState={initialState}>
      <ProductEditorContent {...props} />
    </ProductEditorProvider>
  );
}
