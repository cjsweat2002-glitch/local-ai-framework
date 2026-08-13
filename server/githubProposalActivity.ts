import type { Express, Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { z } from 'zod';
import { createDevelopmentActivity, getUserByOpenId } from './db';
import { ENV } from './_core/env';

const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
const GITHUB_REPOSITORY = 'cjsweat2002-glitch/local-ai-framework';
const GITHUB_WORKFLOW = 'Gemini Edit Proposals';
const githubJwks = createRemoteJWKSet(new URL(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`));

const proposalActivitySchema = z.object({
  phase: z.enum(['plan_ready', 'approval_received']),
  issueNumber: z.number().int().positive().optional(),
  pullNumber: z.number().int().positive().optional(),
  runId: z.string().regex(/^\d+$/).max(32),
}).strict();

export type GeminiProposalPhase = z.infer<typeof proposalActivitySchema>['phase'];

export function hasTrustedGithubProposalClaims(payload: JWTPayload): boolean {
  return payload.repository === GITHUB_REPOSITORY
    && payload.workflow === GITHUB_WORKFLOW
    && payload.event_name === 'issue_comment'
    && payload.runner_environment === 'github-hosted';
}

export function describeGeminiProposalActivity(phase: GeminiProposalPhase, issueNumber?: number, pullNumber?: number) {
  const target = pullNumber ? `pull request #${pullNumber}` : issueNumber ? `issue #${issueNumber}` : 'the linked discussion';
  if (phase === 'plan_ready') {
    return {
      level: 'info' as const,
      title: 'Gemini edit plan is ready for review',
      detail: `The guarded Gemini workflow produced a proposal plan for ${target}. Review and approve it in GitHub before any isolated pull-request proposal can be created.`,
    };
  }
  return {
    level: 'success' as const,
    title: 'Owner approval received for Gemini proposal',
    detail: `The guarded workflow received owner approval for ${target}. Any resulting source change remains isolated to a pull request and cannot deploy or merge itself.`,
  };
}

function getBearerToken(request: Request) {
  const authorization = request.header('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;
}

export function registerGithubProposalActivityRoute(app: Express) {
  app.post('/api/activity-pulse/github', async (request, response) => {
    const token = getBearerToken(request);
    if (!token) return response.status(401).json({ error: 'GitHub OIDC token required' });

    try {
      const { payload } = await jwtVerify(token, githubJwks, {
        issuer: GITHUB_OIDC_ISSUER,
        audience: ENV.activityPulseOidcAudience,
      });
      if (!hasTrustedGithubProposalClaims(payload)) return response.status(403).json({ error: 'Untrusted GitHub workflow identity' });

      const input = proposalActivitySchema.parse(request.body);
      const owner = await getUserByOpenId(ENV.ownerOpenId);
      if (!owner) return response.status(503).json({ error: 'Activity owner is not available' });

      const activity = describeGeminiProposalActivity(input.phase, input.issueNumber, input.pullNumber);
      const record = await createDevelopmentActivity(owner.id, {
        kind: 'development',
        level: activity.level,
        title: activity.title,
        detail: activity.detail,
        source: `github-oidc:${input.runId}`,
      });
      return response.status(201).json({ id: record.id });
    } catch (error) {
      if (error instanceof z.ZodError) return response.status(400).json({ error: 'Invalid proposal milestone payload' });
      console.warn('[ActivityPulse] GitHub proposal activity rejected:', error instanceof Error ? error.message : error);
      return response.status(401).json({ error: 'Invalid GitHub OIDC token' });
    }
  });
}
