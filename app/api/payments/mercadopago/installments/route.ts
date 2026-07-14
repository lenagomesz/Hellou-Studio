import { NextResponse } from 'next/server';
import { requireUser, badRequest, serverError } from '@/lib/api';
import { structuredLog } from '@/lib/observability';

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const bin = searchParams.get('bin');
  const amount = searchParams.get('amount');

  if (!bin || bin.length < 6) return badRequest('BIN inválido (mínimo 6 dígitos)');
  if (!amount || Number(amount) <= 0) return badRequest('Valor inválido');

  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN!;

    const response = await fetch(
      `https://api.mercadopago.com/v1/payment_methods/installments?bin=${bin}&amount=${amount}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        verbose: true,
      } as RequestInit,
    );

    if (!response.ok) {
      structuredLog('warn', 'mercadopago.installments_provider_error', { providerStatus: response.status });
      return serverError('Erro ao buscar parcelas');
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ installments: [], issuer: null });
    }

    const first = data[0];
    const installments = (first.payer_costs || []).map(
      (cost: Record<string, unknown>) => ({
        installments: cost.installments,
        installment_amount: cost.installment_amount,
        total_amount: cost.total_amount,
        recommended_message: cost.recommended_message,
      }),
    );

    return NextResponse.json({
      installments,
      issuer: first.issuer ? { id: first.issuer.id, name: first.issuer.name } : null,
      payment_method_id: first.payment_method_id,
      payment_type_id: first.payment_type_id,
    });
  } catch (err: unknown) {
    structuredLog('warn', 'mercadopago.installments_failed', { error: err });
    return serverError('Erro ao buscar parcelas');
  }
}
