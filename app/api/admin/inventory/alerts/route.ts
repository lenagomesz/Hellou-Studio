import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  return NextResponse.json({
    alerts: [],
    summary: { critical: 0, low: 0, total: 0 },
  });
}
