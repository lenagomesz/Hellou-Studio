export interface ShippingOption {
  id: 'pac' | 'sedex';
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

export async function calculateShipping(rawCep: string): Promise<ShippingResult> {
  const cep = sanitizeCep(rawCep);
  if (!cep) throw new Error('CEP inválido. Use 8 dígitos.');

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) throw new Error('Não foi possível consultar o CEP.');

  const data: ViaCepResponse = await res.json();
  if (data.erro) throw new Error('CEP não encontrado.');

  const uf = data.uf;
  const region = UF_REGION[uf];
  if (!region) throw new Error(`Estado ${uf} não suportado.`);

  const rate = RATES[region];

  return {
    options: [
      {
        id: 'pac',
        name: 'PAC',
        price: rate.pac,
        days_min: rate.pac_min,
        days_max: rate.pac_max,
      },
      {
        id: 'sedex',
        name: 'SEDEX',
        price: rate.sedex,
        days_min: rate.sedex_min,
        days_max: rate.sedex_max,
      },
    ],
    address: { city: data.localidade, state: data.uf, street: data.logradouro, neighborhood: data.bairro },
  };
}
