import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('creative interface accessibility contract', () => {
  it('keeps reduced-motion support and visible interactive affordances in the global visual system', () => {
    const css = source('client/src/index.css');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.branch-node, .prompt-spark, .nav-sector { transition: none; }');
    expect(css).toContain('button:active');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('outline: 3px solid rgba(16, 185, 201, 0.88);');
  });

  it('exposes destination landmarks across refreshed workspace routes', () => {
    expect(source('client/src/pages/Home.tsx')).toContain('aria-label="Workspace destinations"');
    expect(source('client/src/pages/TaskHistory.tsx')).toContain('aria-label="Task history destinations"');
    expect(source('client/src/pages/SystemFactory.tsx')).toContain('aria-label="System Factory destinations"');
    expect(source('client/src/pages/GeminiDeveloper.tsx')).toContain('aria-label="Gemini Developer destinations"');
    expect(source('client/src/components/BranchSidebar.tsx')).toContain('aria-label="AI work branches"');
  });

  it('provides accessible task and private-mirror controls', () => {
    const chat = source('client/src/components/ConversationChat.tsx');
    const gemini = source('client/src/pages/GeminiDeveloper.tsx');
    expect(chat).toContain('aria-label={`Describe a task for the ${branch} branch`}');
    expect(chat).toContain('type="button" className="prompt-spark"');
    expect(gemini).toContain('aria-pressed={selectedMirror?.id === mirror.id}');
    expect(gemini).toContain("event.key === 'Enter' || event.key === ' '");
    expect(source('client/src/components/BranchSidebar.tsx')).toContain('aria-current={active ? \'page\' : undefined}');
  });
});
