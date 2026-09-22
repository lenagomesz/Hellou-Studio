'use client';

import { useEffect, useState } from 'react';
import { FALLBACK_PRODUCT_COLOR_PRESET, normalizePresetItems, type ProductColorPreset } from '@/lib/product-color-presets';

export function useColorPresets() {
  const [presets, setPresets] = useState<ProductColorPreset[]>([FALLBACK_PRODUCT_COLOR_PRESET]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch('/api/admin/product-option-color-presets')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load color presets');
        const data = await response.json() as { presets?: ProductColorPreset[] };
        return (data.presets ?? []).map((preset) => ({ ...preset, items: normalizePresetItems(preset.items ?? []) }));
      })
      .then((data) => {
        if (active && data.length > 0) setPresets(data);
      })
      .catch(() => {
        // The local fallback keeps product editing usable until the migration is applied.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { presets, loading };
}
