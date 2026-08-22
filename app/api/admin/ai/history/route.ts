import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
    const type = searchParams.get('type');

    const admin = getSupabaseAdmin();
    let query = admin.from('ai_generated_content').select('*', { count: 'exact' });

    if (type) {
      query = query.eq('feature_type', type);
    }

    const from = (page - 1) * limit;
    const { data, count, error } = await query
      .order('generated_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, pages },
    });
  } catch (error) {
    console.error('[history GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('ai_generated_content')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[history DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}
