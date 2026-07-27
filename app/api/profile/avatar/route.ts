import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { PROFILE_AVATAR_BUCKET } from '@/lib/profile-avatars';

const MAX_AVATAR_SIZE = 4 * 1024 * 1024;
const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function avatarPath(userId: string) {
  return `avatars/${userId}/profile`;
}

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { data: user } = await admin
    .from('users')
    .select('avatar_url')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (user?.avatar_url !== 'uploaded') {
    return NextResponse.json({ error: 'Foto de perfil não encontrada' }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from(PROFILE_AVATAR_BUCKET)
    .download(avatarPath(auth.user.id));

  if (error || !data) {
    return NextResponse.json({ error: 'Foto de perfil não encontrada' }, { status: 404 });
  }

  return new Response(data, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const formData = await request.formData();
  const avatar = formData.get('avatar');

  if (!(avatar instanceof File) || avatar.size === 0) {
    return NextResponse.json({ error: 'Selecione uma foto' }, { status: 400 });
  }
  if (!AVATAR_TYPES.has(avatar.type)) {
    return NextResponse.json({ error: 'Use uma foto JPG, PNG ou WebP' }, { status: 400 });
  }
  if (avatar.size > MAX_AVATAR_SIZE) {
    return NextResponse.json({ error: 'A foto deve ter no máximo 4 MB' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: bucket } = await admin.storage.getBucket(PROFILE_AVATAR_BUCKET);
  if (!bucket) {
    const { error: bucketError } = await admin.storage.createBucket(PROFILE_AVATAR_BUCKET, {
      public: false,
      fileSizeLimit: MAX_AVATAR_SIZE,
      allowedMimeTypes: [...AVATAR_TYPES],
    });
    if (bucketError) {
      return NextResponse.json({ error: 'Não foi possível preparar o envio da foto' }, { status: 500 });
    }
  }

  const path = avatarPath(auth.user.id);
  const { error: uploadError } = await admin.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, await avatar.arrayBuffer(), {
      contentType: avatar.type,
      cacheControl: '0',
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: 'Não foi possível enviar a foto' }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from('users')
    .update({ avatar_url: 'uploaded', updated_at: new Date().toISOString() })
    .eq('id', auth.user.id);

  if (updateError) {
    await admin.storage.from(PROFILE_AVATAR_BUCKET).remove([path]);
    return NextResponse.json({ error: 'Não foi possível salvar a foto no perfil' }, { status: 500 });
  }

  return NextResponse.json({
    avatar_url: 'uploaded',
    image_url: `/api/profile/avatar?v=${Date.now()}`,
  });
}

export async function DELETE() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('users')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', auth.user.id);

  if (error) {
    return NextResponse.json({ error: 'Não foi possível restaurar a inicial' }, { status: 500 });
  }

  await admin.storage.from(PROFILE_AVATAR_BUCKET).remove([avatarPath(auth.user.id)]);
  return NextResponse.json({ avatar_url: null });
}
