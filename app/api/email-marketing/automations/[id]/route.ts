import { NextRequest, NextResponse } from 'next/server';
import { updateAutomation, deleteAutomation, toggleAutomation } from '@/lib/email-marketing/service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Handle toggle action
    if ('enabled' in body && Object.keys(body).length === 1) {
      const automation = await toggleAutomation(id, body.enabled);
      return NextResponse.json(automation);
    }

    const automation = await updateAutomation(id, body);
    return NextResponse.json(automation);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteAutomation(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
