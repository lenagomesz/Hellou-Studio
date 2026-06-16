import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin, serverError } from '@/lib/api';
import { sanitizeSearchInput } from '@/lib/security';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const rawSearch = req.nextUrl.searchParams.get('search') ?? '';
  const search = sanitizeSearchInput(rawSearch);
  const admin = getSupabaseAdmin();

  let query = admin
    .from('users')
    .select('id, email, name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (search.trim()) {
    query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return serverError('Erro ao buscar usuários');

  return NextResponse.json({ users: data ?? [] });
}
