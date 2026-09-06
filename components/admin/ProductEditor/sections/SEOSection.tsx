'use client';

import { useProductEditor } from '../hooks/useProductEditor';
import { CollapsibleSection } from '../shared/CollapsibleSection';

export function SEOSection() {
  const { state, dispatch } = useProductEditor();

  const handleSetField = (field: keyof typeof state, value: unknown) => {
    dispatch({ type: 'SET_FIELD', field, value });
  };

  return (
    <CollapsibleSection
      title="Descoberta"
      description="SEO do produto"
      validationStatus="idle"
    >
      <div className="space-y-4">
        <p className="text-xs leading-5 text-gray-500">Campos vazios são preenchidos pela IA após salvar. Textos manuais existentes são preservados; textos gerados automaticamente acompanham as alterações do produto.</p>
        <label className="block">
          <span className="text-xs font-medium">Palavras-chave de busca (separadas por vírgula)</span>
          <input value={state.seoKeywords.join(', ')} onChange={e => handleSetField('seoKeywords', e.target.value.split(',').map(k => k.trimStart()))}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
        </label>
        {state.images.map((url, i) => <label key={url} className="block">
          <span className="text-xs font-medium">Texto alternativo — {i === 0 ? 'capa' : `imagem ${i + 1}`}</span>
          <input value={state.imageAltTexts[url] ?? ''} maxLength={180} placeholder="Descreva o que aparece nesta imagem"
            onChange={e => handleSetField('imageAltTexts', { ...state.imageAltTexts, [url]: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
        </label>)}
        <label className="block">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Slug da URL</span>
          <input
            value={state.slug}
            maxLength={120}
            onChange={(e) => handleSetField('slug', e.target.value)}
            placeholder="chaveiro-porta-lip-balm"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <span className="mt-1 block text-[11px] text-gray-400">
            Link público: /products/{state.slug || 'nome-do-produto'}. Se ficar vazio, o endereço será criado automaticamente a partir do nome.
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Título para Google</span>
          <input
            value={state.seoTitle}
            maxLength={70}
            onChange={(e) => handleSetField('seoTitle', e.target.value)}
            placeholder={state.name || 'Nome do produto'}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <span className="mt-1 block text-right text-[11px] text-gray-400">{state.seoTitle.length}/70</span>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Descrição para Google</span>
          <textarea
            value={state.seoDescription}
            maxLength={180}
            rows={3}
            onChange={(e) => handleSetField('seoDescription', e.target.value)}
            placeholder={state.description || 'Descrição resumida do produto'}
            className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <span className="mt-1 block text-right text-[11px] text-gray-400">{state.seoDescription.length}/180</span>
        </label>
      </div>
    </CollapsibleSection>
  );
}
