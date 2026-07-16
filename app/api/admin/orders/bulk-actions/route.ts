import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission, badRequest } from '@/lib/api';
import { bulkUpdateStatus, bulkAddNote, generateInvoice, processRefund } from '@/lib/order-management';
import type { OrderStatus } from '@/types/database';

const VALID_STATUSES: OrderStatus[] = [
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'canceled',
];

export async function POST(req: NextRequest) {
  const auth = await requirePermission('orders.manage');
  if (auth.response) return auth.response;

  const body = await req.json();
  const { action, orderIds, ...params } = body as {
    action: string;
    orderIds: string[];
    status?: string;
    trackingCode?: string;
    sendEmails?: boolean;
    note?: string;
    refundReason?: string;
    refundAmount?: number;
  };

  if (!action) return badRequest('Ação obrigatória');
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return badRequest('Selecione pelo menos um pedido');
  }

  const adminId = auth.user.id;
  const adminName = auth.user.name ?? auth.user.email;

  switch (action) {
    case 'update_status': {
      const statusAuth = await requirePermission('orders.status.manage');
      if (statusAuth.response) return statusAuth.response;
      if (!params.status || !VALID_STATUSES.includes(params.status as OrderStatus)) {
        return badRequest('Status inválido');
      }
      const results = await bulkUpdateStatus({
        orderIds,
        newStatus: params.status as OrderStatus,
        trackingCode: params.trackingCode,
        adminId,
        adminName,
        sendEmails: params.sendEmails ?? true,
      });

      const successCount = results.filter(r => r.success).length;
      const emailCount = results.filter(r => r.emailSent).length;

      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: orderIds.length,
          updated: successCount,
          failed: orderIds.length - successCount,
          emailsSent: emailCount,
        },
        message: `${successCount} pedidos atualizados, ${emailCount} emails enviados`,
      });
    }

    case 'add_note': {
      if (!params.note?.trim()) {
        return badRequest('Conteúdo da nota obrigatório');
      }
      const results = await bulkAddNote({
        orderIds,
        content: params.note.trim(),
        authorId: adminId,
        authorName: adminName,
      });

      const successCount = results.filter(r => r.success).length;

      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: orderIds.length,
          notesAdded: successCount,
          failed: orderIds.length - successCount,
        },
        message: `${successCount} notas adicionadas`,
      });
    }

    case 'generate_invoices': {
      const invoices = [];
      const errors = [];

      for (const orderId of orderIds) {
        const invoice = await generateInvoice({ orderId, adminId, adminName });
        if (invoice) {
          invoices.push(invoice);
        } else {
          errors.push(orderId);
        }
      }

      return NextResponse.json({
        success: true,
        invoices,
        summary: {
          total: orderIds.length,
          generated: invoices.length,
          failed: errors.length,
        },
        message: `${invoices.length} invoices geradas`,
      });
    }

    case 'bulk_refund': {
      const financeAuth = await requirePermission('finance.view');
      if (financeAuth.response) return financeAuth.response;

      if (!params.refundReason?.trim()) {
        return badRequest('Motivo do reembolso obrigatório');
      }

      const results = [];
      for (const orderId of orderIds) {
        const result = await processRefund({
          orderId,
          amount: params.refundAmount ?? 0,
          reason: params.refundReason.trim(),
          adminId,
          adminName,
        });
        results.push({ orderId, ...result });
      }

      const successCount = results.filter(r => r.success).length;

      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: orderIds.length,
          refunded: successCount,
          failed: orderIds.length - successCount,
        },
        message: `${successCount} pedidos reembolsados`,
      });
    }

    default:
      return badRequest(`Ação desconhecida: ${action}`);
  }
}
