export type AddressSearchResult = {
  cep: string;
  street: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ViaCepAddress = {
  cep?: unknown;
  logradouro?: unknown;
  complemento?: unknown;
  bairro?: unknown;
  localidade?: unknown;
  uf?: unknown;
};

function cleanText(value: unknown, maxLength = 120) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : '';
}

export function normalizeAddressSearchQuery(input: unknown) {
  const body = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const state = cleanText(body.state, 2).replace(/[^a-z]/gi, '').toUpperCase();
  const city = cleanText(body.city, 80);
  const street = cleanText(body.street, 120);

  if (state.length !== 2) return { error: 'Selecione o estado.' } as const;
  if (city.length < 3) return { error: 'Informe ao menos 3 letras da cidade.' } as const;
  if (street.length < 3) return { error: 'Informe ao menos 3 letras da rua ou avenida.' } as const;

  return { query: { state, city, street } } as const;
}

export function parseViaCepAddressResults(input: unknown): AddressSearchResult[] {
  if (!Array.isArray(input)) return [];

  return input.slice(0, 20).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as ViaCepAddress;
    const cep = cleanText(item.cep, 9).replace(/\D/g, '');
    const city = cleanText(item.localidade, 80);
    const state = cleanText(item.uf, 2).toUpperCase();
    if (cep.length !== 8 || !city || state.length !== 2) return [];

    return [{
      cep,
      street: cleanText(item.logradouro),
      complement: cleanText(item.complemento),
      neighborhood: cleanText(item.bairro, 80),
      city,
      state,
    }];
  });
}

export function formatCep(cep: string) {
  const digits = cep.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}
