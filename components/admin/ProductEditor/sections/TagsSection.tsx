'use client';

import { useCallback } from 'react';
import { useProductEditor } from '../hooks/useProductEditor';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { ProductTagSelect } from '@/components/admin/ProductTagSelect';

export function TagsSection() {
  const { state, dispatch } = useProductEditor();
  const changeTags = useCallback((tags: string[]) => dispatch({ type: 'SET_TAGS', tags }), [dispatch]);

  return (
    <CollapsibleSection
      title="Tags do produto"
      description={`${state.tags.length} tags`}
      validationStatus="idle"
    >
      <ProductTagSelect
        productId={state.mode === 'edit' ? state.productId || undefined : undefined}
        value={state.tags}
        onChange={changeTags}
      />
    </CollapsibleSection>
  );
}
