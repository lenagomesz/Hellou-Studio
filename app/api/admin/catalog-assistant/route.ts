import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { buildCatalogImagePrompt, calculateCatalogPrice } from '@/lib/catalog-assistant';
import { rateLimit } from '@/lib/rate-limit';
import { geminiClient } from '@/lib/ai/gemini-client';

export const runtime = 'nodejs';
export const maxDuration = 180;

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const SYSTEM_PROMPT = `Você cria conteúdo de catálogo para uma loja brasileira de produtos impressos em 3D.
Analise a foto e os dados fornecidos. Escreva em português do Brasil, com linguagem natural, delicada, profissional e comercial, sem emojis e sem parecer texto de IA.

Regras:
- O título deve ser claro, ter preferencialmente até 70 caracteres e seguir: nome do produto + diferencial principal + cor.
- A descrição curta deve ter um único parágrafo objetivo, destacando função e estilo.
- A descrição completa deve apresentar função, locais de uso, diferenciais, produção em impressão 3D e cor.
- Não invente dimensões, materiais específicos, resistência, certificações ou acessórios.
- Se a foto contiver itens que aparentem ser apenas contexto, finalize com: "Itens decorativos e acessórios das fotos não acompanham o produto."
- Não inclua preço nem cálculo nos textos; esses valores são calculados pelo sistema.
- Responda SEMPRE em JSON com a estrutura: {"titulo": "...", "descricao_curta": "...", "descricao_completa": "..."}`;

function asNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: Request) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Configure GOOGLE_GENAI_API_KEY no ambiente do servidor para usar o assistente.' },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const image = formData.get('image');
    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: 'Selecione uma foto do produto.' }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return NextResponse.json({ error: 'Use uma imagem JPG, PNG ou WebP.' }, { status: 400 });
    }
    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'A imagem deve ter no máximo 4 MB.' }, { status: 400 });
    }

    const name = String(formData.get('name') ?? '').trim();
    const color = String(formData.get('color') ?? '').trim();
    const weightGrams = asNumber(formData.get('weightGrams'));
    const hours = asNumber(formData.get('hours'));
    const minutes = asNumber(formData.get('minutes'));
    const filamentPricePerKg = asNumber(formData.get('filamentPricePerKg')) || 100;

    if (weightGrams <= 0 || hours + minutes / 60 <= 0) {
      return NextResponse.json(
        { error: 'Informe o peso e o tempo de impressão antes de gerar.' },
        { status: 400 },
      );
    }

    const limit = rateLimit(`catalog-assistant:${auth.user.id}`, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.success) {
      return NextResponse.json(
        { error: 'Limite de 5 gerações por hora atingido. Tente novamente mais tarde.' },
        { status: 429 },
      );
    }

    const calculation = calculateCatalogPrice({
      weightGrams,
      hours,
      minutes,
      filamentPricePerKg,
    });
    const imagePrompt = buildCatalogImagePrompt(color);
    const imageBase64 = Buffer.from(await image.arrayBuffer()).toString('base64');

    const userMessage = `Nome base: ${name || 'não informado'}\nCor: ${color || 'cor original'}\nPeso: ${calculation.peso_g} g\nTempo: ${calculation.tempo_impressao}`;

    const { text: catalogJson } = await geminiClient.generateContent(
      userMessage,
      SYSTEM_PROMPT,
      { mimeType: image.type, data: imageBase64 },
    );

    let catalog: { titulo: string; descricao_curta: string; descricao_completa: string };
    try {
      const jsonMatch = catalogJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      catalog = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[catalog-assistant] JSON parse error:', parseErr);
      return NextResponse.json({ error: 'A IA não retornou o conteúdo do catálogo em formato válido.' }, { status: 502 });
    }

    return NextResponse.json({
      ...catalog,
      calculo_valor: calculation,
      prompt_imagem: imagePrompt,
      imagem_catalogo: `data:${image.type};base64,${imageBase64}`,
    });
  } catch (error) {
    console.error('[catalog-assistant] Unexpected error', error);
    return NextResponse.json({ error: 'Não foi possível gerar o catálogo agora.' }, { status: 500 });
  }
}
