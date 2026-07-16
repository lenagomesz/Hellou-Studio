import { NextRequest, NextResponse } from 'next/server';
import { listCampaigns, createCampaign } from '@/lib/email-marketing/service';
import { requirePermission } from '@/lib/api';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('marketing.manage');
  if (auth.response) return auth.response;
  try {
    const status = req.nextUrl.searchParams.get('status') || undefined;
    const campaigns = await listCampaigns(status);
    return NextResponse.json(campaigns);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('marketing.manage');
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const campaign = await createCampaign(body);
    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
