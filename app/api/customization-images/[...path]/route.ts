import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

const BUCKET = 'customization-images';

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { path } = await context.params;
  if (!path.length || (auth.user.role !== 'admin' && path[0] !== auth.user.id)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const storagePath = path.join('/');
  const { data, error } = await getSupabaseAdmin().storage.from(BUCKET).download(storagePath);
  if (error || !data) return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 });

  return new NextResponse(data, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
