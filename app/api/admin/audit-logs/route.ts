import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission, serverError } from '@/lib/api';
import { getAuditLogs } from '@/lib/feature-flags';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('audit.view');
  if (auth.response) return auth.response;

  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50', 10));
    const entity_type = searchParams.get('entity_type') ?? undefined;
    const user_email = searchParams.get('user_email') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const from_date = searchParams.get('from_date') ?? undefined;
    const to_date = searchParams.get('to_date') ?? undefined;

    const { logs, total } = await getAuditLogs({
      page,
      limit,
      entity_type,
      user_email,
      action,
      from_date,
      to_date,
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[api/admin/audit-logs] Error:', err);
    return serverError('Erro ao buscar audit logs');
  }
}
