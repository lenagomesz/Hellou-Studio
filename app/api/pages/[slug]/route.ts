import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const { data, error } = await getSupabaseAdmin()
    .from('content_pages')
    .select('slug,title,excerpt,content,seo_title,seo_description,updated_at')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Página não encontrada.' }, { status: 404 });
  return NextResponse.json({ page: data });
}
