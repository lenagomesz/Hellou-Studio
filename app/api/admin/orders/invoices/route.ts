import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission, badRequest } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateInvoice, logNotification } from '@/lib/order-management';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('finance.view');
  if (auth.response) return auth.response;

  const orderId = req.nextUrl.searchParams.get('orderId');
  const admin = getSupabaseAdmin();

  if (orderId) {
    const { data, error } = await admin
      .from('invoices')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar invoices' }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  }

  // List all invoices (with pagination)
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10));
  const limit = 20;
  const from = (page - 1) * limit;

  const { data, error, count } = await admin
    .from('invoices')
    .select('*', { count: 'exact' })
    .order('invoice_number', { ascending: false })
    .range(from, from + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar invoices' }, { status: 500 });
  }

  return NextResponse.json({
    invoices: data ?? [],
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('finance.view');
  if (auth.response) return auth.response;

  const body = await req.json();
  const { orderId, sendEmail } = body as { orderId: string; sendEmail?: boolean };

  if (!orderId) return badRequest('orderId obrigatório');

  const adminId = auth.user.id;
  const adminName = auth.user.name ?? auth.user.email;

  const invoice = await generateInvoice({ orderId, adminId, adminName });

  if (!invoice) {
    return NextResponse.json({ error: 'Erro ao gerar invoice' }, { status: 500 });
  }

  // Optionally send email
  if (sendEmail && invoice.customer_email) {
    try {
      const admin = getSupabaseAdmin();
      const { data: order } = await admin
        .from('orders')
        .select('user_id')
        .eq('id', orderId)
        .single();

      await logNotification({
        orderId,
        userId: order?.user_id ?? null,
        type: 'email',
        template: 'invoice_generated',
        recipient: invoice.customer_email,
        subject: `Invoice #${invoice.invoice_number} - helloustudio`,
        status: 'sent',
      });
    } catch (err) {
      console.error('[invoice] email notification error:', err);
    }
  }

  return NextResponse.json(invoice);
}
