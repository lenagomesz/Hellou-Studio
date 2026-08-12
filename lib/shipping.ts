import { calcularPrecoPrazo } from 'correios-brasil';
import { getStoreSettings } from '@/lib/store-settings';

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  days_min: number;
  days_max: number;
  delivery_label?: string;
  service_type?: 'pac' | 'sedex' | 'carrier' | 'pickup';
}

export interface ShippingResult {
  options: ShippingOption[];
  address: { city: string; state: string; street: string; neighborhood: string };
}

export interface ShippingPackage {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface CorreiosResponse {
  Codigo: string;
  Valor: string;
  PrazoEntrega: string;
  Erro: string;
  MsgErro: string;
}

export interface MelhorEnvioQuote {
  id?: number;
  name?: string;
  price?: string;
  custom_price?: string;
  delivery_time?: number;
  custom_delivery_time?: number;
  error?: string;
  company?: { name?: string };
}

const DEFAULT_DIAMETER = '0';
const API_TIMEOUT_MS = 6000;
const MELHOR_ENVIO_PRODUCTION_URL = 'https://melhorenvio.com.br';

export function sanitizeCep(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
}

function normalizePackage(shippingPackage: ShippingPackage) {
  return {
    weightKg: Math.max(0.3, shippingPackage.weightGrams / 1000),
    lengthCm: Math.max(16, Math.ceil(shippingPackage.lengthCm)),
    widthCm: Math.max(11, Math.ceil(shippingPackage.widthCm)),
    heightCm: Math.max(2, Math.ceil(shippingPackage.heightCm)),
  };
}

function parsePositiveNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function parseMelhorEnvioQuotes(quotes: MelhorEnvioQuote[]): ShippingOption[] {
  const options = new Map<string, ShippingOption>();

  for (const quote of quotes) {
    if (quote.error) continue;
    const serviceName = String(quote.name ?? '').trim();
    const normalizedName = serviceName.toUpperCase();
    const serviceType = /\bSEDEX\b/.test(normalizedName) ? 'sedex' : /\bPAC\b/.test(normalizedName) ? 'pac' : 'carrier';
    const quoteId = Number(quote.id);
    if (!Number.isInteger(quoteId) || quoteId <= 0 || !serviceName) continue;
    const id = `melhor-envio-${quoteId}`;

    const price = parsePositiveNumber(quote.custom_price) ?? parsePositiveNumber(quote.price);
    const days = parsePositiveNumber(quote.custom_delivery_time) ?? parsePositiveNumber(quote.delivery_time);
    if (price === null || days === null) continue;

    const company = String(quote.company?.name ?? '').trim();
    const option: ShippingOption = {
      id,
      name: company && !serviceName.toUpperCase().includes(company.toUpperCase()) ? `${company} ${serviceName}` : serviceName,
      price: Math.round(price * 100) / 100,
      days_min: Math.ceil(days),
      days_max: Math.ceil(days),
      delivery_label: `Até ${Math.ceil(days)} dias úteis`,
      service_type: serviceType,
    };

    options.set(id, option);
  }

  return [...options.values()];
}

async function fetchMelhorEnvioRates(originCep: string, destCep: string, shippingPackage: ShippingPackage): Promise<ShippingOption[] | null> {
  const token = process.env.MELHOR_ENVIO_ACCESS_TOKEN?.trim();
  if (!token) {
    console.warn('[shipping] MELHOR_ENVIO_ACCESS_TOKEN não configurado; usando cotação real de contingência.');
    return null;
  }

  const apiUrl = (process.env.MELHOR_ENVIO_API_URL?.trim() || MELHOR_ENVIO_PRODUCTION_URL).replace(/\/$/, '');
  const userAgent = process.env.MELHOR_ENVIO_USER_AGENT?.trim() || 'Hellou Studio (studiohellou@gmail.com.br)';
  const pkg = normalizePackage(shippingPackage);

  try {
    const response = await fetch(`${apiUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
      body: JSON.stringify({
        from: { postal_code: originCep },
        to: { postal_code: destCep },
        volumes: [{
          width: pkg.widthCm,
          height: pkg.heightCm,
          length: pkg.lengthCm,
          weight: Number(pkg.weightKg.toFixed(3)),
        }],
        options: { receipt: false, own_hand: false },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const quotes = await response.json() as MelhorEnvioQuote[];
    const options = parseMelhorEnvioQuotes(Array.isArray(quotes) ? quotes : []);
    return options.length > 0 ? options : null;
  } catch (error) {
    console.warn('[shipping] Melhor Envio indisponível:', error instanceof Error ? error.message : error);
    return null;
  }
}

function parseCorreiosPrice(value: string): number {
  return parseFloat(value.replace('.', '').replace(',', '.'));
}

async function fetchCorreiosRates(originCep: string, destCep: string, shippingPackage: ShippingPackage): Promise<ShippingOption[] | null> {
  try {
    const pkg = normalizePackage(shippingPackage);
    const args = {
      sCepOrigem: originCep,
      sCepDestino: destCep,
      nVlPeso: pkg.weightKg.toFixed(3),
      nCdFormato: '1',
      nVlComprimento: String(pkg.lengthCm),
      nVlAltura: String(pkg.heightCm),
      nVlLargura: String(pkg.widthCm),
      nVlDiametro: DEFAULT_DIAMETER,
      nCdServico: ['04510', '04014'],
    };

    const response: CorreiosResponse[] = await Promise.race([
      calcularPrecoPrazo(args),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), API_TIMEOUT_MS)),
    ]);
    const options: ShippingOption[] = [];

    for (const item of response) {
      if (item.Erro && item.Erro !== '0' && item.Erro !== '010') continue;
      const price = parseCorreiosPrice(item.Valor);
      if (price <= 0) continue;
      const days = parseInt(item.PrazoEntrega, 10) || 0;
      if (item.Codigo === '04510') options.push({ id: 'pac', name: 'Correios PAC', price, days_min: days, days_max: days + 3, delivery_label: `${days} a ${days + 3} dias úteis`, service_type: 'pac' });
      if (item.Codigo === '04014') options.push({ id: 'sedex', name: 'Correios SEDEX', price, days_min: days, days_max: days + 1, delivery_label: `${days} a ${days + 1} dias úteis`, service_type: 'sedex' });
    }
    return options.length > 0 ? options : null;
  } catch (error) {
    console.warn('[shipping] Cotação de contingência dos Correios indisponível:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function calculateShipping(rawCep: string, packageOverride?: Partial<ShippingPackage>): Promise<ShippingResult> {
  const cep = sanitizeCep(rawCep);
  if (!cep) throw new Error('CEP inválido. Use 8 dígitos.');
  const settings = await getStoreSettings();
  const originCep = sanitizeCep(settings.shipping.originCep);
  if (!originCep) throw new Error('O CEP de origem da loja não está configurado corretamente.');

  const shippingPackage: ShippingPackage = {
    weightGrams: Math.max(1, packageOverride?.weightGrams ?? settings.shipping.defaultWeightGrams),
    lengthCm: Math.max(1, packageOverride?.lengthCm ?? settings.shipping.defaultLengthCm),
    widthCm: Math.max(1, packageOverride?.widthCm ?? settings.shipping.defaultWidthCm),
    heightCm: Math.max(1, packageOverride?.heightCm ?? settings.shipping.defaultHeightCm),
  };

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error('Não foi possível consultar o CEP.');
  const data: ViaCepResponse = await res.json();
  if (data.erro) throw new Error('CEP não encontrado.');

  const quotedOptions = await fetchMelhorEnvioRates(originCep, cep, shippingPackage)
    ?? await fetchCorreiosRates(originCep, cep, shippingPackage);
  if (!quotedOptions) {
    throw new Error('Não foi possível consultar o valor real do frete para este CEP. Tente novamente em instantes.');
  }

  const options = quotedOptions.filter((option) => {
    if (option.service_type === 'sedex') return settings.shipping.sedexEnabled;
    return settings.shipping.pacEnabled;
  });
  if (options.length === 0) throw new Error('Nenhuma modalidade de frete está disponível para este CEP.');

  return {
    options,
    address: { city: data.localidade, state: data.uf, street: data.logradouro, neighborhood: data.bairro },
  };
}
