import { NextResponse } from 'next/server';
import { requireUser, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('users')
    .select('id, name, email, phone, cpf, role')
    .eq('id', user.id)
    .single();

  if (error || !data) return serverError('Erro ao buscar perfil');

  return NextResponse.json(data);
}
