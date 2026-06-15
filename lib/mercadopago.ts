import { MercadoPagoConfig, Payment } from 'mercadopago';

let cached: MercadoPagoConfig | null = null;

export function getMercadoPagoClient(): MercadoPagoConfig {
  if (cached) return cached;
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Missing MERCADO_PAGO_ACCESS_TOKEN environment variable');
  }
  cached = new MercadoPagoConfig({ accessToken });
  return cached;
}

export function getPaymentClient(): Payment {
  return new Payment(getMercadoPagoClient());
}

export function getMPPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
  if (!key) throw new Error('Missing NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY');
  return key;
}
