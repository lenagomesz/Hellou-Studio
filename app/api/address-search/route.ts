import { NextResponse } from 'next/server';
import { normalizeAddressSearchQuery, parseViaCepAddressResults } from '@/lib/address-search';
import { durableRateLimit } from '@/lib/durable-rate-limit';

export async function POST(request: Request) {
  try {
    const limit = await durableRateLimit(request, 'address-search', { maxRequests: 15, windowMs: 60_000 });
    if (!limit.success) {
      return NextResponse.json(
        { error: 'Muitas buscas de endereço. Aguarde um minuto.' },
        { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) } },
      );
    }

    const normalized = normalizeAddressSearchQuery(await request.json());
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const { state, city, street } = normalized.query;
    const url = `https://viacep.com.br/ws/${encodeURIComponent(state)}/${encodeURIComponent(city)}/${encodeURIComponent(street)}/json/`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error('O serviço de busca de CEP não respondeu corretamente.');
    }

    const results = parseViaCepAddressResults(await response.json());
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof SyntaxError
      ? 'Dados de endereço inválidos.'
      : error instanceof Error && error.name === 'TimeoutError'
        ? 'A busca demorou demais. Tente novamente.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível buscar o CEP.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
