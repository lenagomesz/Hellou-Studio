import { NextRequest, NextResponse } from 'next/server';
import { listTemplates, createTemplate } from '@/lib/email-marketing/service';
import { preBuiltTemplates } from '@/lib/email-marketing/templates';

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get('category') || undefined;
    const includePrebuilt = req.nextUrl.searchParams.get('prebuilt') === 'true';

    const templates = await listTemplates(category);

    if (includePrebuilt) {
      return NextResponse.json({
        custom: templates,
        prebuilt: preBuiltTemplates,
      });
    }

    return NextResponse.json(templates);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const template = await createTemplate(body);
    return NextResponse.json(template, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
