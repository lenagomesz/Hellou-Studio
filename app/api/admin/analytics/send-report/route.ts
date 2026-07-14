import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission, badRequest, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { startOfMonth, subMonths, format } from 'date-fns';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('analytics.view');
  if (auth.response) return auth.response;

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Body invalido');
  }

  const email = body.email?.trim();
  if (!email || !email.includes('@')) {
    return badRequest('Email invalido');
  }

  // Build summary data
  const admin = getSupabaseAdmin();
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  const { data: orders } = await admin
    .from('orders')
    .select('total, created_at, status')
    .in('status', ['paid', 'processing', 'shipped', 'delivered']);

  if (!orders) return serverError('Erro ao buscar dados');

  const thisMonthRevenue = orders
    .filter(o => new Date(o.created_at) >= thisMonthStart)
    .reduce((sum, o) => sum + (o.total ?? 0), 0);

  const lastMonthRevenue = orders
    .filter(o => {
      const d = new Date(o.created_at);
      return d >= lastMonthStart && d < thisMonthStart;
    })
    .reduce((sum, o) => sum + (o.total ?? 0), 0);

  const totalOrders = orders.filter(o => new Date(o.created_at) >= thisMonthStart).length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Try to send email via Resend if configured
  try {
    const { Resend } = await import('resend');
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({
        success: true,
        message: `Relatorio preparado para ${email} (envio de email nao configurado)`,
        preview: true,
      });
    }

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: 'Studio Hellou <noreply@studiohellou.com>',
      to: email,
      subject: `Relatorio Dashboard - ${format(now, 'dd/MM/yyyy')}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ec4899;">Relatorio do Dashboard</h1>
          <p>Periodo: ${format(thisMonthStart, 'dd/MM/yyyy')} - ${format(now, 'dd/MM/yyyy')}</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f9fafb;">
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Receita do Mes</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatCurrency(thisMonthRevenue)}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Receita Mes Anterior</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatCurrency(lastMonthRevenue)}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Pedidos Este Mes</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${totalOrders}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Receita Total</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatCurrency(totalRevenue)}</td>
            </tr>
          </table>

          <p style="color: #6b7280; font-size: 12px;">
            Gerado automaticamente em ${format(now, 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Relatorio enviado para ${email}`,
    });
  } catch {
    return NextResponse.json({
      success: true,
      message: `Relatorio preparado para ${email} (servico de email indisponivel)`,
      preview: true,
    });
  }
}
