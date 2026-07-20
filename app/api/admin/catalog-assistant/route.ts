import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { buildCatalogImagePrompt, calculateCatalogPrice } from '@/lib/catalog-assistant';
import { rateLimit } from '@/lib/rate-limit';

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
- Não inclua preço nem cálculo nos textos; esses valores são calculados pelo sistema.`;

const CATALOG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    titulo: { type: 'string' },
    descricao_curta: { type: 'string' },
    descricao_completa: { type: 'string' },
  },
  required: ['titulo', 'descricao_curta', 'descricao_completa'],
};

type OpenAIResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string; code?: string };
};

function asNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOutputText(response: OpenAIResponse) {
  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  return null;
}

async function openAIError(response: Response) {
  const body = await response.json().catch(() => null) as OpenAIResponse | null;
  const requestId = response.headers.get('x-request-id');
  console.error('[catalog-assistant] OpenAI error', {
    status: response.status,
    code: body?.error?.code,
    requestId,
  });

  if (response.status === 401) return 'A chave da OpenAI é inválida ou expirou.';
  if (response.status === 429) return 'O limite da OpenAI foi atingido. Tente novamente em alguns instantes.';
  if (body?.error?.code === 'moderation_blocked') return 'A foto ou solicitação foi bloqueada pela moderação de imagem.';
  return 'A OpenAI não conseguiu concluir a geração. Tente novamente.';
}

export async function POST(request: Request) {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Configure OPENAI_API_KEY no ambiente do servidor para usar o assistente.' },
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
    const imageDataUrl = `data:${image.type};base64,${imageBase64}`;
    const safetyIdentifier = createHash('sha256').update(auth.user.id).digest('hex');

    const textResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || 'gpt-5.6-terra',
        store: false,
        reasoning: { effort: 'low' },
        safety_identifier: safetyIdentifier,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Nome base: ${name || 'não informado'}\nCor: ${color || 'cor original'}\nPeso: ${calculation.peso_g} g\nTempo: ${calculation.tempo_impressao}`,
              },
              { type: 'input_image', image_url: imageDataUrl, detail: 'original' },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'catalog_product',
            strict: true,
            schema: CATALOG_SCHEMA,
          },
          verbosity: 'medium',
        },
        max_output_tokens: 1600,
      }),
    });

    if (!textResponse.ok) {
      return NextResponse.json({ error: await openAIError(textResponse) }, { status: 502 });
    }

    const textPayload = await textResponse.json() as OpenAIResponse;
    const outputText = getOutputText(textPayload);
    if (!outputText) {
      return NextResponse.json({ error: 'A IA não retornou o conteúdo do catálogo.' }, { status: 502 });
    }

    const catalog = JSON.parse(outputText) as {
      titulo: string;
      descricao_curta: string;
      descricao_completa: string;
    };

    const editForm = new FormData();
    editForm.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2');
    editForm.append('image[]', image, image.name || 'produto.png');
    editForm.append('prompt', imagePrompt);
    editForm.append('size', '1024x1536');
    editForm.append('quality', 'medium');
    editForm.append('output_format', 'webp');
    editForm.append('output_compression', '85');

    const imageResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: editForm,
    });

    if (!imageResponse.ok) {
      return NextResponse.json({ error: await openAIError(imageResponse) }, { status: 502 });
    }

    const imagePayload = await imageResponse.json() as { data?: Array<{ b64_json?: string }> };
    const generatedImage = imagePayload.data?.[0]?.b64_json;
    if (!generatedImage) {
      return NextResponse.json({ error: 'A IA não retornou a imagem de catálogo.' }, { status: 502 });
    }

    return NextResponse.json({
      ...catalog,
      calculo_valor: calculation,
      prompt_imagem: imagePrompt,
      imagem_catalogo: `data:image/webp;base64,${generatedImage}`,
    });
  } catch (error) {
    console.error('[catalog-assistant] Unexpected error', error);
    return NextResponse.json({ error: 'Não foi possível gerar o catálogo agora.' }, { status: 500 });
  }
}
