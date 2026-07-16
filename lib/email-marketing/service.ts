// Email Marketing Service - Core business logic
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { renderTemplate } from './templates';
import { sendTrackedEmail } from '@/lib/email-delivery';
import { structuredLog } from '@/lib/observability';
import { normalizeEmailBaseUrl } from '@/lib/email-links';
import type {
  EmailCampaign,
  CampaignAnalytics,
  VariantAnalytics,
  TimelineEvent,
  CreateCampaignInput,
  CreateAutomationInput,
  CreateDripCampaignInput,
  CreateTemplateInput,
  SegmentType,
} from './types';

// ====== Resend client ======
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    structuredLog('warn', 'email.provider_not_configured', { emailType: 'campaign' });
    return null;
  }
  resendClient = new Resend(key);
  return resendClient;
}

function getFrom(): string {
  return process.env.RESEND_FROM_EMAIL || 'helloustudio <onboarding@resend.dev>';
}

function getBaseUrl(): string {
  return normalizeEmailBaseUrl(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
}

// ====== Campaign Service ======

export async function listCampaigns(status?: string) {
  const admin = getSupabaseAdmin();
  let query = admin.from('email_campaigns').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as EmailCampaign[];
}

export async function getCampaign(id: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('email_campaigns').select('*').eq('id', id).single();
  if (error) throw error;
  return data as EmailCampaign;
}

export async function createCampaign(input: CreateCampaignInput) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('email_campaigns').insert({
    name: input.name,
    subject: input.subject,
    preview_text: input.preview_text || null,
    body_html: input.body_html,
    template_id: input.template_id || null,
    segment_type: input.segment_type || 'all',
    segment_criteria: input.segment_criteria || {},
    scheduled_at: input.scheduled_at || null,
    status: input.scheduled_at ? 'scheduled' : 'draft',
    cta_text: input.cta_text || null,
    cta_url: input.cta_url || null,
    cta_color: input.cta_color || '#ec4899',
    ab_test_enabled: input.ab_test_enabled || false,
    ab_variant_b_subject: input.ab_variant_b_subject || null,
    ab_variant_b_body_html: input.ab_variant_b_body_html || null,
    ab_split_percent: input.ab_split_percent || 50,
  }).select().single();
  if (error) throw error;
  return data as EmailCampaign;
}

export async function updateCampaign(id: string, updates: Partial<CreateCampaignInput> & { status?: string }) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('email_campaigns').update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  if (error) throw error;
  return data as EmailCampaign;
}

export async function deleteCampaign(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('email_campaigns').delete().eq('id', id);
  if (error) throw error;
}

// ====== Segment Resolution ======

async function getSegmentRecipients(segmentType: SegmentType, criteria: Record<string, unknown>) {
  const admin = getSupabaseAdmin();

  // Campanhas promocionais exigem consentimento explícito e ativo.
  const { data: preferences, error: preferencesError } = await admin
    .from('email_preferences')
    .select('email')
    .eq('subscribed', true)
    .eq('gdpr_consent', true)
    .eq('blacklisted', false);
  if (preferencesError) throw preferencesError;
  const consentedEmails = new Set((preferences || []).map((preference) => preference.email.toLowerCase()));

  let query = admin.from('users').select('id, email, name').eq('role', 'user');

  if (segmentType === 'recency') {
    const days = (criteria.days as number) || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    query = query.gte('created_at', since);
  }

  const { data: users, error } = await query;
  if (error) throw error;

  // Sem registro de consentimento, o endereço não recebe campanhas.
  return (users || []).filter((user) => consentedEmails.has(user.email.toLowerCase()));
}

// ====== Send Campaign ======

