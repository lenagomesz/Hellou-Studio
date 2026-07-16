import { NextRequest, NextResponse } from 'next/server';
import { getCampaignAnalytics, getCampaignTimeline, getCampaignLinkHeatmap } from '@/lib/email-marketing/service';
import { requirePermission } from '@/lib/api';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('marketing.manage'); if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const type = req.nextUrl.searchParams.get('type') || 'overview';

    if (type === 'timeline') {
      const timeline = await getCampaignTimeline(id);
      return NextResponse.json(timeline);
    }

    if (type === 'heatmap') {
      const heatmap = await getCampaignLinkHeatmap(id);
      return NextResponse.json(heatmap);
    }

    const analytics = await getCampaignAnalytics(id);
    return NextResponse.json(analytics);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
