import { describe, it, expect, vi, beforeEach } from 'vitest';
const quotaMocks = vi.hoisted(() => ({ pause: vi.fn(), remember: vi.fn(), generate: vi.fn() }));
vi.mock('./quota-store', () => ({
  getGeminiQuotaPause: quotaMocks.pause, rememberGeminiQuotaPause: quotaMocks.remember, geminiModelName: () => 'test-model',
}));

// Mock the @google/generative-ai module before importing the client
vi.mock('@google/generative-ai', () => {

  class MockGoogleGenerativeAI {
    constructor(_apiKey: string) {}
    getGenerativeModel() {
      return { generateContent: quotaMocks.generate };
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
    vi.clearAllMocks();
    quotaMocks.pause.mockResolvedValue(null);
    quotaMocks.remember.mockResolvedValue(undefined);
    quotaMocks.generate.mockResolvedValue({ response: { text: () => '{"result":"test"}' } });
    vi.resetModules();
    vi.stubEnv('GOOGLE_GENAI_API_KEY', 'test-api-key');
    const mod = await import('./gemini-client');
    GeminiClientClass = mod.GeminiClient;
    geminiClientInstance = mod.geminiClient;
  });

  it('should instantiate without errors', () => {
    expect(geminiClientInstance).toBeInstanceOf(GeminiClientClass);
  });

  it('blocks Google requests while a shared pause is active', async () => {
    const { GeminiQuotaError } = await import('./quota-error');
    const pause = new GeminiQuotaError('daily', '2099-01-01T08:01:00.000Z');
    quotaMocks.pause.mockResolvedValue(pause);
    await expect(geminiClientInstance.generateContent('prompt', 'system')).rejects.toBe(pause);
    expect(quotaMocks.generate).not.toHaveBeenCalled();
  });

  it('records a provider 429 and throws only friendly quota details', async () => {
    quotaMocks.generate.mockRejectedValue({ status: 429, message: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier secret' });
    await expect(geminiClientInstance.generateContent('prompt', 'system')).rejects.toMatchObject({ code: 'GEMINI_QUOTA_EXCEEDED', kind: 'daily' });
    expect(quotaMocks.remember).toHaveBeenCalledWith(expect.objectContaining({ kind: 'daily' }));
    expect(quotaMocks.remember.mock.calls[0][0].message).not.toContain('secret');
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
