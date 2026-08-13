# Guarded Gemini Workflow: Vertex Authentication Setup

## Objective

Replace the rejected consumer API-key path for `.github/workflows/gemini-edit-proposals.yml` with Google Cloud Vertex AI authentication through GitHub Actions Workload Identity Federation (WIF). The workflow remains constrained to owner-initiated planning and owner-approved proposal pull requests; it never merges or deploys directly.

## Verified Project State

| Item | Status |
|---|---|
| Google Cloud project | `project-8ae8b5f7-7636-4261-a21` (`My First Project`) |
| Vertex/Agent Platform API | Enabled with the owner's approval |
| GitHub repository | `cjsweat2002-glitch/local-ai-framework` |
| Authentication model | Service-account WIF, using GitHub OIDC rather than a stored Gemini API key |

## Implementation Status

The guarded workflow now requests the GitHub OIDC permission and passes `use_vertex_ai`, Google Cloud project, region, service-account, and WIF-provider inputs from repository variables. Its regression suite passes with 31 tests. The dedicated service account has been created as `gemini-github-proposals@project-8ae8b5f7-7636-4261-a21.iam.gserviceaccount.com` and has the Vertex AI User role. The WIF pool and provider are created and the provider is restricted to `cjsweat2002-glitch/local-ai-framework`; that repository alone can impersonate the dedicated service account. The migrated workflow is committed to GitHub master at `968b578`. The four GitHub repository variables are now configured as follows:

| Variable | Configured value |
|---|---|
| `GOOGLE_CLOUD_PROJECT` | `project-8ae8b5f7-7636-4261-a21` |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` |
| `GCP_WIF_PROVIDER` | `projects/557053061711/locations/global/workloadIdentityPools/github/providers/local-ai-framework` |
| `SERVICE_ACCOUNT_EMAIL` | `gemini-github-proposals@project-8ae8b5f7-7636-4261-a21.iam.gserviceaccount.com` |

## Deferred Validation

The plan-only validation run `31668520361` reached Vertex AI with the configured GitHub OIDC identity, then stopped with Google Cloud error `BILLING_DISABLED`. It created no branch, pull request, merge, source edit, or deployment. The owner elected not to enable billing and asked that the configuration remain in place for future use. No additional Vertex requests should be made unless the owner explicitly confirms that billing has been enabled.

## Target Permissions

The workflow needs a dedicated service account with **Vertex AI User** (`roles/aiplatform.user`) for model access. GitHub's external identity must only be allowed to impersonate that account through `roles/iam.workloadIdentityUser`, constrained to `cjsweat2002-glitch/local-ai-framework`. The WIF provider must use GitHub's OIDC issuer and map the repository attribute before applying the repository restriction.

## Repository Variables

After the provider and service account are created, configure these GitHub repository variables:

| Variable | Expected value |
|---|---|
| `GOOGLE_CLOUD_PROJECT` | `project-8ae8b5f7-7636-4261-a21` |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` unless the project uses another supported Vertex region |
| `GCP_WIF_PROVIDER` | Full provider name, such as `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/local-ai-framework` |
| `SERVICE_ACCOUNT_EMAIL` | Dedicated WIF service-account email |

## Sources

The configuration follows the official [run-gemini-cli action documentation](https://github.com/google-github-actions/run-gemini-cli), which supports `use_vertex_ai` and WIF inputs, and Google Cloud's [GitHub Actions WIF guidance](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines).
