import { afterEach, describe, expect, it } from 'vitest';
import {
  decryptMercadoLivreToken,
  encryptMercadoLivreToken,
  explainMercadoLivreTokenError,
  getMercadoLivreConfig,
} from '@/lib/mercado-livre';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('Mercado Livre OAuth', () => {
  it('encrypts tokens at rest and decrypts them for server use', () => {
    process.env.MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY = 'test-only-secret-with-enough-entropy';
    const encrypted = encryptMercadoLivreToken('APP_USR-secret-token');

    expect(encrypted).not.toContain('APP_USR-secret-token');
    expect(decryptMercadoLivreToken(encrypted)).toBe('APP_USR-secret-token');
  });

  it('uses the exact production callback configured for the application', () => {
    process.env.MERCADO_LIVRE_APP_ID = '123';
    process.env.MERCADO_LIVRE_CLIENT_SECRET = 'secret';
    process.env.MERCADO_LIVRE_REDIRECT_URI = 'https://helloustudio.com.br/api/admin/mercado-livre/callback';

    expect(getMercadoLivreConfig('http://localhost:3000/anything').redirectUri)
      .toBe('https://helloustudio.com.br/api/admin/mercado-livre/callback');
  });

  it('identifies invalid client credentials clearly', () => {
    expect(explainMercadoLivreTokenError({ error: 'invalid_client' }, 'authorization_code'))
      .toContain('App ID (Client ID) ou Client Secret inválido');
  });

  it('distinguishes an expired refresh token', () => {
    expect(explainMercadoLivreTokenError({ error: 'invalid_grant' }, 'refresh_token'))
      .toContain('Refresh token expirado');
  });
});
