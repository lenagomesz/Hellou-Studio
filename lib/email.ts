import { Resend } from 'resend';

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

  const baseUrl = getBaseUrl();
  const greeting = nome ? `Olá, ${nome}!` : 'Olá!';

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: email,
      subject: `🎉 Bem-vindo(a) à HellouStudio!${nome ? `, ${nome}` : ''}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff;">
          <div style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
            <h1 style="color: #111; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">
              Bem-vindo(a)! 🎉
            </h1>
            <p style="color: #666; margin: 0; font-size: 14px;">
              Sua conta foi criada com sucesso
            </p>
          </div>

          <p style="color: #555; line-height: 1.6; margin: 0 0 24px 0;">
            ${greeting} Agora você faz parte da comunidade HellouStudio! Estamos muito felizes em ter você conosco. ✨
          </p>

          <div style="margin: 24px 0; padding: 20px; background-color: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0;">
            <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #166534;">
              O que você encontrará aqui:
            </p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #15803D; line-height: 1.8;">
              <li>Chaveiros personalizados impressos em 3D</li>
              <li>Itens de escritório exclusivos</li>
              <li>Criaturas e figuras únicas</li>
              <li>Arquivos STL para impressão própria</li>
            </ul>
          </div>

          <div style="margin: 24px 0;">
            <p style="margin: 0 0 16px 0; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">
              Por que nos escolher?
            </p>
            <div style="position: relative; padding-left: 32px;">
              <div style="margin-bottom: 20px; position: relative;">
                <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #F3E8FF; color: #9333EA; font-weight: 600; font-size: 12px;">
                  🖨️
                </div>
                <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Impressão sob demanda</p>
                <p style="margin: 0; font-size: 13px; color: #888;">Cada peça é produzida especialmente para você</p>
              </div>
              <div style="margin-bottom: 20px; position: relative;">
                <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #F3E8FF; color: #9333EA; font-weight: 600; font-size: 12px;">
                  💎
                </div>
                <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Qualidade premium</p>
                <p style="margin: 0; font-size: 13px; color: #888;">Materiais de alta qualidade e acabamento impecável</p>
              </div>
              <div style="margin-bottom: 20px; position: relative;">
                <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #F3E8FF; color: #9333EA; font-weight: 600; font-size: 12px;">
                  🚀
                </div>
                <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Entrega rápida</p>
                <p style="margin: 0; font-size: 13px; color: #888;">Produção em até 3 dias úteis</p>
              </div>
              <div style="position: relative;">
                <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #F3E8FF; color: #9333EA; font-weight: 600; font-size: 12px;">
                  💬
                </div>
                <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Suporte dedicado</p>
                <p style="margin: 0; font-size: 13px; color: #888;">Estamos sempre prontos para ajudar</p>
              </div>
            </div>
          </div>

          <a href="${baseUrl}/products" style="display: inline-block; margin: 32px 0 24px 0; padding: 14px 28px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Explorar Catálogo
          </a>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 12px 0; color: #555; font-size: 13px;">
              Dúvidas? Entre em contato pelo WhatsApp, estamos à disposição!
            </p>
            <p style="margin: 0; color: #999; font-size: 12px;">
              © helloustudio • Feito com ❤️ em 3D
            </p>
          </div>
        </div>
      `,
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
      subject: '🔐 Redefinir sua senha — HellouStudio',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff;">
          <div style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
            <h1 style="color: #111; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">
              🔐 Redefinir sua senha
            </h1>
            <p style="color: #666; margin: 0; font-size: 14px;">
              HellouStudio
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">🔑</span>
          </div>
          
          <h2 style="color: #111; text-align: center; margin: 0 0 8px 0;">Olá${nome ? `, ${nome}` : ''}!</h2>
          <p style="color: #555; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
            Recebemos uma solicitação para redefinir a senha da sua conta.
          </p>
          
          <div style="margin: 24px 0; padding: 16px; background: #FFFBEB; border-radius: 8px; border: 1px solid #FDE68A;">
            <p style="margin: 0; font-size: 13px; color: #92400E; text-align: center;">
              ⚠️ Este link expira em 1 hora por segurança
            </p>
          </div>
          
          <a href="${resetUrl}" style="display: inline-block; margin: 24px 0 16px; padding: 14px 28px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; width: 100%; text-align: center;">
            Redefinir minha senha
          </a>
          
          <p style="color: #888; font-size: 13px; line-height: 1.5; text-align: center; margin: 24px 0 16px;">
            Se você não solicitou isso, ignore este e-mail. Sua conta permanece segura.
          </p>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0 0 12px 0; color: #555; font-size: 13px;">
              Precisa de ajuda? Entre em contato pelo WhatsApp
            </p>
            <p style="margin: 0; color: #999; font-size: 12px;">
              © helloustudio • Feito com ❤️ em 3D
            </p>
          </div>
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
      subject: `🖨️ Atualização: "${params.title}" — ${statusLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff;">
          <div style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
            <h1 style="color: #111; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">
              🖨️ Atualização da Solicitação
            </h1>
            <p style="color: #666; margin: 0; font-size: 14px;">
              "${params.title}"
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">📋</span>
          </div>
          
          <h2 style="color: #111; text-align: center; margin: 0 0 8px 0;">Olá${params.nome ? `, ${params.nome}` : ''}!</h2>
          <p style="color: #555; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
            Sua solicitação de impressão teve o status atualizado:
          </p>
          
          <div style="text-align: center; margin: 24px 0;">
            <p style="display: inline-block; padding: 10px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; border-radius: 24px; font-weight: 600; font-size: 16px;">
              ${statusLabel}
            </p>
          </div>
          
          ${extraContent}
          
          <div style="margin: 24px 0; padding: 16px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 13px; color: #6B7280; text-align: center;">
              Solicitação: "${params.title}"
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="${baseUrl}/account/requests" style="display: inline-block; padding: 14px 28px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Ver detalhes da solicitação
            </a>
          </div>
          
          <p style="color: #888; font-size: 13px; margin-top: 24px; text-align: center;">
            Dúvidas? Entre em contato pelo WhatsApp
          </p>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; color: #999; font-size: 12px;">
              © helloustudio • Feito com ❤️ em 3D
            </p>
          </div>
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

  console.log('[email] sendOrderConfirmationEmail called with:', {
    email: params.email,
    nome: params.nome,
    pedidoId: params.pedidoId,
  });

  const baseUrl = getBaseUrl();
  const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.total);
  const formattedDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const isSTLOrder = params.itens.some(item => item.nome.toLowerCase().includes('stl') || item.nome.toLowerCase().includes('arquivo'));

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.email,
      subject: `${isSTLOrder ? '📁 Arquivo Disponível!' : '🎉 Pedido Confirmado!'} #${params.pedidoId.slice(0, 8).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff;">
          <div style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
            <h1 style="color: #111; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">
              ${isSTLOrder ? 'Arquivo Disponível! 🎉' : 'Pedido Confirmado! 🎉'}
            </h1>
            <p style="color: #666; margin: 0; font-size: 14px;">
              Pedido #${params.pedidoId.slice(0, 8).toUpperCase()} • ${formattedDate}
            </p>
          </div>

          <p style="color: #555; line-height: 1.6; margin: 0 0 24px 0;">
            Olá${params.nome ? `, ${params.nome}` : ''}! ${isSTLOrder 
              ? 'Seu arquivo STL está pronto para download! 🚀' 
              : 'Seu pedido foi confirmado e está sendo preparado com muito carinho. ✨'}
          </p>

          <div style="margin: 24px 0; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 16px 0; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">
              ${isSTLOrder ? 'Arquivos adquiridos' : 'Itens do pedido'}
            </p>
            ${params.itens.map((item, idx) => `
              <div style="margin-bottom: ${idx < params.itens.length - 1 ? '16px' : '0'}; padding-bottom: ${idx < params.itens.length - 1 ? '16px' : '0'}; border-bottom: ${idx < params.itens.length - 1 ? '1px solid #e5e7eb' : 'none'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <p style="color: #1f2937; font-weight: 600; margin: 0; flex: 1;">${item.nome}</p>
                  <p style="color: #1f2937; font-weight: 600; margin: 0 0 0 12px; white-space: nowrap;">
                    ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoUnitario * item.quantidade)}
                  </p>
                </div>
                <p style="color: #888; margin: 0; font-size: 13px;">
                  Quantidade: ${item.quantidade} × ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoUnitario)}
                </p>
              </div>
            `).join('')}
          </div>

          <div style="margin: 24px 0; padding: 16px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
            <p style="margin: 0; font-size: 12px; color: #666; margin-bottom: 8px;">TOTAL DO PEDIDO</p>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #15803d;">
              ${formattedTotal}
            </p>
          </div>

          <div style="margin: 24px 0;">
            <p style="margin: 0 0 16px 0; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">
              ${isSTLOrder ? 'O que acontece agora?' : 'Próximas etapas'}
            </p>
            <div style="position: relative; padding-left: 32px;">
              ${isSTLOrder ? `
                <div style="margin-bottom: 24px; position: relative;">
                  <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #15803d; color: #fff; font-weight: 600; font-size: 12px;">✓</div>
                  <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Pagamento confirmado</p>
                  <p style="margin: 0; font-size: 13px; color: #888;">Seu pagamento foi processado com sucesso.</p>
                </div>
                <div style="margin-bottom: 24px; position: relative;">
                  <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #e5e7eb; color: #666; font-weight: 600; font-size: 12px;">📥</div>
                  <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Download disponível</p>
                  <p style="margin: 0; font-size: 13px; color: #888;">Acesse sua conta para baixar o arquivo STL.</p>
                </div>
                <div style="margin-bottom: 24px; position: relative;">
                  <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #e5e7eb; color: #666; font-weight: 600; font-size: 12px;">🖨️</div>
                  <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Impressão</p>
                  <p style="margin: 0; font-size: 13px; color: #888;">Imprima em casa ou em um serviço de impressão 3D.</p>
                </div>
                <div style="position: relative;">
                  <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #e5e7eb; color: #666; font-weight: 600; font-size: 12px;">✅</div>
                  <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Apoio</p>
                  <p style="margin: 0; font-size: 13px; color: #888;">Precisa de ajuda? Estamos à disposição!</p>
                </div>
              ` : `
                <div style="margin-bottom: 24px; position: relative;">
                  <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #15803d; color: #fff; font-weight: 600; font-size: 12px;">✓</div>
                  <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Pagamento confirmado</p>
                  <p style="margin: 0; font-size: 13px; color: #888;">Seu pagamento foi processado com sucesso.</p>
                </div>
                <div style="margin-bottom: 24px; position: relative;">
                  <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #e5e7eb; color: #666; font-weight: 600; font-size: 12px;">🖨️</div>
                  <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Produção</p>
                  <p style="margin: 0; font-size: 13px; color: #888;">Sua peça será impressa em até 3 dias úteis.</p>
                </div>
                <div style="margin-bottom: 24px; position: relative;">
                  <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #e5e7eb; color: #666; font-weight: 600; font-size: 12px;">📦</div>
                  <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Envio</p>
                  <p style="margin: 0; font-size: 13px; color: #888;">Você receberá o código de rastreamento por e-mail.</p>
                </div>
                <div style="position: relative;">
                  <div style="position: absolute; left: -32px; top: 0px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #e5e7eb; color: #666; font-weight: 600; font-size: 12px;">✅</div>
                  <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Entrega</p>
                  <p style="margin: 0; font-size: 13px; color: #888;">Sua peça chegará com segurança.</p>
                </div>
              `}
            </div>
          </div>

          <a href="${baseUrl}/account/orders/${params.pedidoId}" style="display: inline-block; margin: 32px 0 24px 0; padding: 12px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            ${isSTLOrder ? 'Baixar meu arquivo' : 'Acompanhe seu pedido'}
          </a>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 12px 0; color: #555; font-size: 13px;">
              ${isSTLOrder 
                ? 'Precisa de ajuda com o arquivo? Entre em contato pelo WhatsApp.' 
                : 'Dúvidas? Acesse sua conta em helloustudio para mais detalhes.'}
            </p>
            <p style="margin: 0; color: #999; font-size: 12px;">
              © helloustudio • Feito com ❤️ em 3D
            </p>
          </div>
        </div>
      `,
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

export async function sendPixPaymentEmail(params: {
  email: string;
  nome: string | null;
  orderId: string;
  total: number;
  pixCode: string;
  expiration: string | null;
}) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();
  const shortId = params.orderId.slice(0, 8).toUpperCase();
  const total = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.total);
  const expiration = params.expiration
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(params.expiration))
    : '30 minutos após a geração';
  const safeName = params.nome?.replace(/[<>&"']/g, '') || '';
  const safePixCode = params.pixCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.email,
      subject: `PIX gerado para o pedido #${shortId}`,
      html: `
        <div style="margin:0;background:#f2f0f3;padding:28px 12px;font-family:Arial,sans-serif;color:#211d25;">
          <div style="max-width:620px;margin:0 auto;overflow:hidden;border-radius:22px;background:#ffffff;box-shadow:0 18px 55px rgba(31,27,39,.12);">
            <div style="height:7px;background:linear-gradient(90deg,#ff2f92,#ff5f68,#ff9d28);"></div>
            <div style="padding:24px 30px 20px;border-bottom:1px solid #f0edf2;"><strong style="font-size:22px;letter-spacing:-1px;color:#e72f80;">helloustudio</strong><span style="float:right;color:#99949f;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Pagamento PIX</span></div>
            <div style="padding:34px 30px 28px;background:linear-gradient(145deg,#fff7fb,#ffffff 56%,#fff7eb);">
              <span style="display:inline-block;padding:7px 10px;border:1px solid #ffd2e6;border-radius:999px;background:#fff;color:#e72f80;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Aguardando pagamento</span>
              <h1 style="margin:16px 0 10px;font-size:30px;line-height:1.12;color:#211d25;">Seu PIX está pronto${safeName ? `, ${safeName}` : ''}.</h1>
              <p style="margin:0;color:#736f7b;font-size:15px;line-height:1.65;">Use o código abaixo no aplicativo do seu banco. Assim que o pagamento for identificado, seu pedido será confirmado automaticamente.</p>
            </div>
            <div style="padding:28px 30px 34px;">
              <div style="padding:16px;border:1px solid #f1dfe8;border-radius:15px;background:linear-gradient(135deg,#fff7fb,#fffaf3);"><span style="color:#837c88;font-size:12px;">Total a pagar</span><strong style="float:right;font-size:20px;color:#211d25;">${total}</strong></div>
              <p style="margin:24px 0 8px;color:#99949f;font-size:10px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;">PIX copia e cola</p>
              <div style="padding:15px;border:1px solid #eeeaf0;border-radius:14px;background:#faf8fa;color:#39333d;font-family:monospace;font-size:11px;line-height:1.55;word-break:break-all;">${safePixCode}</div>
              <p style="margin:10px 0 0;color:#8e8995;font-size:11px;line-height:1.55;">Válido até ${expiration}. Se o prazo terminar sem pagamento, o pedido será cancelado automaticamente.</p>
              <a href="${baseUrl}/account/orders/${params.orderId}" style="display:block;margin-top:24px;padding:15px 20px;border-radius:13px;background:linear-gradient(100deg,#ff2f92,#ff9d28);color:#fff;text-align:center;text-decoration:none;font-size:13px;font-weight:800;">Abrir pedido e pagar</a>
            </div>
            <div style="padding:22px 30px 26px;border-top:1px solid #eeeaf0;background:#faf8fa;color:#8e8995;text-align:center;font-size:10px;line-height:1.7;"><strong style="color:#2a2730;">helloustudio</strong><br />Objetos cheios de personalidade, feitos camada por camada.<br />Este é um e-mail automático sobre o seu pedido.</div>
          </div>
        </div>
      `,
    });
    if (res.error) console.error('[email] pix-pending ERRO:', JSON.stringify(res.error, null, 2));
    else console.log('[email] pix-pending ENVIADO para:', params.email, '| id:', res.data?.id);
  } catch (err) {
    console.error('[email] pix-pending EXCEPTION:', err);
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

function formatSubjectName(nome: string | null): string {
  return nome ? ` ${nome}` : '';
}

const ORDER_STATUS_SUBJECTS: Record<string, (nome: string | null) => string> = {
  processing: (nome) => `Hellou${formatSubjectName(nome)}, seu pedido está sendo preparado!`,
  shipped: (nome) => `Hellou${formatSubjectName(nome)}, seu pedido foi enviado!`,
  delivered: (nome) => `Hellou${formatSubjectName(nome)}, seu pedido foi entregue!`,
  canceled: (nome) => `Hellou${formatSubjectName(nome)}, seu pedido foi cancelado`,
  refunded: (nome) => `Hellou${formatSubjectName(nome)}, seu reembolso foi processado`,
};

export async function sendOrderStatusEmail(params: {
  email: string;
  nome: string | null;
  orderId: string;
  newStatus: string;
  trackingCode?: string | null;
  refundAmount?: number;
  refundReason?: string;
}) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();
  const statusLabel = ORDER_STATUS_LABELS[params.newStatus] ?? params.newStatus;

  let extraContent = '';
  let statusIcon = '';
  let statusDescription = '';

  // Custom content for each status
  switch (params.newStatus) {
    case 'processing':
      statusIcon = '⚙️';
      statusDescription = 'Sua peça está sendo impressa com cuidado!';
      break;
    case 'shipped':
      statusIcon = '📦';
      statusDescription = 'Sua peça está a caminho!';
      if (params.trackingCode) {
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
      break;
    case 'delivered':
      statusIcon = '✅';
      statusDescription = 'Sua peça foi entregue com sucesso!';
      break;
    case 'canceled':
      statusIcon = '❌';
      statusDescription = 'Este pedido foi cancelado.';
      break;
    case 'refunded':
      statusIcon = '↩️';
      statusDescription = 'Seu reembolso foi processado.';
      if (params.refundAmount) {
        const refundPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.refundAmount);
        extraContent = `
          <div style="margin: 20px 0; padding: 16px; background: #FEF2F2; border-radius: 8px; border: 1px solid #FECACA;">
            <p style="margin: 0; font-weight: 600; color: #991B1B;">Valor reembolsado:</p>
            <p style="margin: 8px 0 0; font-size: 18px; color: #DC2626; font-weight: 700;">${refundPrice}</p>
            ${params.refundReason ? `<p style="margin: 8px 0 0; font-size: 13px; color: #DC2626;">Motivo: ${params.refundReason}</p>` : ''}
          </div>
        `;
      }
      break;
    default:
      statusIcon = '📋';
      statusDescription = 'Atualização do seu pedido.';
  }

  try {
    const orderIdRef = params.orderId.slice(0, 8).toUpperCase();
    const subjectName = formatSubjectName(params.nome);
    const defaultSubject = `Hellou${subjectName}, atualização do seu pedido #${orderIdRef}`;
    const subject = ORDER_STATUS_SUBJECTS[params.newStatus]
      ? ORDER_STATUS_SUBJECTS[params.newStatus](params.nome)
      : defaultSubject;

    const res = await resend.emails.send({
      from: getFrom(),
      to: params.email,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">${statusIcon}</span>
          </div>
          <h2 style="color: #111; text-align: center; margin: 0 0 8px 0;">Olá${params.nome ? `, ${params.nome}` : ''}!</h2>
          <p style="color: #555; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
            ${statusDescription}
          </p>
          
          <div style="text-align: center; margin: 24px 0;">
            <p style="display: inline-block; padding: 8px 20px; background: linear-gradient(to right, #ec4899, #f97316); color: white; border-radius: 24px; font-weight: 600; font-size: 16px;">
              ${statusLabel}
            </p>
          </div>
          
          ${extraContent}
          
          <div style="margin: 24px 0; padding: 16px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 13px; color: #6B7280; text-align: center;">
              Pedido #${params.orderId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="${baseUrl}/account/orders/${params.orderId}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Ver detalhes do pedido
            </a>
          </div>
          
          <p style="color: #888; font-size: 13px; margin-top: 24px; text-align: center;">
            Dúvidas? Entre em contato pelo WhatsApp
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
  orderType?: 'stl' | 'physical' | 'mixed';
}) {
  const resend = getResend();
  if (!resend) return;

  const baseUrl = getBaseUrl();
  const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.total);
  const formattedDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const orderType = params.orderType || 'physical';
  
  const typeBadge = orderType === 'stl' 
    ? '<span style="display: inline-block; padding: 4px 12px; background: #DBEAFE; color: #1E40AF; border-radius: 12px; font-size: 12px; font-weight: 600;">📁 Arquivo STL</span>'
    : orderType === 'mixed'
    ? '<span style="display: inline-block; padding: 4px 12px; background: #FEF3C7; color: #92400E; border-radius: 12px; font-size: 12px; font-weight: 600;">📦 Misto</span>'
    : '<span style="display: inline-block; padding: 4px 12px; background: #F0FDF4; color: #166534; border-radius: 12px; font-size: 12px; font-weight: 600;">🖨️ Produto Físico</span>';

  try {
    const res = await resend.emails.send({
      from: getFrom(),
      to: params.adminEmail,
      subject: `🔔 Novo pedido! #${params.orderId.slice(0, 8).toUpperCase()} — ${price}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <div style="margin-bottom: 24px;">
            <h2 style="color: #111; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Novo pedido recebido!</h2>
            <p style="color: #666; margin: 0; font-size: 13px;">${formattedDate}</p>
          </div>
          
          <div style="margin: 16px 0; padding: 20px; background: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <p style="margin: 0; font-weight: 600; color: #166534; font-size: 16px;">Pedido #${params.orderId.slice(0, 8).toUpperCase()}</p>
              ${typeBadge}
            </div>
            <p style="margin: 8px 0 0; font-size: 18px; color: #15803D; font-weight: 700;">Total: ${price}</p>
          </div>
          
          <div style="margin: 20px 0; padding: 16px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Dados do cliente</p>
            <p style="color: #374151; font-size: 14px; margin: 4px 0;">
              <strong>Nome:</strong> ${params.customerName ?? 'N/A'}
            </p>
            <p style="color: #374151; font-size: 14px; margin: 4px 0;">
              <strong>Email:</strong> ${params.customerEmail}
            </p>
          </div>
          
          <div style="margin: 20px 0; padding: 12px; background: #FFFBEB; border-radius: 8px; border: 1px solid #FDE68A;">
            <p style="margin: 0; font-size: 13px; color: #92400E;">
              ${orderType === 'stl' ? '⚡ Este é um pedido de arquivo STL - entrega imediata!' : '⚙️ Este é um pedido físico - verifique o prazo de produção.'}
            </p>
          </div>
          
          <a href="${baseUrl}/dashboard/orders/${params.orderId}" style="display: inline-block; margin: 24px 0 16px; padding: 14px 28px; background: linear-gradient(to right, #ec4899, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Ver pedido no painel
          </a>
          
          <p style="color: #9CA3AF; font-size: 12px; margin: 16px 0 0;">
            Sistema de pedidos HellouStudio
          </p>
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
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.log('[email] sendSTLDeliveryEmail: RESEND_API_KEY not configured');
    return false;
  }

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
      return false;
    } else {
      console.log('[email] stl-delivery ENVIADO para:', params.email, '| id:', res.data?.id);
      return true;
    }
  } catch (err) {
    console.error('[email] stl-delivery EXCEPTION:', err);
    return false;
  }
}
