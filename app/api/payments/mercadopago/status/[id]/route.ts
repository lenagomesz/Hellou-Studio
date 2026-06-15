import { NextResponse } from 'next/server';
import { requireUser, badRequest, serverError } from '@/lib/api';
import { getPaymentClient } from '@/lib/mercadopago';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  if (!id) return badRequest('ID do pagamento não informado');

  try {
    const payment = getPaymentClient();
    const result = await payment.get({ id });

    const responseData: Record<string, unknown> = {
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      date_approved: result.date_approved,
    };

    if (result.payment_method_id === 'pix' && result.status === 'pending') {
      const resultAny = result as unknown as Record<string, unknown>;
      const poi = resultAny.point_of_interaction as Record<string, unknown> | undefined;
      const txData = poi?.transaction_data as Record<string, unknown> | undefined;
      if (txData) {
        responseData.pix_qr_code = txData.qr_code;
        responseData.pix_qr_code_base64 = txData.qr_code_base64;
        responseData.pix_expiration = resultAny.date_of_expiration;
      }
    }

    return NextResponse.json(responseData);
  } catch (err: unknown) {
    console.error('[mp-status] error:', err);
    return serverError('Erro ao consultar status do pagamento');
  }
}
