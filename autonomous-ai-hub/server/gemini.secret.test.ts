import { describe, expect, it } from 'vitest';

describe('GEMINI_API_KEY', () => {
  it('authenticates against Gemini model discovery', async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey, 'GEMINI_API_KEY must be configured for this test').toBeTruthy();

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey as string },
    });
    const body = (await response.json()) as {
      error?: { message?: string };
      models?: unknown[];
    };

    expect(response.status, body.error?.message ?? 'Gemini credential validation failed').toBe(200);
    expect(Array.isArray(body.models)).toBe(true);
  }, 30_000);
});
