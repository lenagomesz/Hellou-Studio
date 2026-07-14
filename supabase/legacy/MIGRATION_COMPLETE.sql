-- LEGADO: pacote manual antigo. Nao executar como migracao automatica.
-- ============================================================================
-- COMPREHENSIVE MIGRATION: All missing tables for production features
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. EMAIL MARKETING SYSTEM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_json JSONB DEFAULT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  variables JSONB DEFAULT '[]'::jsonb,
  preview_text TEXT DEFAULT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT DEFAULT NULL,
  body_html TEXT NOT NULL,
  body_json JSONB DEFAULT NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  segment_type TEXT NOT NULL DEFAULT 'all',
  segment_criteria JSONB DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ DEFAULT NULL,
  sent_at TIMESTAMPTZ DEFAULT NULL,
  cta_text TEXT DEFAULT NULL,
  cta_url TEXT DEFAULT NULL,
  cta_color TEXT DEFAULT '#ec4899',
  ab_test_enabled BOOLEAN DEFAULT false,
  ab_variant_b_subject TEXT DEFAULT NULL,
  ab_variant_b_body_html TEXT DEFAULT NULL,
  ab_split_percent INTEGER DEFAULT 50,
  ab_winner TEXT DEFAULT NULL,
  ab_decided_at TIMESTAMPTZ DEFAULT NULL,
  total_recipients INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  variant TEXT DEFAULT 'A',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ DEFAULT NULL,
  delivered_at TIMESTAMPTZ DEFAULT NULL,
  opened_at TIMESTAMPTZ DEFAULT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NULL,
  converted_at TIMESTAMPTZ DEFAULT NULL,
  bounced_at TIMESTAMPTZ DEFAULT NULL,
  unsubscribed_at TIMESTAMPTZ DEFAULT NULL,
  revenue NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_user ON campaign_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);

CREATE TABLE IF NOT EXISTS campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES campaign_recipients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_type ON campaign_events(event_type);

CREATE TABLE IF NOT EXISTS campaign_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT DEFAULT NULL,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  subject TEXT DEFAULT NULL,
  body_html TEXT DEFAULT NULL,
  delay_minutes INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES email_automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ DEFAULT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON automation_logs(automation_id);

CREATE TABLE IF NOT EXISTS drip_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'signup',
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  break_on_purchase BOOLEAN DEFAULT true,
  total_enrolled INTEGER DEFAULT 0,
  total_active INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drip_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drip_campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  delay_days INTEGER NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drip_steps_campaign ON drip_steps(drip_campaign_id);

CREATE TABLE IF NOT EXISTS drip_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drip_campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  current_step INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NULL,
  removed_at TIMESTAMPTZ DEFAULT NULL,
  next_send_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_drip_enrollments_campaign ON drip_enrollments(drip_campaign_id);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_user ON drip_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_status ON drip_enrollments(status);

CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT NULL,
  email TEXT NOT NULL UNIQUE,
  subscribed BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMPTZ DEFAULT NULL,
  unsubscribe_reason TEXT DEFAULT NULL,
  gdpr_consent BOOLEAN DEFAULT false,
  gdpr_consent_at TIMESTAMPTZ DEFAULT NULL,
  bounce_count INTEGER DEFAULT 0,
  last_bounce_at TIMESTAMPTZ DEFAULT NULL,
  blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_preferences_email ON email_preferences(email);
CREATE INDEX IF NOT EXISTS idx_email_preferences_subscribed ON email_preferences(subscribed);

-- ============================================================================
-- 2. CUSTOMER ANALYTICS - Add VIP column and indexes
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_vip ON users (is_vip) WHERE is_vip = true;
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_status_total ON orders (user_id, status, total);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- ============================================================================
-- 3. ORDER RATINGS TABLE (with corrected RLS for admin access)
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_ratings_user_id ON order_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_order_ratings_created_at ON order_ratings(created_at DESC);

ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own ratings" ON order_ratings;
DROP POLICY IF EXISTS "Users can insert own ratings" ON order_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON order_ratings;

