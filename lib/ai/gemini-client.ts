import { GoogleGenerativeAI, SchemaType, type Schema, type Part, type GenerateContentRequest } from '@google/generative-ai';

export type GeminiImage = { mimeType: string; data: string };
export type GeminiSchema = { type: string; properties: Record<string, unknown>; required: string[] };

export class GeminiClient {
  private modelInstance: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

  private get model() {
    if (!this.modelInstance) {
      const apiKey = process.env.GOOGLE_GENAI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_GENAI_API_KEY não está configurada');
      }
      const client = new GoogleGenerativeAI(apiKey);
      this.modelInstance = client.getGenerativeModel({
        model: process.env.GOOGLE_GENAI_MODEL || 'gemini-3.6-flash',
        safetySettings: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
        ],
      });
    }
    return this.modelInstance;
  }

  async generateContent(
    userPrompt: string,
    systemPrompt: string,
    responseSchema?: { type: string; properties: Record<string, unknown>; required: string[] } | { mimeType: string; data: string },
    conversationHistory?: Array<{ role: string; parts: Array<{ text: string }> }>,
    options?: { images?: GeminiImage[]; timeoutMs?: number; maxOutputTokens?: number },
  ): Promise<{ text: string; tokensUsed: number }> {
    try {
      const isImage = responseSchema && 'mimeType' in responseSchema && 'data' in responseSchema;
      const imageParam = isImage ? responseSchema as { mimeType: string; data: string } : null;

      const parts: Part[] = [{ text: userPrompt }];
      for (const image of [...(imageParam ? [imageParam] : []), ...(options?.images ?? [])]) {
        parts.push({ inlineData: image });
      }
      const contents = [
        ...(conversationHistory ?? []).map(turn => ({
          ...turn, role: turn.role === 'assistant' ? 'model' : turn.role,
        })),
        { role: 'user', parts },
      ];

      const schemaParam = responseSchema && !isImage && 'type' in responseSchema
        ? responseSchema as { type: string; properties: Record<string, unknown>; required: string[] }
        : null;

      const config: GenerateContentRequest = {
        contents,
        systemInstruction: systemPrompt,
        generationConfig: {
          ...(options?.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
          ...(schemaParam ? {
              responseMimeType: 'application/json',
              responseSchema: {
                type: SchemaType.OBJECT,
                properties: schemaParam.properties as Record<string, Schema>,
                required: schemaParam.required,
              },
            } : {}),
        },
      };

      const result = await this.model.generateContent(config, { timeout: options?.timeoutMs ?? 45_000 });
      const text = result.response.text();
      const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;
      return { text, tokensUsed };
    } catch (error) {
      console.error('[GeminiClient] Falha na geração de conteúdo.');
      throw error;
    }
  }

  async parseStructuredResponse<T>(response: string, _schema?: object): Promise<T> {
    try {
      return JSON.parse(response) as T;
    } catch {
      console.error('[GeminiClient] Resposta JSON inválida.');
      throw new Error('Invalid JSON response from Gemini');
    }
  }
}

export const geminiClient = new GeminiClient();
