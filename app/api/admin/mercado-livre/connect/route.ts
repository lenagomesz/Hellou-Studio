import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getMercadoLivreConfig } from '@/lib/mercado-livre-config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  try {
    const config = getMercadoLivreConfig(request.url);
    const state = randomBytes(32).toString('base64url');
    const authorizationUrl = new URL('https://auth.mercadolivre.com.br/authorization');
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('client_id', config.appId);
    authorizationUrl.searchParams.set('redirect_uri', config.redirectUri);
    authorizationUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set('hellou_ml_oauth_state', state, {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/api/admin/mercado-livre',
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível iniciar a conexão.';
    return NextResponse.redirect(new URL(`/dashboard/mercado-livre?ml_error=${encodeURIComponent(message)}`, request.url));
  }
}
