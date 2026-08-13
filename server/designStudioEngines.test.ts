import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DESIGN_ENGINES, getEnginePrompts } from '../client/src/lib/designEngines';

describe('integrated Design Studio engines', () => {
  it('defines six distinct engines spanning creative direction, content, research, implementation, and governance', () => {
    expect(DESIGN_ENGINES).toHaveLength(6);
    expect(new Set(DESIGN_ENGINES.map((engine) => engine.id)).size).toBe(6);
    expect(DESIGN_ENGINES.map((engine) => engine.workspace)).toEqual(expect.arrayContaining([
      'Research', 'Content Creation', 'Design & UI', 'Gemini Developer', 'System Factory',
    ]));
  });

  it('turns a selected engine and project seed into concise conversation starters', () => {
    const prompts = getEnginePrompts(DESIGN_ENGINES[1], 'an independent music identity');
    expect(prompts).toHaveLength(3);
    expect(prompts.every((prompt) => prompt.includes('Identity Forge'))).toBe(true);
    expect(prompts.some((prompt) => prompt.includes('independent music identity'))).toBe(true);
  });

  it('keeps the Design Studio handoff editable in the Design & UI conversation rather than submitting work automatically', () => {
    const home = readFileSync(resolve(process.cwd(), 'client/src/pages/Home.tsx'), 'utf8');
    const chat = readFileSync(resolve(process.cwd(), 'client/src/components/ConversationChat.tsx'), 'utf8');
    expect(home).toContain("sessionStorage.getItem('designStudioHandoff')");
    expect(home).toContain('starterPrompts={designHandoff?.prompts}');
    expect(chat).toContain('initialPrompt?: string;');
    expect(chat).toContain('if (initialPrompt) setInputValue(initialPrompt);');
  });
});
