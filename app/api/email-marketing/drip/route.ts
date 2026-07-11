import { NextRequest, NextResponse } from 'next/server';
import { listDripCampaigns, createDripCampaign } from '@/lib/email-marketing/service';

export async function GET() {
  try {
    const campaigns = await listDripCampaigns();
    return NextResponse.json(campaigns);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const campaign = await createDripCampaign(body);
    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
