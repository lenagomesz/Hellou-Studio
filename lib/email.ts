import { Resend } from 'resend';
import { BoasVindasEmail } from '@/emails/boas-vindas';
import { PedidoConfirmadoEmail } from '@/emails/pedido-confirmado';

let cached: Resend | null = null;
let warned = false;

function getResend(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (!warned) {
      console.warn('[email] RESEND_API_KEY não configurado — emails desabilitados');
      warned = true;
    }
    return null;
  }
  cached = new Resend(key);
  return cached;
}

function getFrom(): string {
  return process.env.RESEND_FROM_EMAIL || 'helloustudio <onboarding@resend.dev>';
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function sendWelcomeEmail(email: string, nome: string | null) {
  const resend = getResend();
  if (!resend) return;

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: email,
      subject: 'Bem-vindo(a) à helloustudio!',
      react: BoasVindasEmail({ nome, baseUrl: getBaseUrl() }),
    });
    if (res.error) {
      console.error('[email] boas-vindas ERRO:', JSON.stringify(res.error, null, 2));
    } else {
      console.log('[email] boas-vindas ENVIADO para:', email, '| id:', res.data?.id);
    }
  } catch (err) {
    console.error('[email] boas-vindas EXCEPTION:', err);
  }
}

export async function sendPasswordResetEmail(email: string, nome: string | null, token: string) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: email,
      subject: 'Redefinir sua senha — helloustudio',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111;">Olá${nome ? `, ${nome}` : ''}!</h2>
          <p style="color: #555; line-height: 1.6;">
            Recebemos uma solicitação para redefinir a senha da sua conta na helloustudio.
          </p>
          <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Redefinir minha senha
          </a>
          <p style="color: #888; font-size: 13px; line-height: 1.5;">
            Este link expira em 1 hora. Se você não solicitou isso, ignore este email.
          </p>
        </div>
      `,
    });
    if (res.error) {
      console.error('[email] reset-password ERRO:', JSON.stringify(res.error, null, 2));
    } else {
      console.log('[email] reset-password ENVIADO para:', email, '| id:', res.data?.id);
    }
  } catch (err) {
    console.error('[email] reset-password EXCEPTION:', err);
  }
}

const PRINT_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  needs_info: 'Aguardando informações',
  quoted: 'Orçado',
  approved: 'Aprovada',
  paid: 'Pago',
  in_production: 'Em produção',
  shipped: 'Enviado',
  delivered: 'Entregue',
  rejected: 'Rejeitada',
  canceled: 'Cancelada',
};

export async function sendPrintRequestStatusEmail(params: {
  email: string;
  nome: string | null;
  title: string;
  newStatus: string;
  quotedPrice?: number | null;
  rejectionReason?: string | null;
  productId?: string | null;
}) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();
  const statusLabel = PRINT_REQUEST_STATUS_LABELS[params.newStatus] ?? params.newStatus;

  let extraContent = '';
  if (params.newStatus === 'quoted' && params.quotedPrice != null) {
    const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.quotedPrice);
    extraContent = `
      <div style="margin: 20px 0; padding: 16px; background: #EFF6FF; border-radius: 8px; border: 1px solid #BFDBFE;">
        <p style="margin: 0; font-weight: 600; color: #1E40AF;">Orçamento: ${price}</p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #3B82F6;">Acesse sua conta para mais detalhes.</p>
      </div>
    `;
  } else if (params.newStatus === 'approved' && params.productId) {
    const buyUrl = `${baseUrl}/products/${params.productId}`;
    extraContent = `
      <div style="margin: 20px 0; padding: 16px; background: #ECFDF5; border-radius: 8px; border: 1px solid #A7F3D0;">
        <p style="margin: 0; font-weight: 600; color: #065F46;">Sua encomenda foi aprovada!</p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #047857;">Clique abaixo para prosseguir com a compra.</p>
      </div>
      <a href="${buyUrl}" style="display: inline-block; margin: 8px 0 16px; padding: 12px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Prosseguir com a compra
      </a>
    `;
  } else if (params.newStatus === 'rejected' && params.rejectionReason) {
    extraContent = `
      <div style="margin: 20px 0; padding: 16px; background: #FEF2F2; border-radius: 8px; border: 1px solid #FECACA;">
        <p style="margin: 0; font-weight: 600; color: #991B1B;">Motivo:</p>
        <p style="margin: 8px 0 0; font-size: 14px; color: #DC2626;">${params.rejectionReason}</p>
      </div>
    `;
  } else if (params.newStatus === 'needs_info') {
    extraContent = `
      <div style="margin: 20px 0; padding: 16px; background: #FFFBEB; border-radius: 8px; border: 1px solid #FDE68A;">
        <p style="margin: 0; font-weight: 600; color: #92400E;">Precisamos de mais informações</p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #B45309;">Acesse sua conta para ver a mensagem e responder.</p>
      </div>
    `;
  } else if (params.newStatus === 'shipped') {
    extraContent = `
      <p style="color: #555; font-size: 14px;">Sua encomenda foi enviada! Em breve você receberá o código de rastreamento.</p>
    `;
  }

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.email,
      subject: `Solicitação "${params.title}" — ${statusLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111;">Olá${params.nome ? `, ${params.nome}` : ''}!</h2>
          <p style="color: #555; line-height: 1.6;">
            Sua solicitação de impressão <strong>"${params.title}"</strong> teve o status atualizado para:
          </p>
          <p style="display: inline-block; padding: 6px 14px; background: linear-gradient(to right, #ec4899, #f97316); color: white; border-radius: 20px; font-weight: 600; font-size: 14px;">
            ${statusLabel}
          </p>
          ${extraContent}
          <p style="color: #888; font-size: 13px; margin-top: 24px;">
            Acesse sua conta em <a href="${baseUrl}/account/requests" style="color: #ec4899;">helloustudio</a> para mais detalhes.
          </p>
        </div>
      `,
    });
    if (res.error) {
      console.error('[email] print-request-status ERRO:', JSON.stringify(res.error, null, 2));
    } else {
      console.log('[email] print-request-status ENVIADO para:', params.email, '| id:', res.data?.id);
    }
  } catch (err) {
    console.error('[email] print-request-status EXCEPTION:', err);
  }
}

export async function sendOrderConfirmationEmail(params: {
  email: string;
  nome: string | null;
  pedidoId: string;
  total: number;
  itens: Array<{ nome: string; quantidade: number; precoUnitario: number }>;
}) {
  const resend = getResend();
  if (!resend) return;

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.email,
      subject: `Pedido confirmado! #${params.pedidoId.slice(0, 8).toUpperCase()}`,
      react: PedidoConfirmadoEmail({
        nome: params.nome,
        pedidoId: params.pedidoId,
        total: params.total,
        itens: params.itens,
        baseUrl: getBaseUrl(),
      }),
    });
    if (res.error) {
      console.error('[email] pedido-confirmado ERRO:', JSON.stringify(res.error, null, 2));
    } else {
      console.log('[email] pedido-confirmado ENVIADO para:', params.email, '| id:', res.data?.id);
    }
  } catch (err) {
    console.error('[email] pedido-confirmado EXCEPTION:', err);
  }
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  processing: 'Em preparo',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

