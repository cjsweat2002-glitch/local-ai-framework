import { describe, expect, it } from 'vitest';
import { describeGeminiProposalActivity, hasTrustedGithubProposalClaims } from './githubProposalActivity';

describe('GitHub OIDC Gemini proposal activity contract', () => {
  const trustedClaims = {
    repository: 'cjsweat2002-glitch/local-ai-framework',
    workflow: 'Gemini Edit Proposals',
    event_name: 'issue_comment',
    runner_environment: 'github-hosted',
  };

  it('accepts only the guarded repository workflow identity', () => {
    expect(hasTrustedGithubProposalClaims(trustedClaims)).toBe(true);
    expect(hasTrustedGithubProposalClaims({ ...trustedClaims, repository: 'untrusted/example' })).toBe(false);
    expect(hasTrustedGithubProposalClaims({ ...trustedClaims, workflow: 'Unrelated workflow' })).toBe(false);
    expect(hasTrustedGithubProposalClaims({ ...trustedClaims, event_name: 'push' })).toBe(false);
  });

  it('writes non-sensitive, review-only lifecycle descriptions', () => {
    expect(describeGeminiProposalActivity('plan_ready', 42)).toMatchObject({
      level: 'info',
      title: 'Gemini edit plan is ready for review',
    });
    const approval = describeGeminiProposalActivity('approval_received', undefined, 6);
    expect(approval).toMatchObject({ level: 'success', title: 'Owner approval received for Gemini proposal' });
    expect(approval.detail).toContain('cannot deploy or merge itself');
  });
});
