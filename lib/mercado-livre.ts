import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  explainMercadoLivreTokenError,
  getMercadoLivreConfig,
  type MercadoLivreApiError,
} from '@/lib/mercado-livre-config';

const TOKEN_ENDPOINT = 'https://api.mercadolibre.com/oauth/token';

type MercadoLivreTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
  scope?: string;
};

type MercadoLivreConnectionRow = {
  admin_user_id: string;
  ml_user_id: string;
  ml_nickname: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: string;
};

function encryptionKey() {
  const secret = process.env.MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Configure MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY para proteger os tokens.');
  return createHash('sha256').update(secret).digest();
}

export function encryptMercadoLivreToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptMercadoLivreToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Token armazenado em formato inválido.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function databaseConnectionError(message: string) {
  if (/mercado_livre_connections|relation.+does not exist|schema cache/i.test(message)) {
    return 'A tabela de conexão não existe. Aplique a migration 20260909_mercado_livre_oauth.sql no Supabase.';
  }
  return `Erro ao acessar a conexão do Mercado Livre: ${message}`;
}

async function requestToken(body: URLSearchParams): Promise<MercadoLivreTokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  const data = await response.json() as MercadoLivreTokenResponse & MercadoLivreApiError;
  if (!response.ok || !data.access_token || !data.refresh_token) {
    throw new Error(explainMercadoLivreTokenError(data, body.get('grant_type') ?? ''));
  }
  return data;
}

export async function exchangeMercadoLivreCode(code: string, requestUrl: string) {
  const config = getMercadoLivreConfig(requestUrl);
  return requestToken(new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.appId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
  }));
}

export async function saveMercadoLivreConnection(
  adminUserId: string,
  token: MercadoLivreTokenResponse,
  nickname: string | null,
) {
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
  const { error } = await getSupabaseAdmin().from('mercado_livre_connections').upsert({
    admin_user_id: adminUserId,
    ml_user_id: String(token.user_id),
    ml_nickname: nickname,
    access_token_encrypted: encryptMercadoLivreToken(token.access_token),
    refresh_token_encrypted: encryptMercadoLivreToken(token.refresh_token),
    expires_at: expiresAt,
    scope: token.scope ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'admin_user_id' });
  if (error) throw new Error(databaseConnectionError(error.message));
}

export async function getMercadoLivreConnection(adminUserId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('mercado_livre_connections')
    .select('admin_user_id, ml_user_id, ml_nickname, access_token_encrypted, refresh_token_encrypted, expires_at')
    .eq('admin_user_id', adminUserId)
    .maybeSingle();
  if (error) throw new Error(databaseConnectionError(error.message));
  return data as MercadoLivreConnectionRow | null;
}

export async function getValidMercadoLivreToken(adminUserId: string, requestUrl?: string) {
  const connection = await getMercadoLivreConnection(adminUserId);
  if (!connection) throw new Error('Token de acesso ausente. Conecte sua conta do Mercado Livre antes de sincronizar.');

  const refreshThreshold = Date.now() + 5 * 60 * 1000;
  if (new Date(connection.expires_at).getTime() > refreshThreshold) {
    try {
      return { accessToken: decryptMercadoLivreToken(connection.access_token_encrypted), userId: connection.ml_user_id };
    } catch {
      throw new Error('Não foi possível descriptografar o token salvo. Confira MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY ou conecte a conta novamente.');
    }
  }

  const config = getMercadoLivreConfig(requestUrl);
  let refreshToken: string;
  try {
    refreshToken = decryptMercadoLivreToken(connection.refresh_token_encrypted);
  } catch {
    throw new Error('Não foi possível descriptografar o refresh token. Confira MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY ou conecte a conta novamente.');
  }
  const token = await requestToken(new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.appId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  }));
  await saveMercadoLivreConnection(adminUserId, token, connection.ml_nickname);
  return { accessToken: token.access_token, userId: String(token.user_id) };
}
