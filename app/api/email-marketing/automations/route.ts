import { NextRequest, NextResponse } from 'next/server';
import { listAutomations, createAutomation } from '@/lib/email-marketing/service';

export async function GET() {
  try {
    const automations = await listAutomations();
    return NextResponse.json(automations);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const automation = await createAutomation(body);
    return NextResponse.json(automation, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
