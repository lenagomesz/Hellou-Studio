'use client';

import { Download, Eye, ImageIcon, Package, ShoppingCart } from 'lucide-react';
import { useProductCategories } from '@/components/admin/ProductCategorySelect';

type PreviewOption = {
  id: string;
  name: string;
  priceModifier: number;
};

type Props = {
  name: string;
  description: string;
  category: string;
  basePrice: number;
  salePrice?: number | null;
  images: string[];
  type: 'physical' | 'digital';
  active: boolean;
  options?: PreviewOption[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function ProductLivePreview({
  name,
  description,
  category,
  basePrice,
  salePrice,
  images,
  type,
  active,
  options = [],
}: Props) {
  const categories = useProductCategories();
  const categoryName = categories.find((item) => item.slug === category)?.name ?? category;
  const validBasePrice = Number.isFinite(basePrice) ? basePrice : 0;
  const validSalePrice = salePrice !== null && salePrice !== undefined && Number.isFinite(salePrice) ? salePrice : null;
  const displayedPrice = validSalePrice ?? validBasePrice;

  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-pink-500" />
          <div><p className="text-sm font-bold text-slate-900 dark:text-white">Preview da página do produto</p><p className="text-[11px] text-slate-500">Atualizado enquanto você preenche</p></div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{active ? 'Visível' : 'Inativo'}</span>
      </div>

      <div className="grid gap-0 bg-white dark:bg-slate-900 md:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800 md:border-b-0 md:border-r">
          <div className="aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-orange-50 dark:from-slate-800 dark:to-slate-700">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0]} alt={name || 'Preview do produto'} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-slate-400"><ImageIcon className="h-12 w-12" /><span className="mt-3 text-xs">A imagem de capa aparecerá aqui</span></div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-hidden">
              {images.slice(0, 4).map((image, index) => (
                <div key={`${image}-${index}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt={`Miniatura ${index + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
              {images.length > 4 && <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">+{images.length - 4}</span>}
            </div>
          )}
        </div>

        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-pink-600">{categoryName || 'Categoria'}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">{type === 'digital' ? 'Arquivo STL' : 'Produto físico'}</span>
          </div>
          <h3 className="mt-4 text-2xl font-black leading-tight text-slate-950 dark:text-white">{name.trim() || 'Nome do produto'}</h3>
          <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{description.trim() || 'A descrição do produto aparecerá neste espaço.'}</p>

          <div className="mt-6">
            {validSalePrice !== null && validSalePrice < validBasePrice && <p className="text-sm text-slate-400 line-through">{formatPrice(validBasePrice)}</p>}
            <p className="text-3xl font-black text-slate-950 dark:text-white">{formatPrice(displayedPrice)}</p>
            {type === 'digital' && <p className="mt-1 text-xs font-medium text-green-600">Download disponibilizado após a confirmação do pagamento</p>}
          </div>

          {type === 'physical' && options.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Variações</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {options.slice(0, 6).map((option) => <span key={option.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{option.name || 'Variação'}{option.priceModifier !== 0 ? ` · ${option.priceModifier > 0 ? '+' : '−'} ${formatPrice(Math.abs(option.priceModifier))}` : ''}</span>)}
              </div>
            </div>
          )}

          <button type="button" disabled className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white opacity-90 dark:bg-white dark:text-slate-950">
            {type === 'digital' ? <Download className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            {type === 'digital' ? 'Comprar arquivo STL' : 'Adicionar ao carrinho'}
          </button>
          {type === 'physical' && <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400"><Package className="h-3.5 w-3.5" /> Prazo e frete calculados no checkout</p>}
        </div>
      </div>
    </section>
  );
}
