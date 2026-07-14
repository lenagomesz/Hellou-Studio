const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY',
  'MERCADO_PAGO_ACCESS_TOKEN',
  'MERCADO_PAGO_WEBHOOK_SECRET',
  'E2E_PHYSICAL_PRODUCT_ID',
  'E2E_CUSTOM_PRODUCT_ID',
  'E2E_STL_PRODUCT_ID',
  'E2E_COUPON_CODE',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_EMAIL_DOMAIN',
  'E2E_CPF',
  'E2E_CEP',
  'E2E_CARD_NUMBER',
  'E2E_CARD_NAME',
  'E2E_CARD_EXPIRY',
  'E2E_CARD_CVV',
] as const;

export function requireE2EEnvironment() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Variáveis E2E ausentes: ${missing.join(', ')}`);
}

export function e2eValue(key: typeof REQUIRED[number]) {
  const value = process.env[key];
  if (!value) throw new Error(`Variável E2E ausente: ${key}`);
  return value;
}
