// Slack Notification System Types

export type SlackEventType =
  | 'new_order'
  | 'order_canceled'
  | 'refund'
  | 'low_stock'
  | 'critical_stock'
  | 'new_user'
  | 'new_review'
  | 'coupon_used'
  | 'payment_error'
  | 'new_stl';

export type SlackNotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type SlackNotificationStatus = 'sent' | 'failed' | 'queued' | 'digested';

export interface SlackWebhookConfig {
  id: string;
  name: string;
  webhook_url: string;
  channel_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlackEventConfig {
  id: string;
  webhook_id: string;
  event_type: SlackEventType;
  enabled: boolean;
  priority: SlackNotificationPriority;
  // Filters
  min_order_value: number | null;
  min_stock_threshold: number | null;
  mention_target: string | null; // @channel, @here, or specific user
  created_at: string;
  updated_at: string;
}

export interface SlackNotificationPreferences {
  id: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // HH:mm format
  quiet_hours_end: string;   // HH:mm format
  digest_mode_enabled: boolean;
  digest_interval_minutes: number;
  escalation_enabled: boolean;
  escalation_timeout_minutes: number;
  escalation_target: string | null;
  bulk_threshold: number; // Group if more than N similar events
  created_at: string;
  updated_at: string;
}

export interface SlackNotificationLog {
  id: string;
  webhook_id: string;
  event_type: SlackEventType;
  priority: SlackNotificationPriority;
  status: SlackNotificationStatus;
  message_ts: string | null; // Slack message timestamp for threading
  thread_ts: string | null;  // Parent thread timestamp
  payload: Record<string, unknown>;
  response: Record<string, unknown> | null;
  error_message: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
}

// Slack Block Kit message types
export interface SlackBlock {
  type: string;
  text?: SlackText;
  elements?: (SlackElement | SlackText)[];
  fields?: SlackText[];
  accessory?: SlackElement;
  block_id?: string;
}

export interface SlackText {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

export interface SlackElement {
  type: string;
  text?: SlackText;
  url?: string;
  action_id?: string;
  style?: 'primary' | 'danger';
  value?: string;
  image_url?: string;
  alt_text?: string;
}

export interface SlackMessage {
  text: string; // Fallback text
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  unfurl_links?: boolean;
}

export interface SlackAttachment {
  color: string;
  blocks?: SlackBlock[];
  fallback?: string;
}

// Priority colors for Slack messages
export const PRIORITY_COLORS: Record<SlackNotificationPriority, string> = {
  low: '#36a64f',      // green
  medium: '#daa520',   // yellow/gold
  high: '#ff8c00',     // orange
  critical: '#dc3545', // red
};

export const EVENT_TYPE_LABELS: Record<SlackEventType, string> = {
  new_order: 'Novo Pedido',
  order_canceled: 'Pedido Cancelado',
  refund: 'Reembolso',
  low_stock: 'Estoque Baixo',
  critical_stock: 'Estoque Crítico',
  new_user: 'Novo Usuário',
  new_review: 'Nova Avaliação',
  coupon_used: 'Cupom Usado',
  payment_error: 'Erro de Pagamento',
  new_stl: 'Novo STL',
};

export const EVENT_TYPE_EMOJI: Record<SlackEventType, string> = {
  new_order: ':package:',
  order_canceled: ':x:',
  refund: ':money_with_wings:',
  low_stock: ':warning:',
  critical_stock: ':rotating_light:',
  new_user: ':wave:',
  new_review: ':star:',
  coupon_used: ':ticket:',
  payment_error: ':no_entry:',
  new_stl: ':file_folder:',
};
