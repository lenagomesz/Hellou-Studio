// Pre-built email templates for the marketing system

export interface PreBuiltTemplate {
  name: string;
  slug: string;
  subject: string;
  category: string;
  variables: string[];
  preview_text: string;
  body_html: string;
}

const brandGradient = 'linear-gradient(to right, #ec4899, #f97316)';
const brandPink = '#ec4899';

function wrapInLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="padding:32px 32px 0;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:700;background:${brandGradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">helloustudio</h1>
      </div>
      <!-- Content -->
      <div style="padding:32px;">
        ${content}
      </div>
      <!-- Footer -->
      <div style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">
          Voce recebeu este email porque esta cadastrado na helloustudio.
        </p>
        <a href="{{unsubscribe_url}}" style="font-size:12px;color:#6b7280;text-decoration:underline;">Cancelar inscricao</a>
      </div>
    </div>
  </div>
</body>
</html>`.trim();
}

function ctaButton(text: string, url: string, color?: string): string {
  return `<a href="${url}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:${color || brandGradient};color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${text}</a>`;
}

export const preBuiltTemplates: PreBuiltTemplate[] = [
  {
    name: 'Boas-vindas',
    slug: 'welcome',
    subject: 'Bem-vindo(a) a helloustudio, {customer_name}!',
    category: 'welcome',
    variables: ['customer_name', 'unsubscribe_url'],
    preview_text: 'Estamos felizes em ter voce por aqui!',
    body_html: wrapInLayout(`
      <h2 style="margin:0 0 16px;color:#111;font-size:20px;">Ola, {customer_name}!</h2>
      <p style="color:#555;line-height:1.7;margin:0 0 16px;">
        Seja muito bem-vindo(a) a <strong>helloustudio</strong>! Estamos super felizes em ter voce por aqui.
      </p>
      <p style="color:#555;line-height:1.7;margin:0 0 16px;">
        Aqui voce encontra pecas unicas impressas em 3D, feitas com muito carinho e atencao aos detalhes.
      </p>
      ${ctaButton('Explorar produtos', '{{base_url}}/products')}
      <p style="color:#888;font-size:13px;margin:16px 0 0;">
        Tem alguma duvida? Responda este email que teremos prazer em ajudar!
      </p>
    `),
  },
  {
    name: 'Carrinho abandonado',
    slug: 'abandoned-cart',
    subject: '{customer_name}, voce esqueceu algo no carrinho!',
    category: 'abandoned_cart',
    variables: ['customer_name', 'cart_items', 'cart_total', 'unsubscribe_url'],
    preview_text: 'Seus itens estao esperando por voce',
    body_html: wrapInLayout(`
      <h2 style="margin:0 0 16px;color:#111;font-size:20px;">Ola, {customer_name}!</h2>
      <p style="color:#555;line-height:1.7;margin:0 0 16px;">
        Notamos que voce deixou alguns itens no carrinho. Eles ainda estao la, esperando por voce!
      </p>
      <div style="margin:20px 0;padding:16px;background:#fef3f2;border-radius:12px;border:1px solid #fecaca;">
        <p style="margin:0;font-weight:600;color:#991b1b;">Itens no carrinho:</p>
        <p style="margin:8px 0 0;color:#dc2626;font-size:14px;">{cart_items}</p>
        <p style="margin:8px 0 0;font-weight:700;color:#111;">Total: {cart_total}</p>
      </div>
      ${ctaButton('Finalizar compra', '{{base_url}}/cart')}
      <p style="color:#888;font-size:13px;margin:16px 0 0;">
        Precisa de ajuda? Estamos aqui para voce!
      </p>
    `),
  },
  {
    name: 'Confirmacao de pedido',
    slug: 'order-confirmation',
    subject: 'Pedido confirmado! #{order_id}',
    category: 'order_confirmation',
    variables: ['customer_name', 'order_id', 'order_total', 'order_items', 'unsubscribe_url'],
    preview_text: 'Seu pedido foi confirmado com sucesso',
    body_html: wrapInLayout(`
      <h2 style="margin:0 0 16px;color:#111;font-size:20px;">Pedido confirmado!</h2>
      <p style="color:#555;line-height:1.7;margin:0 0 16px;">
        Ola, {customer_name}! Seu pedido <strong>#{order_id}</strong> foi confirmado com sucesso.
      </p>
      <div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
        <p style="margin:0;font-weight:600;color:#166534;">Resumo do pedido</p>
        <p style="margin:8px 0 0;color:#15803d;font-size:14px;">{order_items}</p>
        <p style="margin:12px 0 0;font-weight:700;color:#111;font-size:16px;">Total: {order_total}</p>
      </div>
      ${ctaButton('Acompanhar pedido', '{{base_url}}/account/orders')}
    `),
  },
  {
    name: 'Pedido enviado',
    slug: 'shipping-notification',
    subject: '{customer_name}, seu pedido foi enviado!',
    category: 'shipping',
    variables: ['customer_name', 'order_id', 'tracking_code', 'unsubscribe_url'],
    preview_text: 'Seu pedido esta a caminho',
    body_html: wrapInLayout(`
      <h2 style="margin:0 0 16px;color:#111;font-size:20px;">Pedido enviado!</h2>
      <p style="color:#555;line-height:1.7;margin:0 0 16px;">
        Ola, {customer_name}! Seu pedido <strong>#{order_id}</strong> foi enviado e esta a caminho.
      </p>
      <div style="margin:20px 0;padding:16px;background:#eff6ff;border-radius:12px;border:1px solid #bfdbfe;">
        <p style="margin:0;font-weight:600;color:#1e40af;">Codigo de rastreamento:</p>
        <p style="margin:8px 0 0;font-size:18px;color:#1d4ed8;font-family:monospace;letter-spacing:1px;">{tracking_code}</p>
      </div>
      ${ctaButton('Rastrear encomenda', 'https://www.linkcorreios.com.br/?id={tracking_code}')}
    `),
  },
  {
    name: 'Reativacao',
    slug: 'reactivation',
    subject: '{customer_name}, sentimos sua falta!',
    category: 'reactivation',
    variables: ['customer_name', 'discount_code', 'discount_percent', 'unsubscribe_url'],
    preview_text: 'Temos uma surpresa para voce voltar',
    body_html: wrapInLayout(`
      <h2 style="margin:0 0 16px;color:#111;font-size:20px;">Sentimos sua falta, {customer_name}!</h2>
      <p style="color:#555;line-height:1.7;margin:0 0 16px;">
        Faz um tempo que voce nao nos visita, e preparamos algo especial para voce voltar:
      </p>
      <div style="margin:20px 0;padding:24px;background:linear-gradient(135deg,#fdf2f8,#fff7ed);border-radius:12px;text-align:center;">
        <p style="margin:0;font-size:14px;color:#555;">Use o cupom:</p>
        <p style="margin:8px 0;font-size:24px;font-weight:800;color:#ec4899;letter-spacing:2px;">{discount_code}</p>
        <p style="margin:0;font-size:16px;color:#f97316;font-weight:600;">{discount_percent}% de desconto</p>
      </div>
      ${ctaButton('Aproveitar desconto', '{{base_url}}/products')}
      <p style="color:#888;font-size:13px;margin:16px 0 0;">
        Valido por 7 dias. Nao perca!
      </p>
    `),
  },
  {
    name: 'Promocao',
    slug: 'promotion',
    subject: '{promo_title}',
    category: 'promotion',
    variables: ['customer_name', 'promo_title', 'promo_description', 'promo_code', 'unsubscribe_url'],
    preview_text: 'Confira nossa nova promocao exclusiva',
    body_html: wrapInLayout(`
      <h2 style="margin:0 0 16px;color:#111;font-size:20px;">{promo_title}</h2>
      <p style="color:#555;line-height:1.7;margin:0 0 16px;">
        Ola, {customer_name}! {promo_description}
      </p>
      <div style="margin:20px 0;padding:24px;background:linear-gradient(135deg,#fdf2f8,#fff7ed);border-radius:12px;text-align:center;">
        <p style="margin:0;font-size:14px;color:#555;">Cupom exclusivo:</p>
        <p style="margin:8px 0;font-size:24px;font-weight:800;color:#ec4899;letter-spacing:2px;">{promo_code}</p>
      </div>
      ${ctaButton('Ver produtos', '{{base_url}}/products')}
    `),
  },
  {
    name: 'Novidades',
    slug: 'newsletter',
    subject: 'Novidades da helloustudio',
    category: 'newsletter',
    variables: ['customer_name', 'content', 'unsubscribe_url'],
    preview_text: 'Confira as ultimas novidades',
    body_html: wrapInLayout(`
      <h2 style="margin:0 0 16px;color:#111;font-size:20px;">Ola, {customer_name}!</h2>
      <div style="color:#555;line-height:1.7;margin:0 0 16px;">
        {content}
      </div>
      ${ctaButton('Ver na loja', '{{base_url}}/products')}
    `),
  },
  {
    name: 'Aniversario',
    slug: 'birthday',
    subject: 'Feliz aniversario, {customer_name}! Presente especial pra voce',
    category: 'birthday',
    variables: ['customer_name', 'discount_code', 'unsubscribe_url'],
    preview_text: 'Um presente especial para o seu dia',
    body_html: wrapInLayout(`
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:48px;">🎂</span>
      </div>
      <h2 style="margin:0 0 16px;color:#111;font-size:20px;text-align:center;">Feliz Aniversario, {customer_name}!</h2>
      <p style="color:#555;line-height:1.7;margin:0 0 16px;text-align:center;">
        Neste dia especial, preparamos um presente exclusivo para voce:
      </p>
      <div style="margin:20px 0;padding:24px;background:linear-gradient(135deg,#fdf2f8,#fff7ed);border-radius:12px;text-align:center;">
        <p style="margin:0;font-size:14px;color:#555;">Desconto exclusivo de aniversario:</p>
        <p style="margin:8px 0;font-size:28px;font-weight:800;color:#ec4899;letter-spacing:2px;">{discount_code}</p>
        <p style="margin:0;font-size:14px;color:#f97316;">15% OFF em qualquer pedido!</p>
      </div>
      <div style="text-align:center;">
        ${ctaButton('Usar meu presente', '{{base_url}}/products')}
      </div>
    `),
  },
];

export function getTemplateBySlug(slug: string): PreBuiltTemplate | undefined {
  return preBuiltTemplates.find(t => t.slug === slug);
}

export function renderTemplate(html: string, variables: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return rendered;
}
