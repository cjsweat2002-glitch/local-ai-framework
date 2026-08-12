import { describe, expect, it } from 'vitest';
import { toManusAgentProfile } from './manus';

describe('provider orchestration mappings', () => {
  it('maps the public agent profile labels to Manus v2 profiles', () => {
    expect(toManusAgentProfile('Standard')).toBe('manus-1.6');
    expect(toManusAgentProfile('Lite')).toBe('manus-1.6-lite');
    expect(toManusAgentProfile('Max')).toBe('manus-1.6-max');
  });
});
