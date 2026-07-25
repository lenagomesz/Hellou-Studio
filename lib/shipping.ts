import { calcularPrecoPrazo } from 'correios-brasil';
import { getStoreSettings } from '@/lib/store-settings';

export interface ShippingOption {
  id: 'pac' | 'sedex' | 'pickup';
  name: string;
  price: number;
  days_min: number;
  days_max: number;
}

export interface ShippingResult {
  options: ShippingOption[];
  address: { city: string; state: string; street: string; neighborhood: string };
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

// --- Correios API config ---
const DEFAULT_DIAMETER = '0';
const API_TIMEOUT_MS = 3000;

// --- Fallback: tabela fixa por região ---
type Region = 'local' | 'vizinhos' | 'sudeste' | 'centro_oeste' | 'nordeste' | 'norte';

const RATES: Record<Region, { pac: number; sedex: number; pac_min: number; pac_max: number; sedex_min: number; sedex_max: number }> = {
  local:        { pac: 14.90, sedex: 22.90, pac_min: 3,  pac_max: 5,  sedex_min: 1, sedex_max: 2 },
  vizinhos:     { pac: 17.90, sedex: 26.90, pac_min: 4,  pac_max: 6,  sedex_min: 2, sedex_max: 3 },
  sudeste:      { pac: 22.90, sedex: 32.90, pac_min: 5,  pac_max: 8,  sedex_min: 3, sedex_max: 4 },
  centro_oeste: { pac: 26.90, sedex: 36.90, pac_min: 7,  pac_max: 10, sedex_min: 4, sedex_max: 5 },
  nordeste:     { pac: 29.90, sedex: 42.90, pac_min: 8,  pac_max: 12, sedex_min: 5, sedex_max: 7 },
  norte:        { pac: 34.90, sedex: 48.90, pac_min: 10, pac_max: 15, sedex_min: 6, sedex_max: 8 },
};

const UF_REGION: Record<string, Region> = {
  SC: 'local',
  PR: 'vizinhos',
  RS: 'vizinhos',
  SP: 'sudeste',
  RJ: 'sudeste',
  MG: 'sudeste',
  ES: 'sudeste',
  GO: 'centro_oeste',
  MT: 'centro_oeste',
  MS: 'centro_oeste',
  DF: 'centro_oeste',
  BA: 'nordeste',
  SE: 'nordeste',
  AL: 'nordeste',
  PE: 'nordeste',
  PB: 'nordeste',
  RN: 'nordeste',
  CE: 'nordeste',
  PI: 'nordeste',
  MA: 'nordeste',
  AM: 'norte',
  PA: 'norte',
  AP: 'norte',
  RO: 'norte',
  RR: 'norte',
  AC: 'norte',
  TO: 'norte',
};

export function sanitizeCep(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return digits;
}

interface CorreiosResponse {
  Codigo: string;
  Valor: string;
  PrazoEntrega: string;
  Erro: string;
  MsgErro: string;
}

function parseCorreiosPrice(value: string): number {
  return parseFloat(value.replace('.', '').replace(',', '.'));
}

export interface ShippingPackage {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

async function fetchCorreiosRates(destCep: string, shippingPackage: ShippingPackage): Promise<ShippingOption[] | null> {
  const settings = await getStoreSettings();
  try {
    const args = {
      sCepOrigem: settings.shipping.originCep,
      sCepDestino: destCep,
      nVlPeso: Math.max(0.3, shippingPackage.weightGrams / 1000).toFixed(3),
      nCdFormato: '1',
      nVlComprimento: String(Math.max(16, Math.ceil(shippingPackage.lengthCm))),
      nVlAltura: String(Math.max(2, Math.ceil(shippingPackage.heightCm))),
      nVlLargura: String(Math.max(11, Math.ceil(shippingPackage.widthCm))),
      nVlDiametro: DEFAULT_DIAMETER,
      nCdServico: ['04510', '04014'],
    };

    const response: CorreiosResponse[] = await Promise.race([
      calcularPrecoPrazo(args),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), API_TIMEOUT_MS),
      ),
    ]);

    const options: ShippingOption[] = [];

    for (const item of response) {
      if (item.Erro && item.Erro !== '0' && item.Erro !== '010') continue;

      const price = parseCorreiosPrice(item.Valor);
      if (price <= 0) continue;

      const days = parseInt(item.PrazoEntrega, 10) || 0;

      if (item.Codigo === '04510') {
        options.push({ id: 'pac', name: 'PAC', price, days_min: days, days_max: days + 3 });
      } else if (item.Codigo === '04014') {
        options.push({ id: 'sedex', name: 'SEDEX', price, days_min: days, days_max: days + 1 });
      }
    }

    return options.length > 0 ? options : null;
  } catch (err) {
    console.warn('[shipping] Correios API failed, using fallback:', (err as Error).message);
    return null;
  }
}

function getFallbackOptions(uf: string): ShippingOption[] {
  const region = UF_REGION[uf] || 'sudeste';
  const rate = RATES[region];
  return [
    { id: 'pac', name: 'PAC', price: rate.pac, days_min: rate.pac_min, days_max: rate.pac_max },
    { id: 'sedex', name: 'SEDEX', price: rate.sedex, days_min: rate.sedex_min, days_max: rate.sedex_max },
  ];
}

export async function calculateShipping(rawCep: string, packageOverride?: Partial<ShippingPackage>): Promise<ShippingResult> {
  const cep = sanitizeCep(rawCep);
  if (!cep) throw new Error('CEP inválido. Use 8 dígitos.');
  const settings = await getStoreSettings();
  const shippingPackage: ShippingPackage = {
    weightGrams: Math.max(1, packageOverride?.weightGrams ?? settings.shipping.defaultWeightGrams),
    lengthCm: Math.max(1, packageOverride?.lengthCm ?? settings.shipping.defaultLengthCm),
    widthCm: Math.max(1, packageOverride?.widthCm ?? settings.shipping.defaultWidthCm),
    heightCm: Math.max(1, packageOverride?.heightCm ?? settings.shipping.defaultHeightCm),
  };

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    next: { revalidate: 86400 },
    verbose: true,
  } as RequestInit);

  if (!res.ok) throw new Error('Não foi possível consultar o CEP.');

  const data: ViaCepResponse = await res.json();
  if (data.erro) throw new Error('CEP não encontrado.');

  const uf = data.uf;
  if (!UF_REGION[uf]) throw new Error(`Estado ${uf} não suportado.`);

  // Santa Catarina: frete fixo PAC R$ 9,90 e SEDEX R$ 15,90
  if (uf === 'SC') {
    return {
      options: [
        { id: 'pac', name: 'PAC', price: 9.90, days_min: 3, days_max: 5 },
        { id: 'sedex', name: 'SEDEX', price: 15.90, days_min: 1, days_max: 2 },
      ].filter((option) => option.id === 'pac' ? settings.shipping.pacEnabled : settings.shipping.sedexEnabled) as ShippingOption[],
      address: { city: data.localidade, state: data.uf, street: data.logradouro, neighborhood: data.bairro },
    };
  }

  const correiosOptions = await fetchCorreiosRates(cep, shippingPackage);
  const options = (correiosOptions || getFallbackOptions(uf))
    .filter((option) => option.id === 'pac' ? settings.shipping.pacEnabled : settings.shipping.sedexEnabled);

  return {
    options,
    address: { city: data.localidade, state: data.uf, street: data.logradouro, neighborhood: data.bairro },
  };
}
