import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('ai_generated_content')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[history GET/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entry' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('ai_generated_content')
      .update({ content: JSON.stringify(content) })
      .eq('id', params.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Update failed' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[history PATCH/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('ai_generated_content')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[history DELETE/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}
