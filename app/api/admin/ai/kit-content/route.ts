import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { durableRateLimit } from '@/lib/durable-rate-limit';
import { geminiQuotaResponse } from '@/lib/ai/quota-response';
import { generateKitContent } from '@/lib/ai/kit-content';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;
  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return NextResponse.json({ error: 'Gemini não configurado. A edição manual continua disponível.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Dados do kit inválidos.' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const current = input.current as Record<string, unknown> | undefined;
  const productNames = input.productNames;
  const instruction = input.instruction;
  if (!current
    || typeof current.title !== 'string' || current.title.length > 80
    || typeof current.eyebrow !== 'string' || current.eyebrow.length > 100
    || typeof current.description !== 'string' || current.description.length > 350
    || !Array.isArray(productNames) || productNames.length < 2 || productNames.length > 8
    || productNames.some(name => typeof name !== 'string' || !name.trim() || name.length > 120)
    || (instruction !== undefined && (typeof instruction !== 'string' || instruction.length > 500))) {
    return NextResponse.json({ error: 'Selecione de 2 a 8 produtos e revise os dados do kit.' }, { status: 400 });
  }

  const limit = await durableRateLimit(request, `kit-content:${auth.user.id}`, { maxRequests: 20, windowMs: 3_600_000 });
  if (!limit.success) return NextResponse.json({ error: 'Limite de 20 gerações por hora atingido.' }, { status: 429 });

  try {
    const content = await generateKitContent({
      current: {
        title: current.title,
        eyebrow: current.eyebrow,
        description: current.description,
      },
      productNames: productNames.map(name => name.trim()),
      instruction: typeof instruction === 'string' ? instruction.trim() : undefined,
    });
    return NextResponse.json({ content });
  } catch (error) {
    return geminiQuotaResponse(error)
      ?? NextResponse.json({ error: 'Não foi possível gerar agora. Os textos atuais foram mantidos.' }, { status: 502 });
  }
}
