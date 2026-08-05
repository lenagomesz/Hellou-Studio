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
            Será preparado para URLs amigáveis; o link atual por ID continua funcionando.
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
