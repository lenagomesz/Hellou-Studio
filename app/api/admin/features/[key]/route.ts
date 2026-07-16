import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission, badRequest, notFound, serverError } from '@/lib/api';
import { getFeatureFlag, toggleFeatureFlag, getFeatureUsageStats, getFeatureHealth } from '@/lib/feature-flags';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  const { key } = await params;

  try {
    const flag = await getFeatureFlag(key);
    if (!flag) {
      return notFound('Feature flag não encontrada');
    }

    const stats = await getFeatureUsageStats(key);
    const health = getFeatureHealth(flag);

    return NextResponse.json({ flag, stats, health });
  } catch (err) {
    console.error('[api/admin/features/[key]] GET Error:', err);
    return serverError('Erro ao buscar feature flag');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  const { key } = await params;

  try {
    const body = await req.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return badRequest('Campo "enabled" (boolean) é obrigatório');
    }

    const result = await toggleFeatureFlag(
      key,
      enabled,
      auth.user.id,
      auth.user.email,
    );

    if (!result.success) {
      return badRequest(result.error ?? 'Erro ao alterar feature flag');
    }

    return NextResponse.json({ success: true, flag: result.flag });
  } catch (err) {
    console.error('[api/admin/features/[key]] PATCH Error:', err);
    return serverError('Erro ao alterar feature flag');
  }
}
