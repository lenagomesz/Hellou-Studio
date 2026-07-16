import { NextRequest, NextResponse } from 'next/server';
import { listDripCampaigns, createDripCampaign } from '@/lib/email-marketing/service';
import { requirePermission } from '@/lib/api';

export async function GET() {
  const auth = await requirePermission('marketing.manage'); if (auth.response) return auth.response;
  try {
    const campaigns = await listDripCampaigns();
    return NextResponse.json(campaigns);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('marketing.manage'); if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const campaign = await createDripCampaign(body);
    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
