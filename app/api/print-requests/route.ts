import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, serverError, badRequest } from '@/lib/api';
import { sendAdminNewPrintRequestEmail, sendPrintRequestStatusEmail } from '@/lib/email';
import { createAdminAlert } from '@/lib/admin-alerts';
import type { PrintRequest } from '@/types/database';

// Configure larger payload size for STL file uploads
export const maxDuration = 300;

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

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
  const makerLink = formData.get('makerworld_link') as string | null;

  if (!title?.trim()) return badRequest('Título é obrigatório');

  const hasFile = file !== null;
  const hasLink = (makerLink?.trim().length ?? 0) > 0;

  if (!hasFile && !hasLink) {
    return badRequest('Envie um arquivo STL ou um link do Makerworld');
  }

  if (hasFile && hasLink) {
    return badRequest('Escolha uma opção: arquivo ou link (não ambos)');
  }

  const admin = getSupabaseAdmin();
  let stlFileUrl = null;
  let stlFileName = null;
  let stlFileSize = null;

  // Handle STL file upload
  if (hasFile) {
    if (!file.name.toLowerCase().endsWith('.stl')) {
      return badRequest('Apenas arquivos .stl são aceitos');
    }

    if (file.size > MAX_FILE_SIZE) {
      return badRequest('Arquivo muito grande (máximo 100MB)');
    }

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

    const { data: urlData } = admin.storage.from('stl-uploads').getPublicUrl(fileName);
    stlFileUrl = urlData.publicUrl;
    stlFileName = file.name;
    stlFileSize = file.size;
  }

  const { data, error } = await admin
    .from('print_requests')
    .insert({
      user_id: auth.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      notes: notes?.trim() || null,
      stl_file_url: stlFileUrl,
      stl_file_name: stlFileName,
      stl_file_size: stlFileSize,
      makerworld_link: hasLink ? makerLink?.trim() : null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[print-requests] insert error:', JSON.stringify(error, null, 2));
    console.error('[print-requests] error message:', error.message);
    console.error('[print-requests] error code:', error.code);
    return serverError(`Erro ao criar solicitação: ${error.message || error.code || 'desconhecido'}`);
  }

  const { data: currentUser } = await admin
    .from('users')
    .select('email, name')
    .eq('id', auth.user.id)
    .single();

  // Create admin alert for real-time notification
  createAdminAlert({
    type: 'new_print_request',
    title: `Nova solicitação de impressão: ${data.title}`,
    body: `Solicitado por: ${currentUser?.name || auth.user.email}`,
    priority: 'urgent',
    related_print_request_id: data.id,
  }).catch(err => console.error('[admin-alerts] create failed:', err));

  // Notify admin and user
  // Send confirmation email to user
  if (currentUser?.email) {
    sendPrintRequestStatusEmail({
      email: currentUser.email,
      nome: currentUser.name,
      title: data.title,
      newStatus: 'pending',
      requestId: data.id,
    }).catch(err => console.error('[email] user confirmation failed:', err));
  }

  // Notify admin
  sendAdminNewPrintRequestEmail({
    adminEmail: 'studiohellou@gmail.com',
    requestId: data.id,
    title: data.title,
    customerName: currentUser?.name ?? null,
    customerEmail: currentUser?.email ?? auth.user.email ?? '',
  }).catch(err => console.error('[email] admin notification failed:', err));

  return NextResponse.json({ request: data as PrintRequest }, { status: 201 });
}
