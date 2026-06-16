import { NextResponse } from 'next/server';
import { requireUser, serverError, badRequest } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('users')
    .select('id, name, email, phone, cpf, role, created_at')
    .eq('id', user.id)
    .single();

  if (error || !data) return serverError('Erro ao buscar perfil');

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Corpo inválido');

  const allowedFields = ['name', 'phone', 'cpf'] as const;
  const updates: Record<string, string | null> = {};

  for (const field of allowedFields) {
    if (field in body) {
      const val = body[field];
      updates[field] = typeof val === 'string' && val.trim() ? val.trim() : null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return badRequest('Nenhum campo para atualizar');
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select('id, name, email, phone, cpf, role, created_at')
    .single();

  if (error || !data) return serverError('Erro ao atualizar perfil');

  return NextResponse.json(data);
}
