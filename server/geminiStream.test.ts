import { describe, expect, it } from 'vitest';
import { buildGeminiSystemInstruction, extractGeminiToken, getGeminiStreamingUrl } from './geminiStream';

describe('Gemini streaming helpers', () => {
  it('extracts text deltas from Interactions SSE events', () => {
    expect(extractGeminiToken('{"event_type":"step.delta","delta":{"type":"text","text":"Gemini token"}}')).toBe('Gemini token');
    expect(extractGeminiToken('{"event_type":"step.delta","delta":{"type":"thought","text":"hidden"}}')).toBeNull();
    expect(extractGeminiToken('{"event_type":"step.completed"}')).toBeNull();
  });

  it('uses the official Interactions SSE endpoint', () => {
    expect(getGeminiStreamingUrl()).toBe('https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse');
  });

  it('labels a selected Gemini mirror as owner-supplied contextual guidance', () => {
    const instruction = buildGeminiSystemInstruction('Gemini Developer', 'Lite', 'Use accessible React patterns.');
    expect(instruction).toContain('Gemini Developer branch');
    expect(instruction).toContain('owner-supplied Gemini blueprint or notebook mirror');
    expect(instruction).toContain('Use accessible React patterns.');
  });
});
