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

## Sources

1. GitHub Docs, [OpenID Connect reference](https://docs.github.com/actions/reference/openid-connect-reference).
2. GitHub Docs, [OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect).
