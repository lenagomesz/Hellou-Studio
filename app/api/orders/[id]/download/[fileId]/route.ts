import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getStorageCandidates,
  normalizeProductRelation,
  type ProductRelation,
} from '@/lib/stl-download';
import { getDigitalDownloadFileName } from '@/lib/digital-files';
import { SUCCESSFUL_ORDER_STATUSES } from '@/lib/checkout-rules';
import { structuredLog } from '@/lib/observability';

// Link assinado de curta duração: o cliente baixa direto do Storage, sem o
// arquivo passar pela função (limite de 4,5 MB de resposta na Vercel).
const SIGNED_URL_TTL_SECONDS = 120;

interface DigitalOrderItem {
  product_id: string;
  product: ProductRelation;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const supabase = getSupabaseAdmin();

    // Get user from NextAuth session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch order with items and products
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `
        id,
        user_id,
        status,
        order_items(
          product_id,
          product:products(id, name, file_path, type)
        )
      `
      )
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check ownership
    if (order.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Só pedidos com pagamento confirmado (inclui enviados/concluídos).
    const allowedStatuses: readonly string[] = SUCCESSFUL_ORDER_STATUSES;
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: 'O pedido ainda não foi aprovado. Aguarde a confirmação do pagamento.' },
        { status: 403 }
      );
    }

    // Find digital item matching fileId
    const items = order.order_items as unknown as DigitalOrderItem[];
    const item = items.find((candidate) => {
      const candidateProduct = normalizeProductRelation(candidate.product);
      return candidateProduct?.id === fileId && candidateProduct.type === 'digital';
    });
    const product = item ? normalizeProductRelation(item.product) : null;

    if (!product?.file_path) {
      console.error('[download] Item or file_path not found:', {
        itemFound: !!item,
        filePath: product?.file_path,
      });
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const storageCandidates = getStorageCandidates(product.file_path);
    const downloadFileName = getDigitalDownloadFileName(product.name, product.file_path);
    let signedUrl: string | null = null;
    let lastError: { message?: string } | null = null;

    for (const candidate of storageCandidates) {
      const result = await supabase.storage
        .from(candidate.bucket)
        .createSignedUrl(candidate.path, SIGNED_URL_TTL_SECONDS, { download: downloadFileName });
      if (result.data?.signedUrl && !result.error) {
        signedUrl = result.data.signedUrl;
        break;
      }
      lastError = result.error;
    }

    if (!signedUrl) {
      console.error('[download] Storage error:', {
        filePath: product.file_path,
        attemptedLocations: storageCandidates.map(({ bucket, path }) => `${bucket}/${path}`),
        errorMessage: lastError?.message,
      });
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    structuredLog('info', 'digital_download.signed_url_issued', {
      orderId: id,
      fileId,
      userId,
    });

    const response = NextResponse.redirect(signedUrl, 302);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('[download] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