const ORDER_STATUS_SUBJECTS: Record<string, (nome: string | null) => string> = {
  processing: (nome) => `Hellou${nome ? ` ${nome}` : ''}, seu pedido está sendo preparado!`,
  shipped: (nome) => `Hellou${nome ? ` ${nome}` : ''}, seu pedido foi enviado!`,
  delivered: (nome) => `Hellou${nome ? ` ${nome}` : ''}, seu pedido foi entregue!`,
  canceled: (nome) => `Hellou${nome ? ` ${nome}` : ''}, seu pedido foi cancelado`,
  refunded: (nome) => `Hellou${nome ? ` ${nome}` : ''}, seu reembolso foi processado`,
};

export async function sendOrderStatusEmail(params: {
  email: string;
  nome: string | null;
  orderId: string;
  newStatus: string;
  trackingCode?: string | null;
}) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();
  const statusLabel = ORDER_STATUS_LABELS[params.newStatus] ?? params.newStatus;

  let extraContent = '';
  if (params.newStatus === 'shipped' && params.trackingCode) {
    extraContent = `
      <div style="margin: 20px 0; padding: 16px; background: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0;">
        <p style="margin: 0; font-weight: 600; color: #166534;">Código de rastreamento:</p>
        <p style="margin: 8px 0 0; font-size: 16px; color: #15803D; font-family: monospace; letter-spacing: 0.5px;">${params.trackingCode}</p>
      </div>
      <a href="https://www.linkcorreios.com.br/?id=${params.trackingCode}" style="display: inline-block; margin: 8px 0 16px; padding: 12px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Rastrear encomenda
      </a>
    `;
  }

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.email,
      subject: ORDER_STATUS_SUBJECTS[params.newStatus]
        ? ORDER_STATUS_SUBJECTS[params.newStatus](params.nome)
        : `Hellou${params.nome ? ` ${params.nome}` : ''}, atualização do seu pedido #${params.orderId.slice(0, 8).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111;">Olá${params.nome ? `, ${params.nome}` : ''}!</h2>
          <p style="color: #555; line-height: 1.6;">
            Seu pedido <strong>#${params.orderId.slice(0, 8).toUpperCase()}</strong> teve o status atualizado para:
          </p>
          <p style="display: inline-block; padding: 6px 14px; background: linear-gradient(to right, #ec4899, #f97316); color: white; border-radius: 20px; font-weight: 600; font-size: 14px;">
            ${statusLabel}
          </p>
          ${extraContent}
          <p style="color: #888; font-size: 13px; margin-top: 24px;">
            Acesse sua conta em <a href="${baseUrl}/account/orders" style="color: #ec4899;">helloustudio</a> para mais detalhes.
          </p>
        </div>
      `,
    });
    if (res.error) {
      console.error('[email] order-status ERRO:', JSON.stringify(res.error, null, 2));
    } else {
      console.log('[email] order-status ENVIADO para:', params.email, '| id:', res.data?.id);
    }
  } catch (err) {
    console.error('[email] order-status EXCEPTION:', err);
  }
}

