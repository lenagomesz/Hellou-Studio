import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { estimateSegmentRecipients } from '@/lib/email-marketing/service';
import type { SegmentType } from '@/lib/email-marketing/types';

const SEGMENTS = new Set<SegmentType>(['all', 'rfm', 'category', 'recency', 'custom']);

export async function POST(request: Request) {
  const auth = await requirePermission('marketing.manage');
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({})) as { segment_type?: SegmentType; segment_criteria?: Record<string, unknown> };
  if (!body.segment_type || !SEGMENTS.has(body.segment_type)) {
    return NextResponse.json({ error: 'Segmento inválido' }, { status: 400 });
  }
  const count = await estimateSegmentRecipients(body.segment_type, body.segment_criteria ?? {});
  return NextResponse.json({ count });
}
