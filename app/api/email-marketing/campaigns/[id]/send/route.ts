import { NextRequest, NextResponse } from 'next/server';
import { sendCampaign } from '@/lib/email-marketing/service';
import { requirePermission } from '@/lib/api';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('marketing.manage'); if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const result = await sendCampaign(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
