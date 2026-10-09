import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProductCustomizationSection } from '@/lib/product-customization';

export async function ensureCatalogColor(admin: SupabaseClient, name: string, hex: string) {
  const normalizedHex = hex.trim().toUpperCase();
  const { data: existing, error: lookupError } = await admin.from('catalog_colors')
    .select('id').eq('hex', normalizedHex).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing.id as string;
  const { data, error } = await admin.from('catalog_colors')
    .upsert({ name: name.trim(), hex: normalizedHex }, { onConflict: 'hex', ignoreDuplicates: true })
    .select('id').maybeSingle();
  if (error) throw error;
  if (data) return data.id as string;
  const { data: concurrent, error: concurrentError } = await admin.from('catalog_colors')
    .select('id').eq('hex', normalizedHex).single();
  if (concurrentError || !concurrent) throw concurrentError ?? new Error('Cor não encontrada');
  return concurrent.id as string;
}

export async function linkSectionColors(admin: SupabaseClient, section: ProductCustomizationSection) {
  return {
    ...section,
    colors: await Promise.all(section.colors.map(async (color) => {
      if (color.colorId) {
        const { data: linked, error: linkedError } = await admin.from('catalog_colors')
          .select('id,name,hex').eq('id', color.colorId).maybeSingle();
        if (linkedError) throw linkedError;
        if (linked) return { ...color, colorId: linked.id, label: linked.name, value: linked.hex };
      }
      if (!/^#[0-9a-f]{6}$/i.test(color.value)) return color;
      const colorId = await ensureCatalogColor(admin, color.label, color.value);
      const { data, error } = await admin.from('catalog_colors').select('name,hex').eq('id', colorId).single();
      if (error || !data) throw error ?? new Error('Cor não encontrada');
      return { ...color, colorId, label: data.name, value: data.hex };
    })),
  };
}
