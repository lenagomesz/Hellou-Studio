import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const client = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY!);

export class GeminiClient {
  private model = client.getGenerativeModel({
    model: 'gemini-1.5-flash',
    safetySettings: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { category: 'HARM_CATEGORY_UNSPECIFIED' as any, threshold: 'BLOCK_NONE' as any },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
    ],
  });

  async generateContent(
    userPrompt: string,
    systemPrompt: string,
    responseSchema?: { type: string; properties: Record<string, unknown>; required: string[] },
  ): Promise<string> {
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
      return text;
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
