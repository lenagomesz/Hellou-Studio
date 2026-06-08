import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Coupon } from '@/types/database';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const subtotal = typeof body.subtotal === 'number' ? body.subtotal : 0;

    if (!code) {
      return NextResponse.json({ error: 'Informe o código do cupom.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Cupom inválido ou expirado.' }, { status: 400 });
    }

    const coupon = data as Coupon;

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Este cupom expirou.' }, { status: 400 });
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ error: 'Este cupom atingiu o limite de usos.' }, { status: 400 });
    }

    if (subtotal < coupon.min_purchase) {
      return NextResponse.json(
        { error: `Compra mínima de R$${coupon.min_purchase.toFixed(2)} para este cupom.` },
        { status: 400 },
      );
    }

    let discount: number;
    let description: string;

    if (coupon.discount_value === 0) {
      discount = 0;
      description = coupon.free_shipping ? 'Frete grátis' : 'Cupom aplicado';
    } else if (coupon.discount_type === 'percent') {
      discount = subtotal * (coupon.discount_value / 100);
      description = `${coupon.discount_value}% de desconto`;
    } else {
      discount = Math.min(coupon.discount_value, subtotal);
      description = `R$${coupon.discount_value.toFixed(2)} de desconto`;
    }

    if (coupon.free_shipping && discount > 0) {
      description += ' + frete grátis';
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: Math.round(discount * 100) / 100,
      free_shipping: coupon.free_shipping,
      description,
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao validar cupom.' }, { status: 500 });
  }
}
