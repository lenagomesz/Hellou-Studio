-- LEGADO: migracao manual de feature flags.
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

-- Audit log table for feature flags and general admin actions
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

-- Feature usage stats table
CREATE TABLE IF NOT EXISTS feature_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_stats_key ON feature_usage_stats(feature_key, period);

-- Seed initial feature flags
INSERT INTO feature_flags (key, name, description, enabled, category, icon, route, dependencies, setup_required) VALUES
-- Products
('bulk_edit', 'Bulk Edit', 'Editar multiplos produtos de uma vez', true, 'Products', 'Edit', '/dashboard/products', '{}', false),
('import_csv', 'Import CSV', 'Importar produtos via arquivo CSV', true, 'Products', 'Upload', '/dashboard/products/import', '{}', false),
('price_history', 'Price History', 'Historico de precos dos produtos', true, 'Products', 'TrendingUp', '/dashboard/products', '{}', false),
('product_tags', 'Tags', 'Sistema de tags para categorizar produtos', true, 'Products', 'Tag', '/dashboard/products', '{}', false),

-- Orders
('bulk_actions', 'Bulk Actions', 'Acoes em massa para pedidos', true, 'Orders', 'CheckSquare', '/dashboard/orders', '{}', false),
('order_timeline', 'Timeline', 'Timeline visual do pedido', true, 'Orders', 'Clock', '/dashboard/orders', '{}', false),
('auto_sms', 'Auto SMS', 'Envio automatico de SMS para atualizacoes', true, 'Orders', 'MessageSquare', '/dashboard/orders', '{}', true),
('invoicing', 'Invoicing', 'Geracao automatica de nota fiscal', true, 'Orders', 'FileText', '/dashboard/orders', '{}', true),

-- Users
('rfm_analysis', 'RFM Analysis', 'Analise de Recencia, Frequencia e Valor Monetario', true, 'Users', 'PieChart', '/dashboard/users', '{}', false),
('churn_detection', 'Churn Detection', 'Deteccao automatica de churn de usuarios', true, 'Users', 'UserMinus', '/dashboard/users', '{rfm_analysis}', false),
('ltv_calculation', 'LTV', 'Calculo de Lifetime Value dos clientes', true, 'Users', 'DollarSign', '/dashboard/users', '{}', false),
('user_segments', 'Segments', 'Segmentacao avancada de usuarios', true, 'Users', 'Users', '/dashboard/users', '{rfm_analysis}', false),

-- Analytics
('period_comparison', 'Comparacao Periodos', 'Comparar metricas entre periodos diferentes', true, 'Analytics', 'ArrowLeftRight', '/dashboard/analytics', '{}', false),
('forecast', 'Forecast', 'Previsao de vendas e receita', true, 'Analytics', 'TrendingUp', '/dashboard/analytics', '{}', false),
('anomaly_detection', 'Anomaly Detection', 'Deteccao automatica de anomalias', true, 'Analytics', 'AlertTriangle', '/dashboard/analytics', '{}', false),

-- Automation
('email_campaigns', 'Email Campaigns', 'Criar e enviar campanhas de email marketing', true, 'Automation', 'Mail', '/dashboard/automation/email', '{}', true),
('drip_campaigns', 'Drip Campaigns', 'Sequencias automaticas de emails', true, 'Automation', 'Droplets', '/dashboard/automation/drip', '{email_campaigns}', true),
('triggers', 'Triggers', 'Automacoes baseadas em eventos', true, 'Automation', 'Zap', '/dashboard/automation/triggers', '{}', false),

-- Inventory
('stock_log', 'Stock Log', 'Historico completo de movimentacao de estoque', true, 'Inventory', 'ClipboardList', '/dashboard/inventory/log', '{}', false),
('reorder_points', 'Reorder Points', 'Pontos de reposicao automaticos', true, 'Inventory', 'RefreshCw', '/dashboard/inventory/reorder', '{stock_log}', false),
('stock_alerts', 'Stock Alerts', 'Alertas de estoque baixo', true, 'Inventory', 'Bell', '/dashboard/inventory/alerts', '{stock_log}', false),
('inventory_forecast', 'Inventory Forecast', 'Previsao de demanda de estoque', true, 'Inventory', 'BarChart', '/dashboard/inventory/forecast', '{stock_log}', false),

-- Integrations
('slack_integration', 'Slack', 'Integrar notificacoes com Slack', true, 'Integrations', 'MessageCircle', '/dashboard/settings/integrations/slack', '{}', true),
('webhooks', 'Webhooks', 'Enviar eventos via webhooks customizados', true, 'Integrations', 'Webhook', '/dashboard/settings/integrations/webhooks', '{}', true)

ON CONFLICT (key) DO NOTHING;
