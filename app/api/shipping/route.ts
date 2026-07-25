import { NextResponse } from 'next/server';
import { calculateShipping, sanitizeCep } from '@/lib/shipping';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawCep = typeof body.cep === 'string' ? body.cep : '';
    const requestedItems = Array.isArray(body.items) ? body.items.slice(0, 50) as Array<{ product_id?: string; quantity?: number }> : [];

    if (!sanitizeCep(rawCep)) {
      return NextResponse.json(
        { error: 'CEP inválido. Informe 8 dígitos.' },
        { status: 400 },
      );
    }

    let shippingPackage;
    if (requestedItems.length > 0) {
      const quantities = new Map(requestedItems.filter((item) => typeof item.product_id === 'string').map((item) => [item.product_id!, Math.max(1, Math.min(50, Math.trunc(Number(item.quantity) || 1)))]));
      const productIds = [...quantities.keys()];
      const { data: products } = await getSupabaseAdmin().from('products').select('id, weight_grams, length_cm, width_cm, height_cm').in('id', productIds).eq('active', true);
      if ((products ?? []).length !== productIds.length) return NextResponse.json({ error: 'O carrinho contém um produto indisponível.' }, { status: 400 });
      const settings = await import('@/lib/store-settings').then((module) => module.getStoreSettings());
      shippingPackage = (products ?? []).reduce((pkg, product) => {
        const quantity = quantities.get(product.id) ?? 1;
        return {
          weightGrams: pkg.weightGrams + Number(product.weight_grams ?? settings.shipping.defaultWeightGrams) * quantity,
          lengthCm: Math.max(pkg.lengthCm, Number(product.length_cm ?? settings.shipping.defaultLengthCm)),
          widthCm: Math.max(pkg.widthCm, Number(product.width_cm ?? settings.shipping.defaultWidthCm)),
          heightCm: pkg.heightCm + Number(product.height_cm ?? settings.shipping.defaultHeightCm) * quantity,
        };
      }, { weightGrams: 0, lengthCm: 0, widthCm: 0, heightCm: 0 });
    }
    const result = await calculateShipping(rawCep, shippingPackage);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao calcular frete.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
