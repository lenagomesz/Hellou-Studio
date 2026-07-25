import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { durableRateLimit } from '@/lib/durable-rate-limit';
import { isRestrictedAdminPath, normalizeAdminAccessLevel } from '@/lib/admin-permissions';
import { getAuthSecret } from '@/lib/security-env';

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/api/debug')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const sensitiveAuthRequest = request.method === 'POST' && (
    pathname.includes('/api/auth/callback/credentials')
    || pathname === '/api/auth/register'
    || pathname === '/api/auth/forgot-password'
    || pathname === '/api/auth/reset-password'
  );
  if (sensitiveAuthRequest) {
    const isPasswordRecovery = pathname.includes('forgot-password') || pathname.includes('reset-password');
    const result = await durableRateLimit(request, `auth:${pathname}`, {
      maxRequests: isPasswordRecovery ? 3 : 5,
      windowMs: 60_000,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }
  }

  const token = await getToken({
    req: request,
    secret: getAuthSecret(),
  });

  const isAdminRoute = pathname.startsWith('/dashboard');
  const isAccountRoute = pathname.startsWith('/account');
  const isMarketingApi = pathname.startsWith('/api/email-marketing')
    && !pathname.startsWith('/api/email-marketing/unsubscribe');

  if (!isAdminRoute && !isAccountRoute && !isMarketingApi) {
    return NextResponse.next();
  }

  if (!token) {
    if (isMarketingApi) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  const legacyCustomerOrderMatch = pathname.match(/^\/dashboard\/orders\/([^/]+)$/);
  if (isAdminRoute && token.role !== 'admin' && legacyCustomerOrderMatch) {
    const customerOrderUrl = new URL(`/account/orders/${legacyCustomerOrderMatch[1]}`, request.url);
    return NextResponse.redirect(customerOrderUrl);
  }

  if (isAdminRoute && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isMarketingApi && (token.role !== 'admin' || normalizeAdminAccessLevel(token.accessLevel) !== 'owner')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  if (isAdminRoute && isRestrictedAdminPath(pathname, normalizeAdminAccessLevel(token.accessLevel))) {
    return NextResponse.redirect(new URL('/dashboard?access=restricted', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/account/:path*', '/api/debug/:path*', '/api/auth/:path*', '/api/email-marketing/:path*'],
};
