import { NextRequest, NextResponse } from 'next/server';
import { exportRecipients } from '@/lib/email-marketing/service';

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaign') || undefined;
    const csv = await exportRecipients(campaignId);

    const filename = campaignId
      ? `campaign-${campaignId}-recipients.csv`
      : 'email-preferences-export.csv';

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
