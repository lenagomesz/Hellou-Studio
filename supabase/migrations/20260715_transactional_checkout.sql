-- Checkout idempotente e transacional para pagamentos do Mercado Pago.

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS checkout_payload_hash text,
  ADD COLUMN IF NOT EXISTS checkout_state text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS checkout_finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS inventory_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS coupon_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_idempotency_key_uidx
  ON public.orders(checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_checkout_state_idx
  ON public.orders(checkout_state, created_at DESC);

CREATE OR REPLACE FUNCTION public.prepare_checkout_order(
  p_user_id uuid,
  p_idempotency_key uuid,
  p_payload_hash text,
  p_total numeric,
  p_shipping_address jsonb,
  p_payment_method text,
  p_coupon_id uuid,
  p_items jsonb
)
RETURNS TABLE(order_id uuid, reused boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_existing_hash text;
BEGIN
  IF p_total < 0.01 THEN
    RAISE EXCEPTION 'O total do pedido deve ser maior que zero.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'O pedido precisa ter pelo menos um item.';
  END IF;

  INSERT INTO public.orders (
    user_id,
    status,
    total,
    shipping_address,
    payment_provider,
    mp_payment_method,
    checkout_idempotency_key,
    checkout_payload_hash,
    checkout_state,
    checkout_coupon_id
  )
  VALUES (
    p_user_id,
    'awaiting_payment',
    p_total,
    p_shipping_address,
    'mercadopago',
    p_payment_method,
    p_idempotency_key,
    p_payload_hash,
    'prepared',
    p_coupon_id
  )
  ON CONFLICT (checkout_idempotency_key) WHERE checkout_idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_order_id;

  IF v_order_id IS NULL THEN
    SELECT id, checkout_payload_hash
      INTO v_order_id, v_existing_hash
    FROM public.orders
    WHERE checkout_idempotency_key = p_idempotency_key
      AND user_id = p_user_id;

    IF v_order_id IS NULL THEN
      RAISE EXCEPTION 'A chave desta tentativa já pertence a outro checkout.';
    END IF;

    IF v_existing_hash IS DISTINCT FROM p_payload_hash THEN
      RAISE EXCEPTION 'A tentativa de pagamento foi reutilizada com dados diferentes.';
    END IF;

    RETURN QUERY SELECT v_order_id, true;
    RETURN;
  END IF;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_option_id,
    quantity,
    unit_price,
    customization_text,
    product_snapshot
  )
  SELECT
    v_order_id,
    (item->>'product_id')::uuid,
    NULLIF(item->>'product_option_id', '')::uuid,
    (item->>'quantity')::integer,
    (item->>'unit_price')::numeric,
    NULLIF(item->>'customization_text', ''),
    COALESCE(item->'product_snapshot', '{}'::jsonb)
  FROM jsonb_array_elements(p_items) AS item;

  RETURN QUERY SELECT v_order_id, false;
END;
$$;

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
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado para esta conta.';
  END IF;

  IF v_order.mp_payment_id IS NOT NULL
     AND v_order.mp_payment_id IS DISTINCT FROM p_mp_payment_id THEN
    RAISE EXCEPTION 'O pedido já está associado a outro pagamento.';
  END IF;

  v_state_changed := v_order.status::text IS DISTINCT FROM p_order_status;

  UPDATE public.orders
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
  WHERE id = p_order_id;

  -- O carrinho deixa de representar uma intenção assim que o provedor aceita a tentativa.
  IF p_mp_status IS DISTINCT FROM 'rejected' THEN
    DELETE FROM public.cart_items WHERE user_id = p_user_id;

    UPDATE public.cart_recovery_events
    SET status = 'converted', converted_at = now()
    WHERE user_id = p_user_id AND status = 'sent';
  END IF;

  IF p_consume_inventory AND v_order.inventory_processed_at IS NULL THEN
    UPDATE public.product_options AS option
    SET stock = GREATEST(0, option.stock - quantities.quantity)
    FROM (
      SELECT product_option_id, SUM(quantity)::integer AS quantity
      FROM public.order_items
      WHERE order_id = p_order_id AND product_option_id IS NOT NULL
      GROUP BY product_option_id
    ) AS quantities
    WHERE option.id = quantities.product_option_id;

    UPDATE public.orders
    SET inventory_processed_at = now()
    WHERE id = p_order_id;

    v_apply_effects := true;
  END IF;

  IF p_consume_inventory
     AND v_order.checkout_coupon_id IS NOT NULL
     AND v_order.coupon_processed_at IS NULL THEN
    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = v_order.checkout_coupon_id;

    UPDATE public.orders
    SET coupon_processed_at = now()
    WHERE id = p_order_id;

    v_apply_effects := true;
  END IF;

  RETURN QUERY SELECT p_order_id, v_apply_effects, v_state_changed;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_checkout_order(uuid, uuid, text, numeric, jsonb, text, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_checkout_order(uuid, uuid, text, text, text, boolean)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.prepare_checkout_order(uuid, uuid, text, numeric, jsonb, text, uuid, jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_checkout_order(uuid, uuid, text, text, text, boolean)
  TO service_role;

COMMENT ON COLUMN public.orders.checkout_idempotency_key IS
  'Chave estável da tentativa enviada também ao Mercado Pago para impedir cobranças duplicadas.';
COMMENT ON FUNCTION public.prepare_checkout_order(uuid, uuid, text, numeric, jsonb, text, uuid, jsonb) IS
  'Cria o pedido pendente e seus itens atomicamente, ou recupera a mesma tentativa.';
COMMENT ON FUNCTION public.finalize_checkout_order(uuid, uuid, text, text, text, boolean) IS
  'Atualiza pagamento, carrinho, cupom e estoque numa única transação idempotente.';

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_recovery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.orders, public.order_items, public.cart_items,
  public.cart_recovery_events, public.coupons, public.product_options
  FROM anon, authenticated;
