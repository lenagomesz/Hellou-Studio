import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, serverError, badRequest } from '@/lib/api';
import { sendAdminNewPrintRequestEmail } from '@/lib/email';
import type { PrintRequest } from '@/types/database';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const isAdmin = searchParams.get('admin') === 'true';

  const admin = getSupabaseAdmin();

  if (isAdmin && auth.user.role === 'admin') {
    const { data, error } = await admin
      .from('print_requests')
      .select('*, user:users!print_requests_user_id_fkey(id, email, name)')
      .order('created_at', { ascending: false });

    if (error) return serverError('Erro ao buscar solicitações');
    return NextResponse.json({ requests: (data ?? []) as (PrintRequest & { user: { id: string; email: string; name: string | null } | null })[] });
  }

  const { data, error } = await admin
    .from('print_requests')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return serverError('Erro ao buscar solicitações');

  return NextResponse.json({ requests: (data ?? []) as PrintRequest[] });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest('Formulário inválido');
  }

  const title = formData.get('title') as string | null;
  const description = formData.get('description') as string | null;
  const notes = formData.get('notes') as string | null;
  const file = formData.get('file') as File | null;

  if (!title?.trim()) return badRequest('Título é obrigatório');
  if (!file) return badRequest('Arquivo STL é obrigatório');

  if (!file.name.toLowerCase().endsWith('.stl')) {
    return badRequest('Apenas arquivos .stl são aceitos');
  }

  if (file.size > MAX_FILE_SIZE) {
    return badRequest('Arquivo muito grande (máximo 50MB)');
  }

  const admin = getSupabaseAdmin();

  const fileName = `${auth.user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from('stl-uploads')
    .upload(fileName, buffer, {
      contentType: 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    console.error('[print-requests] upload error:', uploadError);
    return serverError('Erro ao fazer upload do arquivo');
  }

  const { data: urlData } = admin.storage
    .from('stl-uploads')
    .getPublicUrl(fileName);

  const { data, error } = await admin
    .from('print_requests')
    .insert({
      user_id: auth.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      notes: notes?.trim() || null,
      stl_file_url: urlData.publicUrl,
      stl_file_name: file.name,
      stl_file_size: file.size,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[print-requests] insert error:', error);
    return serverError('Erro ao criar solicitação');
  }

  // Notify admin
  const { data: admins } = await admin
    .from('users')
    .select('email')
    .eq('role', 'admin')
    .limit(5);

  if (admins?.length) {
    const { data: currentUser } = await admin
      .from('users')
      .select('email, name')
      .eq('id', auth.user.id)
      .single();

    for (const adm of admins) {
      sendAdminNewPrintRequestEmail({
        adminEmail: adm.email,
        requestId: data.id,
        title: data.title,
        customerName: currentUser?.name ?? null,
        customerEmail: currentUser?.email ?? auth.user.email ?? '',
      }).catch(() => {});
    }
  }

  return NextResponse.json({ request: data as PrintRequest }, { status: 201 });
}
