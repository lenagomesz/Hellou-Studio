-- A loja trabalha sob encomenda: o checkout não controla estoque.
-- Remove apenas a baixa de estoque de finalize_checkout_order. Assinatura,
-- idempotência, carrinho e contagem de cupom permanecem idênticos.
-- p_consume_inventory continua existindo (agora só dispara o efeito do cupom)
-- para manter compatibilidade com o código já publicado.

CREATE OR REPLACE FUNCTION public.finalize_checkout_order(
  p_order_id uuid,
  p_user_id uuid,
  p_mp_payment_id text,
  p_mp_status text,
  p_order_status text,
  p_consume_inventory boolean DEFAULT false
)
RETURNS TABLE(order_id uuid, effects_applied boolean, state_changed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_apply_effects boolean := false;
  v_state_changed boolean := false;
BEGIN
  SELECT orders.* INTO v_order
  FROM public.orders AS orders
  WHERE orders.id = p_order_id AND orders.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado para esta conta.';
  END IF;

  IF v_order.mp_payment_id IS NOT NULL
     AND v_order.mp_payment_id IS DISTINCT FROM p_mp_payment_id THEN
    RAISE EXCEPTION 'O pedido já está associado a outro pagamento.';
  END IF;

  v_state_changed := v_order.status::text IS DISTINCT FROM p_order_status;

  UPDATE public.orders AS orders
  SET
    mp_payment_id = p_mp_payment_id,
    mp_status = p_mp_status,
    status = p_order_status::order_status,
    checkout_state = CASE
      WHEN p_order_status IN ('approved', 'paid', 'processing', 'completed', 'shipped', 'delivered') THEN 'completed'
      WHEN p_order_status IN ('rejected', 'canceled', 'refunded') THEN 'failed'
      ELSE 'pending'
    END,
    checkout_finalized_at = now(),
    updated_at = now()
  WHERE orders.id = p_order_id;

  IF p_mp_status IS DISTINCT FROM 'rejected' THEN
    DELETE FROM public.cart_items AS cart
    WHERE cart.user_id = p_user_id;

    UPDATE public.cart_recovery_events AS recovery
    SET status = 'converted', converted_at = now()
    WHERE recovery.user_id = p_user_id AND recovery.status = 'sent';
  END IF;

  IF p_consume_inventory
     AND v_order.checkout_coupon_id IS NOT NULL
     AND v_order.coupon_processed_at IS NULL THEN
    UPDATE public.coupons AS coupons
    SET used_count = COALESCE(coupons.used_count, 0) + 1
    WHERE coupons.id = v_order.checkout_coupon_id;

    UPDATE public.orders AS orders
    SET coupon_processed_at = now()
    WHERE orders.id = p_order_id;

    v_apply_effects := true;
  END IF;

  RETURN QUERY SELECT p_order_id, v_apply_effects, v_state_changed;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_checkout_order(uuid, uuid, text, text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_checkout_order(uuid, uuid, text, text, text, boolean)
  TO service_role;

COMMENT ON FUNCTION public.finalize_checkout_order(uuid, uuid, text, text, text, boolean) IS
  'Atualiza pagamento, carrinho e cupom numa única transação idempotente. Não controla estoque (loja sob encomenda).';

-- Reafirma RLS (idempotente), como nas migrações anteriores do checkout.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_recovery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
