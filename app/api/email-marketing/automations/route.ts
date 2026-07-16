import { NextRequest, NextResponse } from 'next/server';
import { listAutomations, createAutomation } from '@/lib/email-marketing/service';
import { requirePermission } from '@/lib/api';

export async function GET() {
  const auth = await requirePermission('marketing.manage'); if (auth.response) return auth.response;
  try {
    const automations = await listAutomations();
    return NextResponse.json(automations);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('marketing.manage'); if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const automation = await createAutomation(body);
    return NextResponse.json(automation, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
