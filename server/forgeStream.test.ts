import { describe, expect, it } from 'vitest';
import { extractForgeToken, getForgeCompletionUrl } from './forgeStream';

describe('Forge streaming helpers', () => {
  it('extracts text tokens from OpenAI-compatible stream events', () => {
    expect(extractForgeToken('{"choices":[{"delta":{"content":"live"}}]}')).toBe('live');
    expect(extractForgeToken('{"choices":[{"delta":{"content":" stream"}}]}')).toBe(' stream');
  });

  it('ignores stream terminators and malformed payloads', () => {
    expect(extractForgeToken('[DONE]')).toBeNull();
    expect(extractForgeToken('not-json')).toBeNull();
  });

  it('uses the configured Forge completion endpoint shape', () => {
    expect(getForgeCompletionUrl()).toMatch(/\/v1\/chat\/completions$/);
  });
});
