import { NextResponse } from 'next/server';
import { geminiQuotaResponse } from '@/lib/ai/quota-response';
import { requirePermission } from '@/lib/api';
import { durableRateLimit } from '@/lib/durable-rate-limit';
import { generateProductContent, loadProductImages } from '@/lib/ai/product-generator';
import { calculateCatalogPrice } from '@/lib/catalog-assistant';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  if (!process.env.GOOGLE_GENAI_API_KEY) return NextResponse.json({ error: 'Gemini não configurado. O cadastro manual continua disponível.' }, { status: 503 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || typeof body.keywords !== 'string' || body.keywords.length > 1000
    || (body.imageUrl !== undefined && (typeof body.imageUrl !== 'string' || body.imageUrl.length > 2000))
    || (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 5000))) {
    return NextResponse.json({ error: 'Informe palavras-chave (até 1000 caracteres) ou uma foto.' }, { status: 400 });
  }
  if (!body.keywords.trim() && !body.imageUrl) return NextResponse.json({ error: 'Informe palavras-chave ou envie uma foto.' }, { status: 400 });
  let calculation = null;
  if (body.pricing !== undefined) {
    const p = body.pricing;
    if (!p || !['weightGrams', 'hours', 'minutes', 'filamentPricePerKg'].every(key => typeof p[key] === 'number' && Number.isFinite(p[key]) && p[key] >= 0)
      || p.weightGrams <= 0 || p.weightGrams > 100000 || p.hours > 1000 || p.minutes > 59 || p.hours + p.minutes / 60 <= 0 || p.filamentPricePerKg <= 0 || p.filamentPricePerKg > 10000) {
      return NextResponse.json({ error: 'Informe peso, tempo e custo do filamento válidos para sugerir preço.' }, { status: 400 });
    }
    calculation = calculateCatalogPrice(p);
  }
  const limit = await durableRateLimit(request, `product-content:${auth.user.id}`, { maxRequests: 20, windowMs: 3600_000 });
  if (!limit.success) return NextResponse.json({ error: 'Limite de 20 gerações por hora atingido.' }, { status: 429 });
  try {
    const { images, loadedUrls } = await loadProductImages(body.imageUrl ? [body.imageUrl] : []);
    if (body.imageUrl && images.length === 0) return NextResponse.json({ error: 'Não foi possível ler a foto. Envie uma imagem JPG, PNG ou WebP pelo editor ou gere apenas com palavras-chave.' }, { status: 400 });
    const content = await generateProductContent({ keywords: body.keywords, description: body.description ?? '', type: 'physical' }, images);
    return NextResponse.json({ content, imageUrls: loadedUrls, calculation });
  } catch (error) { return geminiQuotaResponse(error) ?? NextResponse.json({ error: 'Não foi possível gerar agora. Seus campos manuais foram mantidos.' }, { status: 502 }); }
}
