import { describe, expect, it } from 'vitest';
import { providerLabel } from '../client/src/lib/providerLabels';

describe('Task History provider labels', () => {
  it('labels every supported provider without falling back Gemini to Manus', () => {
    expect(providerLabel('manus')).toBe('Manus');
    expect(providerLabel('built-in-forge')).toBe('Built-in Forge');
    expect(providerLabel('google-gemini')).toBe('Google Gemini');
  });
});