-- New policies: users can manage their own, admins can read all
CREATE POLICY "Users can view own ratings"
  ON order_ratings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all ratings"
  ON order_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own ratings"
  ON order_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ratings"
  ON order_ratings FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- 4. INVENTORY MANAGEMENT SYSTEM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE stock_movement_reason AS ENUM (
    'venda', 'devolucao', 'ajuste_manual', 'reposicao', 'quebra', 'perda', 'transferencia'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reorder_task_status AS ENUM (
    'pending', 'ordered', 'in_transit', 'received', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS reorder_point integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS standard_order_qty integer NOT NULL DEFAULT 50;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_option_id uuid REFERENCES public.product_options(id) ON DELETE SET NULL,
  warehouse_id    uuid,
  quantity_change integer NOT NULL,
  stock_before    integer NOT NULL,
  stock_after     integer NOT NULL,
  reason          stock_movement_reason NOT NULL,
  notes           text,
  user_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reference_id    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warehouses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  address     text,
  city        text,
  state       text,
  zip_code    text,
  is_default  boolean NOT NULL DEFAULT false,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warehouse_stock (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id        uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_option_id   uuid NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
  quantity            integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  last_counted_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, product_option_id)
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  contact_name      text,
  email             text,
  phone             text,
  website           text,
  address           text,
  lead_time_days    integer NOT NULL DEFAULT 7,
  reliability_score numeric(3,2) DEFAULT 1.00 CHECK (reliability_score >= 0 AND reliability_score <= 1),
  notes             text,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_suppliers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id     uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  cost_per_unit   numeric(10,2) NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
  min_order_qty   integer NOT NULL DEFAULT 1,
  sku             text,
  is_preferred    boolean NOT NULL DEFAULT false,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS public.reorder_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_option_id   uuid REFERENCES public.product_options(id) ON DELETE SET NULL,
  supplier_id         uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status              reorder_task_status NOT NULL DEFAULT 'pending',
  quantity_ordered    integer NOT NULL,
  quantity_received   integer NOT NULL DEFAULT 0,
  estimated_arrival   timestamptz,
  actual_arrival      timestamptz,
  cost_total          numeric(10,2),
  notes               text,
  created_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_option ON public.stock_movements(product_option_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reason ON public.stock_movements(reason);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON public.stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON public.warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_option ON public.warehouse_stock(product_option_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON public.product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON public.product_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_reorder_tasks_product ON public.reorder_tasks(product_id);
CREATE INDEX IF NOT EXISTS idx_reorder_tasks_status ON public.reorder_tasks(status);

ALTER TABLE public.stock_movements    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_suppliers  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reorder_tasks      DISABLE ROW LEVEL SECURITY;

INSERT INTO public.warehouses (name, is_default)
VALUES ('Estoque Principal', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. ADMIN NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'normal',
  related_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  related_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  related_product_option_id UUID REFERENCES product_options(id) ON DELETE SET NULL,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(read, archived) WHERE read = FALSE AND archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_order ON admin_notifications(related_order_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_product ON admin_notifications(related_product_id);

-- ============================================================================
-- 6. FEATURE FLAGS & AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL,
  icon TEXT,
  route TEXT,
  dependencies TEXT[] DEFAULT '{}',
  setup_required BOOLEAN DEFAULT false,
  setup_steps JSONB,
  documentation_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_stats_key ON feature_usage_stats(feature_key, period);

INSERT INTO feature_flags (key, name, description, enabled, category, icon, route, dependencies, setup_required) VALUES
('bulk_edit', 'Bulk Edit', 'Editar multiplos produtos de uma vez', true, 'Products', 'Edit', '/dashboard/products', '{}', false),
('email_campaigns', 'Email Campaigns', 'Criar e enviar campanhas de email marketing', true, 'Automation', 'Mail', '/dashboard/automation/email', '{}', true),
('inventory_management', 'Inventory', 'Sistema de estoque com reorder points', true, 'Inventory', 'Package', '/dashboard/inventory', '{}', false),
('rfm_analysis', 'RFM Analysis', 'Analise de Recencia, Frequencia e Valor Monetario', true, 'Users', 'PieChart', '/dashboard/users', '{}', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 7. SLACK NOTIFICATION SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS slack_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  channel_name TEXT NOT NULL DEFAULT '#general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slack_event_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES slack_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority TEXT NOT NULL DEFAULT 'medium',
  min_order_value NUMERIC(10,2) DEFAULT NULL,
  min_stock_threshold INTEGER DEFAULT NULL,
  mention_target TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(webhook_id, event_type)
);

CREATE TABLE IF NOT EXISTS slack_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
  digest_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  digest_interval_minutes INTEGER NOT NULL DEFAULT 60,
  escalation_enabled BOOLEAN NOT NULL DEFAULT false,
  escalation_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  escalation_target TEXT DEFAULT NULL,
  bulk_threshold INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slack_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES slack_webhooks(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'queued',
  message_ts TEXT DEFAULT NULL,
  thread_ts TEXT DEFAULT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response JSONB DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  responded_by TEXT DEFAULT NULL,
  responded_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slack_digest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES slack_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO slack_notification_preferences (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_slack_logs_created_at ON slack_notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slack_logs_event_type ON slack_notification_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_slack_logs_status ON slack_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_slack_digest_queue_webhook ON slack_digest_queue(webhook_id, event_type);
CREATE INDEX IF NOT EXISTS idx_slack_event_configs_webhook ON slack_event_configs(webhook_id);

-- ============================================================================
-- COMPLETE!
-- All tables created. Now refresh your dashboard - errors should be fixed!
-- ============================================================================
