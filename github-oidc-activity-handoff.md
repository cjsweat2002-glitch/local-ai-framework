# GitHub OIDC Activity Handoff

## Security Boundary

The Gemini GitHub workflow must not receive browser cookies, a Manus session, or direct deployment authority. Instead, a workflow job can obtain a short-lived GitHub Actions OIDC token and submit a small, non-sensitive proposal milestone to a dedicated site endpoint.

The site endpoint must validate the GitHub issuer, a custom audience, and repository-scoped claims before it writes an owner-private Activity Pulse event. The event body must be constrained to predefined milestone types, bounded text, and GitHub run/issue/PR references only. It must never accept source code, cookies, secrets, deployment instructions, or arbitrary commands.

## Verified Controls

| Control | Purpose |
| --- | --- |
| GitHub OIDC JWT | Short-lived job identity rather than a stored site credential. |
| Custom audience | Restricts tokens to this narrow Activity Pulse handoff. |
| Issuer validation | Accepts only `https://token.actions.githubusercontent.com`. |
| Repository claim allow-list | Restricts the endpoint to `cjsweat2002-glitch/local-ai-framework`. |
| Workflow claim allow-list | Restricts events to the guarded `Gemini Edit Proposals` workflow. |
| Owner-private database record | Keeps the activity feed visible only to the authenticated project owner. |

## Repository Synchronization Status

The verified application source is available for review in [pull request #7](https://github.com/cjsweat2002-glitch/local-ai-framework/pull/7). It includes the Activity Pulse page, retained activity APIs, the site-side OIDC verifier, supporting tests, research records, and the creative workspace changes.

The intended update to `.github/workflows/gemini-edit-proposals.yml` was deliberately excluded from that pull request after GitHub rejected the automated push: the connected GitHub App does not have write permission for workflow files. This is a repository permission boundary, not a source or test failure. To activate GitHub-to-Activity-Pulse proposal milestones, an owner must either grant the connected App **Workflow read-and-write** permission or manually apply the already-tested workflow step from the managed project. Until then, Gemini remains limited to the existing guarded planning workflow and will not emit Activity Pulse milestones from GitHub.

## Sources

1. GitHub Docs, [OpenID Connect reference](https://docs.github.com/actions/reference/openid-connect-reference).
2. GitHub Docs, [OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect).
