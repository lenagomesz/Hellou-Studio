-- Slack Notification System Migration

-- Slack webhook configurations (multiple webhooks/channels)
CREATE TABLE IF NOT EXISTS slack_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  channel_name TEXT NOT NULL DEFAULT '#general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event type configuration per webhook
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

-- Global notification preferences
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

-- Notification log for history/audit
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

-- Digest queue (notifications waiting to be grouped)
CREATE TABLE IF NOT EXISTS slack_digest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES slack_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default preferences if none exist
INSERT INTO slack_notification_preferences (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_slack_logs_created_at ON slack_notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slack_logs_event_type ON slack_notification_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_slack_logs_status ON slack_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_slack_digest_queue_webhook ON slack_digest_queue(webhook_id, event_type);
CREATE INDEX IF NOT EXISTS idx_slack_event_configs_webhook ON slack_event_configs(webhook_id);
