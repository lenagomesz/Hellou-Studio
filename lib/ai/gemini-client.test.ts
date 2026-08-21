import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the @google/generative-ai module before importing the client
vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: { text: () => '{"result": "test"}' },
  });

  class MockGoogleGenerativeAI {
    constructor(_apiKey: string) {}
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    SchemaType: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      ARRAY: 'ARRAY',
    },
  };
});

describe('GeminiClient', () => {
  let GeminiClientClass: typeof import('./gemini-client').GeminiClient;
  let geminiClientInstance: InstanceType<typeof GeminiClientClass>;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('GOOGLE_GENAI_API_KEY', 'test-api-key');
    const mod = await import('./gemini-client');
    GeminiClientClass = mod.GeminiClient;
    geminiClientInstance = mod.geminiClient;
  });

  it('should instantiate without errors', () => {
    expect(geminiClientInstance).toBeInstanceOf(GeminiClientClass);
  });

  it('should parse valid JSON responses', async () => {
    const validJson = '{"name": "Test Product", "price": 29.99}';
    const result = await geminiClientInstance.parseStructuredResponse<{
      name: string;
      price: number;
    }>(validJson);

    expect(result).toEqual({ name: 'Test Product', price: 29.99 });
  });

  it('should throw on invalid JSON responses', async () => {
    const invalidJson = 'this is not valid json';

    await expect(
      geminiClientInstance.parseStructuredResponse(invalidJson),
    ).rejects.toThrow('Invalid JSON response from Gemini');
  });
});
