import { NextRequest, NextResponse } from 'next/server';
import { listEmailPreferences, blacklistEmail, whitelistEmail } from '@/lib/email-marketing/service';
import { requirePermission } from '@/lib/api';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('marketing.manage'); if (auth.response) return auth.response;
  try {
    const subscribed = req.nextUrl.searchParams.get('subscribed');
    const blacklisted = req.nextUrl.searchParams.get('blacklisted');

    const filters: { subscribed?: boolean; blacklisted?: boolean } = {};
    if (subscribed !== null) filters.subscribed = subscribed === 'true';
    if (blacklisted !== null) filters.blacklisted = blacklisted === 'true';

    const preferences = await listEmailPreferences(Object.keys(filters).length > 0 ? filters : undefined);
    return NextResponse.json(preferences);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('marketing.manage'); if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const { action, email, reason } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (action === 'blacklist') {
      await blacklistEmail(email, reason);
      return NextResponse.json({ success: true, action: 'blacklisted' });
    }

    if (action === 'whitelist') {
      await whitelistEmail(email);
      return NextResponse.json({ success: true, action: 'whitelisted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
