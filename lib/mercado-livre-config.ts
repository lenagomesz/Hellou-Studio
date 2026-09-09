export const MERCADO_LIVRE_CALLBACK_PATH = '/api/admin/mercado-livre/callback';

export type MercadoLivreApiError = {
  error?: string;
  error_description?: string;
  message?: string;
};

export function getMercadoLivreConfig(requestUrl?: string) {
  const appId = process.env.MERCADO_LIVRE_APP_ID ?? process.env.MERCADO_LIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET;
  const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI
    ?? (requestUrl ? new URL(MERCADO_LIVRE_CALLBACK_PATH, requestUrl).toString() : undefined);

  if (!appId) throw new Error('App ID (Client ID) ausente. Configure MERCADO_LIVRE_APP_ID na hospedagem.');
  if (!/^\d+$/.test(appId)) throw new Error('App ID (Client ID) inválido. Ele deve conter apenas os números informados pelo Mercado Livre.');
  if (!clientSecret) throw new Error('Client Secret ausente. Configure MERCADO_LIVRE_CLIENT_SECRET na hospedagem.');
  if (!redirectUri) throw new Error('URL de redirecionamento ausente. Configure MERCADO_LIVRE_REDIRECT_URI.');
  try {
    const parsedRedirect = new URL(redirectUri);
    if (parsedRedirect.pathname !== MERCADO_LIVRE_CALLBACK_PATH) throw new Error('path');
  } catch {
    throw new Error(`URL de redirecionamento inválida. Use exatamente https://helloustudio.com.br${MERCADO_LIVRE_CALLBACK_PATH}.`);
  }
  return { appId, clientSecret, redirectUri };
}

export function explainMercadoLivreTokenError(error: MercadoLivreApiError, grantType: string) {
  const code = error.error?.toLowerCase() ?? '';
  const details = `${error.error_description ?? ''} ${error.message ?? ''}`.toLowerCase();
  if (/code_verifier/.test(details)) {
    return 'O Mercado Livre exige o verificador PKCE. Inicie uma nova conexão pelo botão do painel; não abra o callback diretamente.';
  }
  if (code === 'invalid_client' || /client.+(invalid|incorrect)|invalid.+client/.test(details)) {
    return 'App ID (Client ID) ou Client Secret inválido. Confira as duas credenciais no painel de aplicativos do Mercado Livre.';
  }
  if (code === 'invalid_grant' && grantType === 'refresh_token') {
    return 'Refresh token expirado, revogado ou já utilizado. Desconecte e autorize novamente a conta do Mercado Livre.';
  }
  if (code === 'invalid_grant' || /redirect_uri|callback/.test(details)) {
    return 'Código de autorização expirado ou URL de redirecionamento diferente. Confirme o callback cadastrado e conecte novamente.';
  }
  if (code === 'unauthorized_client') {
    return 'Este aplicativo não está autorizado para o fluxo OAuth. Revise as permissões no Mercado Livre.';
  }
  return error.error_description ?? error.message ?? 'O Mercado Livre não retornou um token de acesso.';
}
