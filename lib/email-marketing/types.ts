// Email Marketing Types

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'canceled';
export type SegmentType = 'all' | 'rfm' | 'category' | 'recency' | 'custom';
export type RecipientStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'converted' | 'bounced' | 'unsubscribed';
export type AutomationTrigger = 'new_customer' | 'no_purchase_7d' | 'purchased_product' | 'birthday' | 'high_ltv' | 'cart_abandoned';
export type DripEnrollmentStatus = 'active' | 'completed' | 'removed' | 'paused';

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  body_html: string;
  body_json: Record<string, unknown> | null;
  category: string;
  variables: string[];
  preview_text: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  preview_text: string | null;
  body_html: string;
  body_json: Record<string, unknown> | null;
  template_id: string | null;
  status: CampaignStatus;
  segment_type: SegmentType;
  segment_criteria: Record<string, unknown>;
  scheduled_at: string | null;
  sent_at: string | null;
  cta_text: string | null;
  cta_url: string | null;
  cta_color: string;
  ab_test_enabled: boolean;
  ab_variant_b_subject: string | null;
  ab_variant_b_body_html: string | null;
  ab_split_percent: number;
  ab_winner: string | null;
  ab_decided_at: string | null;
  total_recipients: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  user_id: string;
  email: string;
  variant: 'A' | 'B';
  status: RecipientStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  converted_at: string | null;
  bounced_at: string | null;
  unsubscribed_at: string | null;
  revenue: number;
  created_at: string;
}

export interface CampaignEvent {
  id: string;
  campaign_id: string;
  recipient_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CampaignLink {
  id: string;
  campaign_id: string;
  url: string;
  label: string | null;
  click_count: number;
  created_at: string;
}

export interface EmailAutomation {
  id: string;
  name: string;
  trigger_type: AutomationTrigger;
  trigger_conditions: Record<string, unknown>;
  template_id: string | null;
  subject: string | null;
  body_html: string | null;
  delay_minutes: number;
  enabled: boolean;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationLog {
  id: string;
  automation_id: string;
  user_id: string;
  email: string;
  status: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
}

export interface DripCampaign {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_conditions: Record<string, unknown>;
  enabled: boolean;
  break_on_purchase: boolean;
  total_enrolled: number;
  total_active: number;
  total_completed: number;
  created_at: string;
  updated_at: string;
}

export interface DripStep {
  id: string;
  drip_campaign_id: string;
  step_order: number;
  delay_days: number;
  subject: string;
  body_html: string;
  template_id: string | null;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
}

export interface DripEnrollment {
  id: string;
  drip_campaign_id: string;
  user_id: string;
  email: string;
  current_step: number;
  status: DripEnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  removed_at: string | null;
  next_send_at: string | null;
}

export interface EmailPreference {
  id: string;
  user_id: string | null;
  email: string;
  subscribed: boolean;
  unsubscribed_at: string | null;
  unsubscribe_reason: string | null;
  gdpr_consent: boolean;
  gdpr_consent_at: string | null;
  bounce_count: number;
  last_bounce_at: string | null;
  blacklisted: boolean;
  blacklist_reason: string | null;
  created_at: string;
  updated_at: string;
}

// Analytics types
export interface CampaignAnalytics {
  campaign_id: string;
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  total_unsubscribed: number;
  total_spam: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  bounce_rate: number;
  revenue: number;
  variant_a: VariantAnalytics;
  variant_b: VariantAnalytics | null;
}

export interface VariantAnalytics {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
}

export interface TimelineEvent {
  time: string;
  event: string;
  count: number;
}

// Form types for creating/updating
export interface CreateCampaignInput {
  name: string;
  subject: string;
  preview_text?: string;
  body_html: string;
  template_id?: string;
  segment_type?: SegmentType;
  segment_criteria?: Record<string, unknown>;
  scheduled_at?: string;
  cta_text?: string;
  cta_url?: string;
  cta_color?: string;
  ab_test_enabled?: boolean;
  ab_variant_b_subject?: string;
  ab_variant_b_body_html?: string;
  ab_split_percent?: number;
}

export interface CreateTemplateInput {
  name: string;
  slug: string;
  subject: string;
  body_html: string;
  body_json?: Record<string, unknown>;
  category?: string;
  variables?: string[];
  preview_text?: string;
}

export interface CreateAutomationInput {
  name: string;
  trigger_type: AutomationTrigger;
  trigger_conditions?: Record<string, unknown>;
  template_id?: string;
  subject?: string;
  body_html?: string;
  delay_minutes?: number;
}

export interface CreateDripCampaignInput {
  name: string;
  description?: string;
  trigger_type?: string;
  trigger_conditions?: Record<string, unknown>;
  break_on_purchase?: boolean;
  steps: Array<{
    delay_days: number;
    subject: string;
    body_html: string;
    template_id?: string;
  }>;
}