export async function sendCampaign(campaignId: string) {
  const admin = getSupabaseAdmin();
  const campaign = await getCampaign(campaignId);

  if (campaign.status === 'sent' || campaign.status === 'sending') {
    throw new Error('Campaign already sent or sending');
  }

  // Update status to sending
  await admin.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId);

  const recipients = await getSegmentRecipients(
    campaign.segment_type,
    campaign.segment_criteria,
  );

  if (recipients.length === 0) {
    await admin.from('email_campaigns').update({ status: 'draft' }).eq('id', campaignId);
    throw new Error('No recipients found for this segment');
  }

  // Create recipient records
  const recipientRecords = recipients.map((user, index) => {
    let variant: 'A' | 'B' = 'A';
    if (campaign.ab_test_enabled) {
      const splitIndex = Math.floor(recipients.length * (campaign.ab_split_percent / 100));
      variant = index < splitIndex ? 'A' : 'B';
    }
    return {
      campaign_id: campaignId,
      user_id: user.id,
      email: user.email,
      variant,
      status: 'pending' as const,
    };
  });

  await admin.from('campaign_recipients').insert(recipientRecords);

  // Send emails
  const resend = getResend();
  let sentCount = 0;

  for (const recipient of recipientRecords) {
    const user = recipients.find(u => u.id === recipient.user_id);
    const baseUrl = getBaseUrl();
    const unsubscribeUrl = `${baseUrl}/api/email-marketing/unsubscribe?email=${encodeURIComponent(recipient.email)}&campaign=${campaignId}`;

    const subject = recipient.variant === 'B' && campaign.ab_variant_b_subject
      ? campaign.ab_variant_b_subject
      : campaign.subject;

    const bodyHtml = recipient.variant === 'B' && campaign.ab_variant_b_body_html
      ? campaign.ab_variant_b_body_html
      : campaign.body_html;

    const variables: Record<string, string> = {
      customer_name: user?.name || 'Cliente',
      base_url: baseUrl,
      unsubscribe_url: unsubscribeUrl,
    };

    const renderedBody = renderTemplate(bodyHtml, variables);
    const renderedSubject = renderTemplate(subject, variables);

    if (resend) {
      try {
        const result = await sendTrackedEmail(resend, {
          from: getFrom(),
          to: recipient.email,
          subject: renderedSubject,
          html: renderedBody,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
          },
        }, { emailType: 'campaign', campaignId, metadata: { variant: recipient.variant ?? 'A' } });

        if (!result.error) {
          sentCount++;
          await admin.from('campaign_recipients')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('campaign_id', campaignId)
            .eq('user_id', recipient.user_id);
        } else {
          await admin.from('campaign_recipients')
            .update({ status: 'bounced', bounced_at: new Date().toISOString() })
            .eq('campaign_id', campaignId)
            .eq('user_id', recipient.user_id);
        }
      } catch {
        await admin.from('campaign_recipients')
          .update({ status: 'bounced', bounced_at: new Date().toISOString() })
          .eq('campaign_id', campaignId)
          .eq('user_id', recipient.user_id);
      }
    } else {
      // Mock mode: mark all as sent
      sentCount++;
      await admin.from('campaign_recipients')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('campaign_id', campaignId)
        .eq('user_id', recipient.user_id);
    }
  }

  // Log event
  await admin.from('campaign_events').insert({
    campaign_id: campaignId,
    event_type: 'campaign_sent',
    metadata: { total_sent: sentCount, total_recipients: recipients.length },
  });

  // Update campaign status
  await admin.from('email_campaigns').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    total_recipients: recipients.length,
  }).eq('id', campaignId);

  return { sent: sentCount, total: recipients.length };
}

// ====== Campaign Analytics ======

export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  const admin = getSupabaseAdmin();
  const { data: recipients } = await admin
    .from('campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId);

  const all = recipients || [];
  const total_sent = all.filter(r => r.status !== 'pending').length;
  const total_delivered = all.filter(r => r.delivered_at || r.status === 'sent').length;
  const total_bounced = all.filter(r => r.status === 'bounced').length;
  const total_opened = all.filter(r => r.opened_at).length;
  const total_clicked = all.filter(r => r.clicked_at).length;
  const total_converted = all.filter(r => r.converted_at).length;
  const total_unsubscribed = all.filter(r => r.unsubscribed_at).length;
  const revenue = all.reduce((sum, r) => sum + (parseFloat(r.revenue) || 0), 0);

  function calcVariant(items: typeof all): VariantAnalytics {
    const sent = items.filter(r => r.status !== 'pending').length;
    const opened = items.filter(r => r.opened_at).length;
    const clicked = items.filter(r => r.clicked_at).length;
    const converted = items.filter(r => r.converted_at).length;
    return {
      total_sent: sent,
      total_opened: opened,
      total_clicked: clicked,
      total_converted: converted,
      open_rate: sent > 0 ? Math.round((opened / sent) * 10000) / 100 : 0,
      click_rate: sent > 0 ? Math.round((clicked / sent) * 10000) / 100 : 0,
      conversion_rate: sent > 0 ? Math.round((converted / sent) * 10000) / 100 : 0,
    };
  }

  const variantA = all.filter(r => r.variant === 'A');
  const variantB = all.filter(r => r.variant === 'B');

  return {
    campaign_id: campaignId,
    total_sent,
    total_delivered,
    total_bounced,
    total_opened,
    total_clicked,
    total_converted,
    total_unsubscribed,
    total_spam: 0,
    open_rate: total_sent > 0 ? Math.round((total_opened / total_sent) * 10000) / 100 : 0,
    click_rate: total_sent > 0 ? Math.round((total_clicked / total_sent) * 10000) / 100 : 0,
    conversion_rate: total_sent > 0 ? Math.round((total_converted / total_sent) * 10000) / 100 : 0,
    bounce_rate: total_sent > 0 ? Math.round((total_bounced / total_sent) * 10000) / 100 : 0,
    revenue,
    variant_a: calcVariant(variantA),
    variant_b: variantB.length > 0 ? calcVariant(variantB) : null,
  };
}

