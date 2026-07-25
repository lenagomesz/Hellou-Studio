import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission, badRequest, serverError } from '@/lib/api';
import { createAuditLog } from '@/lib/feature-flags';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_STORE_SETTINGS, normalizeStoreSettings } from '@/lib/store-settings';

export async function GET() {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from('store_settings')
    .select('settings, updated_at, updated_by')
    .eq('id', 'default')
    .maybeSingle();

  if (error && error.code !== '42P01') return serverError('Erro ao carregar as configurações da loja');

  return NextResponse.json({
    settings: data ? normalizeStoreSettings(data.settings) : DEFAULT_STORE_SETTINGS,
    updatedAt: data?.updated_at ?? null,
    updatedBy: data?.updated_by ?? null,
    migrationRequired: error?.code === '42P01',
  });
}

export async function PUT(request: Request) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const settings = normalizeStoreSettings(input);
  const updatedAt = new Date().toISOString();
  const { error } = await getSupabaseAdmin()
    .from('store_settings')
    .upsert({
      id: 'default',
      settings,
      updated_at: updatedAt,
      updated_by: auth.user.email,
    }, { onConflict: 'id' });

  if (error?.code === '42P01') return serverError('A migração da Central da Loja ainda não foi aplicada no Supabase');
  if (error) return serverError('Erro ao salvar as configurações da loja');

  await createAuditLog({
    user_id: auth.user.id,
    user_email: auth.user.email,
    action: 'store_settings_updated',
    entity_type: 'store_settings',
    entity_id: 'default',
    entity_name: settings.identity.name,
    details: { sections: Object.keys(settings) },
  });

  revalidateTag('store-settings', { expire: 0 });
  revalidatePath('/', 'layout');
  return NextResponse.json({ settings, updatedAt, updatedBy: auth.user.email });
}

