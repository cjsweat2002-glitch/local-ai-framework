import { describe, expect, it } from 'vitest';
import {
  GEMINI_WORKBENCH_MODES,
  buildGeminiWorkbenchContext,
  getGeminiWorkbenchStarters,
  redactSensitiveWorkspaceValues,
} from '../client/src/lib/geminiWorkbench';

describe('Gemini project workstation', () => {
  it('defines build, review, diagnose, and planning modes for deep project work', () => {
    expect(GEMINI_WORKBENCH_MODES.map((mode) => mode.id)).toEqual(['build', 'review', 'diagnose', 'plan']);
  });

  it('turns the active mode and project intent into reviewable starting prompts', () => {
    const starters = getGeminiWorkbenchStarters('diagnose', 'repair the canvas command state');
    expect(starters).toHaveLength(3);
    expect(starters[0]).toContain('Diagnose');
    expect(starters[0]).toContain('repair the canvas command state');
  });

  it('redacts known production assignments before building Gemini context', () => {
    const safe = redactSensitiveWorkspaceValues('DATABASE_URL=mysql://private JWT_SECRET: secret-value');
    expect(safe).toContain('DATABASE_URL=[redacted]');
    expect(safe).toContain('JWT_SECRET=[redacted]');
    expect(safe).not.toContain('secret-value');

    const context = buildGeminiWorkbenchContext({
      mode: 'build',
      responseFocus: 'implementation',
      projectIntent: 'Ship an activity rail',
      mirrorName: 'Canvas guide',
      mirrorContext: 'MANUS_API_KEY=do-not-forward',
    });
    expect(context).toContain('Creation mode: Build');
    expect(context).toContain('Private mirror selected: Canvas guide');
    expect(context).toContain('MANUS_API_KEY=[redacted]');
    expect(context).toContain('do not claim to deploy or merge');
  });
});
