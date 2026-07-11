import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeEmail } from '@/lib/email-marketing/service';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    const campaign = req.nextUrl.searchParams.get('campaign');

    if (!email) {
      return new NextResponse(unsubscribePage('Email nao encontrado.', true), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    await unsubscribeEmail(email, campaign ? `Campaign: ${campaign}` : undefined);

    return new NextResponse(unsubscribePage(email, false), {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch {
    return new NextResponse(unsubscribePage('Erro ao processar.', true), {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    });
  }
}

function unsubscribePage(emailOrError: string, isError: boolean): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancelar inscricao - helloustudio</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: white; border-radius: 16px; padding: 48px; max-width: 440px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 24px; margin: 0 0 16px; background: linear-gradient(to right, #ec4899, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    p { color: #555; line-height: 1.6; margin: 0 0 16px; }
    .email { font-weight: 600; color: #111; }
    .error { color: #dc2626; }
    .success { color: #16a34a; }
  </style>
</head>
<body>
  <div class="card">
    <h1>helloustudio</h1>
    ${isError
      ? `<p class="error">${emailOrError}</p>`
      : `<p class="success">Inscricao cancelada com sucesso!</p><p>O email <span class="email">${emailOrError}</span> nao recebera mais emails de marketing.</p><p style="color:#888;font-size:13px;">Voce pode se reinscrever a qualquer momento acessando sua conta.</p>`
    }
  </div>
</body>
</html>`;
}
