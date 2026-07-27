import { NextResponse } from 'next/server';
import { requireUser, serverError, badRequest } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isProfileAvatar, PROFILE_AVATAR_BUCKET } from '@/lib/profile-avatars';

const PROFILE_FIELDS = 'id, name, email, phone, cpf, avatar_url, role, created_at';

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('users')
    .select(PROFILE_FIELDS)
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

  if ('avatar_url' in body) {
    const avatarUrl = body.avatar_url;
    if (avatarUrl !== null && !isProfileAvatar(avatarUrl)) {
      return badRequest('Avatar inválido');
    }
    updates.avatar_url = avatarUrl;
  }

  if (Object.keys(updates).length === 0) {
    return badRequest('Nenhum campo para atualizar');
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select(PROFILE_FIELDS)
    .single();

  if (error || !data) return serverError('Erro ao atualizar perfil');

  if ('avatar_url' in body && body.avatar_url !== 'uploaded') {
    await admin.storage.from(PROFILE_AVATAR_BUCKET).remove([`avatars/${user.id}/profile`]);
  }

  return NextResponse.json(data);
}
