import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { AdminPermission, AdminAccessLevel } from '@/lib/admin-permissions';
import { hasAdminPermission, normalizeAdminAccessLevel } from '@/lib/admin-permissions';

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: 'user' | 'admin';
  accessLevel?: AdminAccessLevel | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function requireUser(): Promise<
  { user: SessionUser; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    };
  }
  return { user };
}

export async function requireAdmin(): Promise<
  { user: SessionUser; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const result = await requireUser();
  if (result.response) return result;
  if (result.user.role !== 'admin') {
    return {
      response: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }),
    };
  }
  return { user: result.user };
}

export async function requirePermission(permission: AdminPermission): Promise<
  { user: SessionUser & { accessLevel: AdminAccessLevel }; response?: undefined }
  | { user?: undefined; response: NextResponse }
> {
  const result = await requireAdmin();
  if (result.response) return result;
  const accessLevel = normalizeAdminAccessLevel(result.user.accessLevel);
  if (!hasAdminPermission(accessLevel, permission)) {
    return {
      response: NextResponse.json(
        { error: 'Seu perfil administrativo não possui permissão para esta ação.' },
        { status: 403 },
      ),
    };
  }
  return { user: { ...result.user, accessLevel } };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = 'Recurso não encontrado') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = 'Erro interno') {
  return NextResponse.json({ error: message }, { status: 500 });
}

export const VALID_CATEGORIES = ['chaveiros', 'escritorio', 'criaturas'] as const;
export type Category = string;

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
