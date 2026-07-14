import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface DigitalOrderItem {
  product_id: string;
  product: Array<{
    id: string;
    name: string;
    file_path: string | null;
    type: string;
  }>;
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

    // Allow download for approved (digital-only), processing (hybrid), or delivered orders
    const allowedStatuses = ['approved', 'processing', 'delivered'];
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: 'O pedido ainda não foi aprovado. Aguarde a confirmação do pagamento.' },
        { status: 403 }
      );
    }

    // Find digital item matching fileId
    const items = order.order_items as unknown as DigitalOrderItem[];
    const item = items.find(
      (candidate) => candidate.product[0]?.id === fileId && candidate.product[0]?.type === 'digital',
    );
    const product = item?.product[0];

    if (!product?.file_path) {
      console.error('[download] Item or file_path not found:', {
        itemFound: !!item,
        filePath: product?.file_path,
      });
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Extract filename from file_path (handle both full URL and just filename)
    const filePath = product.file_path;
    const fileName = filePath.includes('/') ? (filePath.split('/').pop() ?? filePath) : filePath;

    console.log('[download] Attempting to download:', {
      originalPath: product.file_path,
      extractedFileName: fileName,
      bucket: 'stl-uploads',
      productName: product.name,
    });

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('stl-uploads')
      .download(fileName);

    if (downloadError || !fileData) {
      console.error('[download] Storage error:', {
        error: downloadError,
        filePath: product.file_path,
        errorMessage: downloadError?.message,
      });
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }

    // Log download (optional)
    console.log('[download] Downloaded:', {
      orderId: id,
      fileId: fileId,
      fileName: product.name,
      userId,
    });

    // Stream file
    const downloadFileName = `${product.name.replace(/\s+/g, '_')}.stl`;
    return new NextResponse(fileData, {
      headers: {
        'Content-Disposition': `attachment; filename="${downloadFileName}"`,
        'Content-Type': 'application/octet-stream',
      },
    });
  } catch (error) {
    console.error('[download] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