export async function getCampaignTimeline(campaignId: string): Promise<TimelineEvent[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('campaign_events')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  return (data || []).map(e => ({
    time: e.created_at,
    event: e.event_type,
    count: (e.metadata as Record<string, number>)?.count || 1,
  }));
}

export async function getCampaignLinkHeatmap(campaignId: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('campaign_links')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('click_count', { ascending: false });
  return data || [];
}

// ====== A/B Test Decision ======

export async function decideABTestWinner(campaignId: string) {
  const analytics = await getCampaignAnalytics(campaignId);
  if (!analytics.variant_b) return null;

  const admin = getSupabaseAdmin();
  let winner: 'A' | 'B';

  if (analytics.variant_a.open_rate >= analytics.variant_b.open_rate) {
    winner = 'A';
  } else {
    winner = 'B';
  }

  await admin.from('email_campaigns').update({
    ab_winner: winner,
    ab_decided_at: new Date().toISOString(),
  }).eq('id', campaignId);

  return {
    winner,
    variant_a: analytics.variant_a,
    variant_b: analytics.variant_b,
    improvement: winner === 'B'
      ? Math.round(((analytics.variant_b.open_rate - analytics.variant_a.open_rate) / analytics.variant_a.open_rate) * 100)
      : 0,
  };
}

// ====== Template Service ======