export async function sendAdminNewOrderEmail(params: {
  adminEmail: string;
  orderId: string;
  customerName: string | null;
  customerEmail: string;
  total: number;
}) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();
  const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.total);

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.adminEmail,
      subject: `Novo pedido! #${params.orderId.slice(0, 8).toUpperCase()} — ${price}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111;">Novo pedido recebido!</h2>
          <div style="margin: 16px 0; padding: 16px; background: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0;">
            <p style="margin: 0; font-weight: 600; color: #166534;">Pedido #${params.orderId.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #15803D;">Total: ${price}</p>
          </div>
          <p style="color: #555; font-size: 14px;">
            <strong>Cliente:</strong> ${params.customerName ?? 'N/A'}<br/>
            <strong>Email:</strong> ${params.customerEmail}
          </p>
          <a href="${baseUrl}/dashboard/orders/${params.orderId}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ver pedido no painel
          </a>
        </div>
      `,
    });
    if (res.error) {
      console.error('[email] admin-new-order ERRO:', JSON.stringify(res.error, null, 2));
    } else {
      console.log('[email] admin-new-order ENVIADO para:', params.adminEmail, '| id:', res.data?.id);
    }
  } catch (err) {
    console.error('[email] admin-new-order EXCEPTION:', err);
  }
}

export async function sendInvoiceRequestEmail(params: {
  adminEmail: string;
  orderId: string;
  customerName: string | null;
  customerEmail: string;
  total: number;
}) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();
  const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.total);

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.adminEmail,
      subject: `Nota Fiscal solicitada — Pedido #${params.orderId.slice(0, 8).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111;">Nota Fiscal solicitada</h2>
          <div style="margin: 16px 0; padding: 16px; background: #FFFBEB; border-radius: 8px; border: 1px solid #FDE68A;">
            <p style="margin: 0; font-weight: 600; color: #92400E;">Pedido #${params.orderId.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #B45309;">Total: ${price}</p>
          </div>
          <p style="color: #555; font-size: 14px;">
            <strong>Cliente:</strong> ${params.customerName ?? 'N/A'}<br/>
            <strong>Email:</strong> ${params.customerEmail}
          </p>
          <p style="color: #555; font-size: 14px;">
            O cliente solicitou nota fiscal para este pedido. Por favor emita e envie ao cliente.
          </p>
          <a href="${baseUrl}/dashboard/orders/${params.orderId}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ver pedido no painel
          </a>
        </div>
      `,
    });
    if (res.error) {
      console.error('[email] invoice-request ERRO:', JSON.stringify(res.error, null, 2));
    } else {
      console.log('[email] invoice-request ENVIADO para:', params.adminEmail, '| id:', res.data?.id);
    }
  } catch (err) {
    console.error('[email] invoice-request EXCEPTION:', err);
  }
}

export async function sendAdminNewPrintRequestEmail(params: {
  adminEmail: string;
  requestId: string;
  title: string;
  customerName: string | null;
  customerEmail: string;
}) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.adminEmail,
      subject: `Nova solicitação de impressão: "${params.title}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111;">Nova solicitação de impressão!</h2>
          <div style="margin: 16px 0; padding: 16px; background: #EFF6FF; border-radius: 8px; border: 1px solid #BFDBFE;">
            <p style="margin: 0; font-weight: 600; color: #1E40AF;">"${params.title}"</p>
          </div>
          <p style="color: #555; font-size: 14px;">
            <strong>Cliente:</strong> ${params.customerName ?? 'N/A'}<br/>
            <strong>Email:</strong> ${params.customerEmail}
          </p>
          <a href="${baseUrl}/dashboard/requests/${params.requestId}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ver solicitação no painel
          </a>
        </div>
      `,
    });
    if (res.error) {
      console.error('[email] admin-new-print-request ERRO:', JSON.stringify(res.error, null, 2));
    } else {
      console.log('[email] admin-new-print-request ENVIADO para:', params.adminEmail, '| id:', res.data?.id);
    }
  } catch (err) {
    console.error('[email] admin-new-print-request EXCEPTION:', err);
  }
}

