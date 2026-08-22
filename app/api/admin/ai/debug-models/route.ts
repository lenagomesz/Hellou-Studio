import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

const MODELS_TO_TRY = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

export async function GET() {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_GENAI_API_KEY não configurada' },
      { status: 503 }
    );
  }

  try {
    console.log('[debug-models] Testando modelos disponíveis...');
    const client = new GoogleGenerativeAI(apiKey);

    const results = [];

    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`[debug-models] Testando modelo: ${modelName}...`);
        const model = client.getGenerativeModel({ model: modelName });

        // Tenta gerar uma resposta simples para validar
        await model.generateContent('Teste');

        console.log(`[debug-models] ✅ ${modelName} funciona!`);
        results.push({
          model: modelName,
          status: 'available',
          message: 'Modelo funcionando',
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`[debug-models] ❌ ${modelName}: ${errorMsg}`);
        results.push({
          model: modelName,
          status: 'unavailable',
          message: errorMsg.substring(0, 100),
        });
      }
    }

    const available = results.filter(r => r.status === 'available');

    return NextResponse.json({
      tested: results,
      availableModels: available.map(r => r.model),
      recommendedModel: available.length > 0 ? available[0].model : null,
    });
  } catch (error) {
    console.error('[debug-models] Erro:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