export async function listTemplates(category?: string) {
  const admin = getSupabaseAdmin();
  let query = admin.from('email_templates').select('*').order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTemplate(id: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('email_templates').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createTemplate(input: CreateTemplateInput) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('email_templates').insert({
    name: input.name,
    slug: input.slug,
    subject: input.subject,
    body_html: input.body_html,
    body_json: input.body_json || null,
    category: input.category || 'custom',
    variables: input.variables || [],
    preview_text: input.preview_text || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateTemplate(id: string, updates: Partial<CreateTemplateInput>) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('email_templates').update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('email_templates').delete().eq('id', id);
  if (error) throw error;
}

// ====== Automation Service ======

export async function listAutomations() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('email_automations').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAutomation(input: CreateAutomationInput) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('email_automations').insert({
    name: input.name,
    trigger_type: input.trigger_type,
    trigger_conditions: input.trigger_conditions || {},
    template_id: input.template_id || null,
    subject: input.subject || null,
    body_html: input.body_html || null,
    delay_minutes: input.delay_minutes || 0,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateAutomation(id: string, updates: Partial<CreateAutomationInput> & { enabled?: boolean }) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('email_automations').update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAutomation(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('email_automations').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleAutomation(id: string, enabled: boolean) {
  return updateAutomation(id, { enabled });
}

// ====== Drip Campaign Service ======

export async function listDripCampaigns() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('drip_campaigns').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getDripCampaign(id: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('drip_campaigns').select('*').eq('id', id).single();
  if (error) throw error;

  const { data: steps } = await admin
    .from('drip_steps')
    .select('*')
    .eq('drip_campaign_id', id)
    .order('step_order', { ascending: true });

  return { ...data, steps: steps || [] };
}

export async function createDripCampaign(input: CreateDripCampaignInput) {
  const admin = getSupabaseAdmin();
  const { data: campaign, error } = await admin.from('drip_campaigns').insert({
    name: input.name,
    description: input.description || null,
    trigger_type: input.trigger_type || 'signup',
    trigger_conditions: input.trigger_conditions || {},
    break_on_purchase: input.break_on_purchase ?? true,
  }).select().single();
  if (error) throw error;

  // Create steps
  if (input.steps && input.steps.length > 0) {
    const steps = input.steps.map((step, index) => ({
      drip_campaign_id: campaign.id,
      step_order: index + 1,
      delay_days: step.delay_days,
      subject: step.subject,
      body_html: step.body_html,
      template_id: step.template_id || null,
    }));
    await admin.from('drip_steps').insert(steps);
  }

  return campaign;
}

export async function updateDripCampaign(id: string, updates: Partial<CreateDripCampaignInput> & { enabled?: boolean }) {
  const admin = getSupabaseAdmin();
  const { steps, ...campaignUpdates } = updates;

  const { data, error } = await admin.from('drip_campaigns').update({
    ...campaignUpdates,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  if (error) throw error;

  if (steps) {
    // Replace steps
    await admin.from('drip_steps').delete().eq('drip_campaign_id', id);
    const stepRecords = steps.map((step, index) => ({
      drip_campaign_id: id,
      step_order: index + 1,
      delay_days: step.delay_days,
      subject: step.subject,
      body_html: step.body_html,
      template_id: step.template_id || null,
    }));
    await admin.from('drip_steps').insert(stepRecords);
  }

  return data;
}

export async function deleteDripCampaign(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('drip_campaigns').delete().eq('id', id);
  if (error) throw error;
}

// ====== Recipient Management ======

export async function listEmailPreferences(filters?: { subscribed?: boolean; blacklisted?: boolean }) {
  const admin = getSupabaseAdmin();
  let query = admin.from('email_preferences').select('*').order('created_at', { ascending: false });
  if (filters?.subscribed !== undefined) query = query.eq('subscribed', filters.subscribed);
  if (filters?.blacklisted !== undefined) query = query.eq('blacklisted', filters.blacklisted);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function unsubscribeEmail(email: string, reason?: string) {
  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from('email_preferences')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    await admin.from('email_preferences').update({
      subscribed: false,
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_reason: reason || null,
      updated_at: new Date().toISOString(),
    }).eq('email', email);
  } else {
    await admin.from('email_preferences').insert({
      email,
      subscribed: false,
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_reason: reason || null,
    });
  }
}

export async function blacklistEmail(email: string, reason?: string) {
  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from('email_preferences')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    await admin.from('email_preferences').update({
      blacklisted: true,
      blacklist_reason: reason || null,
      subscribed: false,
      updated_at: new Date().toISOString(),
    }).eq('email', email);
  } else {
    await admin.from('email_preferences').insert({
      email,
      blacklisted: true,
      blacklist_reason: reason || null,
      subscribed: false,
    });
  }
}

export async function whitelistEmail(email: string) {
  const admin = getSupabaseAdmin();
  await admin.from('email_preferences').update({
    blacklisted: false,
    blacklist_reason: null,
    subscribed: true,
    updated_at: new Date().toISOString(),
  }).eq('email', email);
}

export async function recordBounce(email: string) {
  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from('email_preferences')
    .select('id, bounce_count')
    .eq('email', email)
    .single();

  if (existing) {
    const newCount = (existing.bounce_count || 0) + 1;
    await admin.from('email_preferences').update({
      bounce_count: newCount,
      last_bounce_at: new Date().toISOString(),
      // Auto-unsubscribe after 3 bounces
      ...(newCount >= 3 ? { subscribed: false, blacklisted: true, blacklist_reason: 'Auto-removed: 3+ bounces' } : {}),
      updated_at: new Date().toISOString(),
    }).eq('email', email);
  } else {
    await admin.from('email_preferences').insert({
      email,
      bounce_count: 1,
      last_bounce_at: new Date().toISOString(),
    });
  }
}

// ====== Export ======

export async function exportRecipients(campaignId?: string): Promise<string> {
  const admin = getSupabaseAdmin();

  if (campaignId) {
    const { data } = await admin
      .from('campaign_recipients')
      .select('email, variant, status, sent_at, opened_at, clicked_at, converted_at, revenue')
      .eq('campaign_id', campaignId);

    const rows = data || [];
    const header = 'email,variant,status,sent_at,opened_at,clicked_at,converted_at,revenue';
    const csv = [header, ...rows.map(r =>
      `${r.email},${r.variant},${r.status},${r.sent_at || ''},${r.opened_at || ''},${r.clicked_at || ''},${r.converted_at || ''},${r.revenue}`
    )].join('\n');
    return csv;
  } else {
    const { data } = await admin
      .from('email_preferences')
      .select('email, subscribed, bounce_count, blacklisted, gdpr_consent, created_at');

    const rows = data || [];
    const header = 'email,subscribed,bounce_count,blacklisted,gdpr_consent,created_at';
    const csv = [header, ...rows.map(r =>
      `${r.email},${r.subscribed},${r.bounce_count},${r.blacklisted},${r.gdpr_consent},${r.created_at}`
    )].join('\n');
    return csv;
  }
}
