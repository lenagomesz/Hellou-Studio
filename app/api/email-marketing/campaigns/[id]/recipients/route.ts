import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getCampaign, getSegmentRecipients } from '@/lib/email-marketing/service';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission('marketing.manage'); if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const admin = getSupabaseAdmin();
    const campaign = await getCampaign(id);
    const [{ data: users, error: usersError }, { data: preferences }, { data: deliveries }] = await Promise.all([
      admin.from('users').select('id, name, email').eq('role', 'user').order('created_at', { ascending: false }),
      admin.from('email_preferences').select('email, subscribed, gdpr_consent, blacklisted'),
      admin.from('campaign_recipients').select('email, status, sent_at').eq('campaign_id', id).order('created_at', { ascending: false }),
    ]);
    if (usersError) throw usersError;

    const preferenceMap = new Map((preferences ?? []).map((item) => [item.email.toLowerCase(), item]));
    const deliveryMap = new Map<string, { status: string; sent_at: string | null }>();
    for (const delivery of deliveries ?? []) {
      const email = delivery.email.toLowerCase();
      if (!deliveryMap.has(email) || delivery.status === 'sent') deliveryMap.set(email, delivery);
    }
    const selectedIds = new Set((await getSegmentRecipients(campaign.segment_type, campaign.segment_criteria)).map((user) => user.id));

    return NextResponse.json((users ?? []).map((user) => {
      const preference = preferenceMap.get(user.email.toLowerCase());
      const delivery = deliveryMap.get(user.email.toLowerCase());
      const eligible = preference?.subscribed === true && preference.gdpr_consent === true && preference.blacklisted !== true;
      const alreadySent = delivery?.status === 'sent';
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        eligible,
        already_sent: alreadySent,
        selected: eligible && !alreadySent && selectedIds.has(user.id),
        status: delivery?.status ?? null,
        sent_at: delivery?.sent_at ?? null,
      };
    }));
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao carregar destinatários.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission('marketing.manage'); if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json() as { selected_user_ids?: unknown };
    if (!Array.isArray(body.selected_user_ids) || body.selected_user_ids.some((value) => typeof value !== 'string')) {
      return NextResponse.json({ error: 'Seleção de destinatários inválida.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const campaign = await getCampaign(id);
    const requestedIds = [...new Set(body.selected_user_ids as string[])].slice(0, 5000);
    const { data: users } = requestedIds.length
      ? await admin.from('users').select('id, email').in('id', requestedIds).eq('role', 'user')
      : { data: [] };
    const emails = (users ?? []).map((user) => user.email);
    const { data: preferences } = emails.length
      ? await admin.from('email_preferences').select('email').in('email', emails).eq('subscribed', true).eq('gdpr_consent', true).eq('blacklisted', false)
      : { data: [] };
    const eligibleEmails = new Set((preferences ?? []).map((item) => item.email.toLowerCase()));
    const eligibleIds = (users ?? []).filter((user) => eligibleEmails.has(user.email.toLowerCase())).map((user) => user.id);
    const segmentCriteria = { ...(campaign.segment_criteria ?? {}), manualRecipientUserIds: eligibleIds };
    const { error } = await admin.from('email_campaigns').update({ segment_criteria: segmentCriteria, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true, selected: eligibleIds.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao salvar destinatários.' }, { status: 500 });
  }
}
