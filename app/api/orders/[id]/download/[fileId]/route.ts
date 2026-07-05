import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const supabase = getSupabaseAdmin();
    const auth = request.headers.get('authorization');

    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = auth.slice(7);

    // Verify user
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userData.user.id;

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

    // Check order status
    const allowedStatuses = ['completed', 'paid', 'shipped', 'delivered'];
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json({ error: 'Order not ready for download' }, { status: 403 });
    }

    // Find digital item matching fileId
    const items = order.order_items as any[];
    const item = items.find(
      it => it.product?.id === fileId && it.product?.type === 'digital'
    );

    if (!item || !item.product?.file_path) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('products')
      .download(item.product.file_path);

    if (downloadError || !fileData) {
      console.error('[download] Storage error:', downloadError);
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }

    // Log download (optional)
    console.log('[download] Downloaded:', {
      orderId: id,
      fileId: fileId,
      fileName: item.product.name,
      userId,
    });

    // Stream file
    const fileName = `${item.product.name.replace(/\s+/g, '_')}.stl`;
    return new NextResponse(fileData, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
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
