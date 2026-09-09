import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { exchangeMercadoLivreCode, saveMercadoLivreConnection } from '@/lib/mercado-livre';

export const runtime = 'nodejs';

function dashboardRedirect(request: NextRequest, key: 'ml_connected' | 'ml_error', value: string) {
  return NextResponse.redirect(new URL(`/dashboard/mercado-livre?${key}=${encodeURIComponent(value)}`, request.url));
}

function clearStateCookie(response: NextResponse) {
  for (const name of ['hellou_ml_oauth_state', 'hellou_ml_pkce_verifier']) {
    response.cookies.set(name, '', {
      httpOnly: true,
      secure: response.url.startsWith('https:'),
      sameSite: 'lax',
      path: '/api/admin/mercado-livre',
      maxAge: 0,
    });
  }
}

function matchesState(received: string, stored: string) {
  const receivedBuffer = Buffer.from(received);
  const storedBuffer = Buffer.from(stored);
  return receivedBuffer.length === storedBuffer.length && timingSafeEqual(receivedBuffer, storedBuffer);
}

export async function GET(request: NextRequest) {
  const authorizationError = request.nextUrl.searchParams.get('error');
  if (authorizationError) {
    return dashboardRedirect(request, 'ml_error', 'A autorização foi cancelada ou recusada pelo Mercado Livre.');
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const storedState = request.cookies.get('hellou_ml_oauth_state')?.value;
  const codeVerifier = request.cookies.get('hellou_ml_pkce_verifier')?.value;
  if (!code) {
    return dashboardRedirect(request, 'ml_error', 'Código de autorização ausente. O Mercado Livre não enviou o código necessário para gerar o token.');
  }
  if (!state || !storedState || !matchesState(state, storedState)) {
    return dashboardRedirect(request, 'ml_error', 'Retorno de autorização inválido ou expirado. Inicie a conexão novamente.');
  }
  if (!codeVerifier) {
    return dashboardRedirect(request, 'ml_error', 'Verificador PKCE ausente ou expirado. Inicie a conexão novamente pelo botão do painel.');
  }

  const auth = await requirePermission('settings.manage');
  if (auth.response) {
    return dashboardRedirect(request, 'ml_error', 'Sua sessão administrativa expirou. Entre novamente e refaça a conexão.');
  }

  try {
    const token = await exchangeMercadoLivreCode(code, request.url, codeVerifier);
    const profileResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: 'no-store',
    });
    const profile = profileResponse.ok ? await profileResponse.json() as { nickname?: string } : null;
    await saveMercadoLivreConnection(auth.user.id, token, profile?.nickname ?? null);

    const response = dashboardRedirect(request, 'ml_connected', '1');
    clearStateCookie(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao concluir a autorização.';
    const response = dashboardRedirect(request, 'ml_error', message);
    clearStateCookie(response);
    return response;
  }
}
