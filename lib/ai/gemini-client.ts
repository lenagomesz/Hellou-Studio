import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

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
        model: 'gemini-3.6-flash',
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
    responseSchema?: { type: string; properties: Record<string, unknown>; required: string[] },
  ): Promise<{ text: string; tokensUsed: number }> {
    try {
      const config = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: responseSchema
          ? {
              responseMimeType: 'application/json',
              responseSchema: {
                type: SchemaType.OBJECT,
                properties: responseSchema.properties as Record<string, unknown>,
                required: responseSchema.required,
              },
            }
          : undefined,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.model.generateContent as any)(config);
      const text = result.response.text();
      const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;
      return { text, tokensUsed };
    } catch (error) {
      console.error('[GeminiClient] Error generating content:', error);
      throw error;
    }
  }

  async parseStructuredResponse<T>(response: string, _schema?: object): Promise<T> {
    try {
      return JSON.parse(response) as T;
    } catch {
      console.error('[GeminiClient] Failed to parse response as JSON:', response);
      throw new Error('Invalid JSON response from Gemini');
    }
  }
}

export const geminiClient = new GeminiClient();
