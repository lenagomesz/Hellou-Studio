import type { SupabaseClient } from '@supabase/supabase-js';
import type { Coupon } from '@/types/database';

export const SUCCESSFUL_ORDER_STATUSES = ['approved', 'paid', 'processing', 'completed', 'shipped', 'delivered'] as const;

export function calculateCheckoutTotals(params: {
  subtotal: number;
  shippingCost: number;
  isFirstPurchase: boolean;
  couponDiscountAmount?: number;
  hasCoupon: boolean;
}) {
  const subtotal = Math.max(0, params.subtotal);
  const couponDiscount = Math.min(Math.max(0, params.couponDiscountAmount ?? 0), subtotal);
  const firstPurchaseDiscount = params.isFirstPurchase && !params.hasCoupon
    ? Math.round(subtotal * 0.1 * 100) / 100
    : 0;
  const total = Math.round(Math.max(0, subtotal - couponDiscount - firstPurchaseDiscount + Math.max(0, params.shippingCost)) * 100) / 100;
  return { subtotal, couponDiscount, firstPurchaseDiscount, total };
}

export type ValidatedCoupon = {
  coupon: Coupon;
  discountAmount: number;
};

export type CouponValidationResult =
  | { valid: true; value: ValidatedCoupon }
  | { valid: false; error: string };

export async function validateCheckoutCoupon(
  admin: SupabaseClient,
  code: string | undefined,
  subtotal: number,
  userId: string,
): Promise<CouponValidationResult | null> {
  const normalizedCode = code?.trim().toUpperCase();
  if (!normalizedCode) return null;

  const { data, error } = await admin
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) return { valid: false, error: 'Cupom inválido ou inativo.' };

  const coupon = data as Coupon;
  if (coupon.discount_value < 0 || (coupon.discount_type === 'percent' && coupon.discount_value > 100)) {
    return { valid: false, error: 'Este cupom possui uma configuração inválida.' };
  }
  if (coupon.exclusive_user_id && coupon.exclusive_user_id !== userId) {
    return { valid: false, error: 'Este cupom é exclusivo para outro cliente.' };
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return { valid: false, error: 'Este cupom expirou.' };
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: 'Este cupom atingiu o limite de usos.' };
  }
  if (subtotal < coupon.min_purchase) {
    return {
      valid: false,
      error: `Compra mínima de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(coupon.min_purchase)} para este cupom.`,
    };
  }

  const rawDiscount = coupon.discount_value <= 0
    ? 0
    : coupon.discount_type === 'percent'
      ? subtotal * (coupon.discount_value / 100)
      : coupon.discount_value;

  return {
    valid: true,
    value: {
      coupon,
      discountAmount: Math.round(Math.min(rawDiscount, subtotal) * 100) / 100,
    },
  };
}
