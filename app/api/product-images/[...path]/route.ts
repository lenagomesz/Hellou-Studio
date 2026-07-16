import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const BUCKET = 'products';

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const path = segments.map(decodeURIComponent).join('/');
  if (!path.startsWith('product-images/')) {
    return NextResponse.json({ error: 'Imagem inválida' }, { status: 404 });
  }

  const { data, error } = await getSupabaseAdmin().storage.from(BUCKET).download(path);
  if (error || !data) return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 });

  return new Response(data, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