export async function sendSTLOrderConfirmationEmail(params: {
  email: string;
  nome: string | null;
  orderId: string;
  fileName: string;
  price: number;
}) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();
  const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.price);

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.email,
      subject: `Seu arquivo STL está pronto! #${params.orderId.slice(0, 8).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111;">Olá${params.nome ? `, ${params.nome}` : ''}! ✨</h2>
          <p style="color: #555; line-height: 1.6;">
            Seu arquivo STL <strong>"${params.fileName}"</strong> está pronto para download!
          </p>
          <div style="margin: 20px 0; padding: 16px; background: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0;">
            <p style="margin: 0; color: #15803D; font-size: 14px;">
              Valor: ${price}
            </p>
          </div>
          <a href="${baseUrl}/account/orders" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Acessar Meus Pedidos
          </a>
          <p style="color: #888; font-size: 13px; margin-top: 24px; line-height: 1.5;">
            O arquivo estará disponível em sua conta helloustudio por tempo ilimitado. Você pode fazer o download quantas vezes precisar.
          </p>
        </div>
      `,
    });
    if (res.error) {
      console.error('[email] stl-order-confirmation ERRO:', JSON.stringify(res.error, null, 2));
    } else {
      console.log('[email] stl-order-confirmation ENVIADO para:', params.email, '| id:', res.data?.id);
    }
  } catch (err) {
    console.error('[email] stl-order-confirmation EXCEPTION:', err);
  }
}

export async function sendSTLAdminNotificationEmail(params: {
  adminEmail: string;
  orderId: string;
  customerName: string | null;
  customerEmail: string;
  fileName: string;
  price: number;
}) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();
  const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.price);

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.adminEmail,
      subject: `Novo pedido digital! #${params.orderId.slice(0, 8).toUpperCase()} — ${price}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111;">Novo pedido digital recebido!</h2>
          <div style="margin: 16px 0; padding: 16px; background: #EFF6FF; border-radius: 8px; border: 1px solid #BFDBFE;">
            <p style="margin: 0; font-weight: 600; color: #1E40AF;">Pedido #${params.orderId.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #3B82F6;">Total: ${price}</p>
          </div>
          <p style="color: #555; font-size: 14px;">
            <strong>Arquivo:</strong> ${params.fileName}<br/>
            <strong>Cliente:</strong> ${params.customerName ?? 'N/A'}<br/>
            <strong>Email:</strong> ${params.customerEmail}
          </p>
          <a href="${baseUrl}/dashboard/orders/${params.orderId}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ver pedido no painel
          </a>
        </div>
      `,
    });
    if (res.error) {
      console.error('[email] stl-admin-notification ERRO:', JSON.stringify(res.error, null, 2));
    } else {
      console.log('[email] stl-admin-notification ENVIADO para:', params.adminEmail, '| id:', res.data?.id);
    }
  } catch (err) {
    console.error('[email] stl-admin-notification EXCEPTION:', err);
  }
}

export async function sendSTLDeliveryEmail(params: {
  email: string;
  nome: string | null;
  orderId: string;
  fileName: string;
}) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();
  const downloadUrl = `${baseUrl}/dashboard/orders/${params.orderId}`;

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.email,
      subject: `Seu arquivo está pronto! #${params.orderId.slice(0, 8).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #111;">Olá${params.nome ? `, ${params.nome}` : ''}! ✨</h2>
          <p style="color: #555; line-height: 1.6;">
            Seu arquivo STL <strong>"${params.fileName}"</strong> está pronto para download!
          </p>
          <div style="margin: 20px 0; padding: 16px; background: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0;">
            <p style="margin: 0; color: #15803D; font-size: 14px;">
              Acesse seu pedido para fazer o download do arquivo.
            </p>
          </div>
          <a href="${downloadUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Acessar Pedido e Baixar
          </a>
          <p style="color: #888; font-size: 13px; margin-top: 24px; line-height: 1.5;">
            O arquivo estará disponível em sua conta helloustudio por tempo ilimitado. Você pode fazer o download quantas vezes precisar.
          </p>
        </div>
      `,
    });
    if (res.error) {
      console.error('[email] stl-delivery ERRO:', JSON.stringify(res.error, null, 2));
    } else {
      console.log('[email] stl-delivery ENVIADO para:', params.email, '| id:', res.data?.id);
    }
  } catch (err) {
    console.error('[email] stl-delivery EXCEPTION:', err);
  }
}
