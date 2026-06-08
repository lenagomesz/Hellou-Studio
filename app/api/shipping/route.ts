import { NextResponse } from 'next/server';
import { calculateShipping, sanitizeCep } from '@/lib/shipping';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawCep = typeof body.cep === 'string' ? body.cep : '';

    if (!sanitizeCep(rawCep)) {
      return NextResponse.json(
        { error: 'CEP inválido. Informe 8 dígitos.' },
        { status: 400 },
      );
    }

    const result = await calculateShipping(rawCep);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao calcular frete.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
