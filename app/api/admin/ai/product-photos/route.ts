import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { durableRateLimit } from '@/lib/durable-rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase';
import { loadProductImages } from '@/lib/ai/product-generator';
import {
  buildProductPhotoPrompt,
  isProductPhotoAngle,
  productGallery,
  type ProductPhotoFraming,
  type ProductPhotoLighting,
} from '@/lib/ai/product-photo';

export const runtime = 'nodejs';
export const maxDuration = 180;

const ASPECT_RATIOS = new Set(['1:1', '4:5', '3:4']);
const FRAMINGS = new Set<ProductPhotoFraming>(['same', 'closer', 'wider']);
const LIGHTINGS = new Set<ProductPhotoLighting>(['preserve', 'soft', 'bright']);
const OUTPUT_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

type GeminiImageResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }> } }>;
  error?: { code?: number; message?: string; status?: string };
};

function imageExtension(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
}

async function requestGeneratedImage(input: {
  apiKey: string;
  model: string;
  prompt: string;
  source: { mimeType: string; data: string };
  aspectRatio: string;
  quality: '1K' | '2K' | '4K';
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(input.model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': input.apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: input.prompt },
          { inlineData: input.source },
        ] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          responseFormat: { image: { aspectRatio: input.aspectRatio, imageSize: input.quality } },
        },
      }),
      signal: AbortSignal.timeout(150_000),
      cache: 'no-store',
    },
  );
  const data = await response.json().catch(() => ({})) as GeminiImageResponse;
  if (!response.ok) {
    const detail = data.error?.message?.slice(0, 500);
    throw new Error(detail || `A IA recusou a geração (HTTP ${response.status}).`);
  }
  const parts = data.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];
  const image = parts.find((part) => part.inlineData?.data)?.inlineData;
  if (!image?.data || !image.mimeType || !OUTPUT_MIME_TYPES.has(image.mimeType)) {
    throw new Error(parts.find((part) => part.text)?.text?.slice(0, 500) || 'A IA não devolveu uma imagem nesta tentativa.');
  }
  return { mimeType: image.mimeType, buffer: Buffer.from(image.data, 'base64') };
}

export async function POST(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Configure GOOGLE_GENAI_API_KEY para gerar fotos.' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const productId = typeof body.productId === 'string' ? body.productId : '';
  const sourceImageUrl = typeof body.sourceImageUrl === 'string' ? body.sourceImageUrl : '';
  const framing = FRAMINGS.has(body.framing as ProductPhotoFraming) ? body.framing as ProductPhotoFraming : 'same';
  const lighting = LIGHTINGS.has(body.lighting as ProductPhotoLighting) ? body.lighting as ProductPhotoLighting : 'preserve';
  const aspectRatio = typeof body.aspectRatio === 'string' && ASPECT_RATIOS.has(body.aspectRatio) ? body.aspectRatio : '1:1';
  const quality = body.quality === '1K' || body.quality === '4K' ? body.quality : '2K';
  const instructions = typeof body.instructions === 'string' ? body.instructions : '';
  if (!productId || productId.length > 100 || !sourceImageUrl || sourceImageUrl.length > 2000 || !isProductPhotoAngle(body.angle)) {
    return NextResponse.json({ error: 'Produto, imagem-base e ângulo são obrigatórios.' }, { status: 400 });
  }
  if (instructions.length > 600) return NextResponse.json({ error: 'A orientação adicional deve ter até 600 caracteres.' }, { status: 400 });

  const limit = await durableRateLimit(request, `product-photo:${auth.user.id}`, { maxRequests: 16, windowMs: 3600_000 });
  if (!limit.success) return NextResponse.json({ error: 'Limite de 16 fotos geradas por hora atingido. Tente novamente mais tarde.' }, { status: 429 });

  const supabase = getSupabaseAdmin();
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id,name,description,image_url,image_url_2,images')
    .eq('id', productId)
    .maybeSingle();
  if (productError) return NextResponse.json({ error: 'Não foi possível consultar o produto.' }, { status: 500 });
  if (!product) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
  if (!productGallery(product).includes(sourceImageUrl)) {
    return NextResponse.json({ error: 'A imagem-base precisa pertencer à galeria deste produto.' }, { status: 400 });
  }

  const { images } = await loadProductImages([sourceImageUrl]);
  if (!images[0]) {
    return NextResponse.json({ error: 'Não foi possível ler esta imagem. Reenvie-a pelo editor do produto em JPG, PNG ou WebP.' }, { status: 400 });
  }

  try {
    const model = process.env.GOOGLE_GENAI_IMAGE_MODEL || 'gemini-3.1-flash-image';
    const generated = await requestGeneratedImage({
      apiKey,
      model,
      prompt: buildProductPhotoPrompt({
        productName: product.name,
        productDescription: product.description,
        angle: body.angle,
        framing,
        lighting,
        instructions,
      }),
      source: images[0],
      aspectRatio,
      quality,
    });
    if (generated.buffer.byteLength > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'A imagem gerada ficou grande demais. Tente qualidade 2K ou 1K.' }, { status: 502 });
    }
    const path = `product-images/ai-generated/${product.id}/${crypto.randomUUID()}.${imageExtension(generated.mimeType)}`;
    const { error: uploadError } = await supabase.storage.from('products').upload(path, generated.buffer, {
      contentType: generated.mimeType,
      upsert: false,
    });
    if (uploadError) return NextResponse.json({ error: 'A foto foi gerada, mas não foi possível salvar o rascunho.' }, { status: 500 });
    const url = `/api/product-images/${path.split('/').map(encodeURIComponent).join('/')}`;
    return NextResponse.json({
      image: { url, angle: body.angle, sourceImageUrl, model, quality },
      remaining: limit.remaining,
      notice: 'Compare forma, cor, acabamento, texto e quantidade de peças com a foto original antes de aprovar.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida na geração.';
    const quota = /quota|resource_exhausted|429/i.test(message);
    console.error('[product-photos] generation failed:', message);
    return NextResponse.json({ error: quota ? 'A cota de imagens do Gemini foi atingida. Aguarde a renovação da cota.' : `Não foi possível gerar a foto: ${message}` }, { status: quota ? 429 : 502 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  let body: { productId?: string; url?: string };
  try { body = await request.json() as { productId?: string; url?: string }; }
  catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }
  const urlPrefix = `/api/product-images/product-images/ai-generated/${body.productId}/`;
  if (!body.productId || !body.url?.startsWith(urlPrefix)) return NextResponse.json({ error: 'Rascunho inválido.' }, { status: 400 });
  const path = decodeURIComponent(body.url.slice('/api/product-images/'.length));
  const storagePrefix = `product-images/ai-generated/${body.productId}/`;
  const fileName = path.slice(storagePrefix.length);
  if (!path.startsWith(storagePrefix) || !/^[a-f0-9-]+\.(png|jpg|webp)$/i.test(fileName)) {
    return NextResponse.json({ error: 'Caminho de rascunho inválido.' }, { status: 400 });
  }
  const { error } = await getSupabaseAdmin().storage.from('products').remove([path]);
  if (error) return NextResponse.json({ error: 'Não foi possível descartar o rascunho.' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
