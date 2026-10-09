import { NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const admin = getSupabaseAdmin();
  const products: Array<{ id: string; name: string; active: boolean; is_customizable: boolean; customization_sections: unknown }> = [];
  const links: Array<{ product_id: string; step_id: string; active: boolean; sort_order: number }> = [];

  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin.from('products')
      .select('id,name,active,is_customizable,customization_sections')
      .order('name').range(offset, offset + 499);
    if (error) return serverError('Erro ao carregar produtos para acompanhamento');
    products.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) break;
  }
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin.from('product_customization_steps')
      .select('product_id,step_id,active,sort_order')
      .order('product_id').order('step_id').range(offset, offset + 499);
    if (error) return serverError('Erro ao carregar vínculos das etapas');
    links.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) break;
  }

  const byProduct = new Map<string, typeof links>();
  for (const link of links) byProduct.set(link.product_id, [...(byProduct.get(link.product_id) ?? []), link]);
  return NextResponse.json({ products: products.map((product) => {
    const localSteps = (Array.isArray(product.customization_sections) ? product.customization_sections : [])
      .map((section: { label?: unknown }) => typeof section.label === 'string' ? section.label : 'Etapa sem título');
    const productLinks = byProduct.get(product.id) ?? [];
    return {
      id: product.id, name: product.name, active: product.active,
      isCustomizable: product.is_customizable || localSteps.length > 0 || productLinks.length > 0,
      localSteps, links: productLinks,
    };
  }) });
}
