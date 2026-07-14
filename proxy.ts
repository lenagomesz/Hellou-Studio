import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { isRestrictedAdminPath, normalizeAdminAccessLevel } from '@/lib/admin-permissions';

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/api/debug')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (pathname.startsWith('/api/auth/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'anonymous';

    const isForgotPassword = pathname.includes('forgot-password');
    const maxRequests = isForgotPassword ? 3 : 5;

    const key = `auth:${ip}:${pathname}`;
    const result = rateLimit(key, { maxRequests, windowMs: 60_000 });

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
    secret: process.env.NEXTAUTH_SECRET,
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
