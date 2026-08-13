import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('guarded Gemini GitHub workflow', () => {
  it('requires an owner approval before granting write permissions to a code-change run', () => {
    const workflow = readProjectFile('.github/workflows/gemini-edit-proposals.yml');

    expect(workflow).toContain('issue_comment:');
    expect(workflow).toContain("startsWith(github.event.comment.body, '@gemini-cli /approve')");
    expect(workflow).toContain("github.event.comment.author_association == 'OWNER'");
    expect(workflow).toContain('contents: write');
  });

  it('uses repository-scoped Vertex WIF variables and supports owner requests from issues and pull requests', () => {
    const workflow = readProjectFile('.github/workflows/gemini-edit-proposals.yml');

    expect(workflow).toContain("use_vertex_ai: 'true'");
    expect(workflow).toContain('gcp_project_id: ${{ vars.GOOGLE_CLOUD_PROJECT }}');
    expect(workflow).toContain('gcp_location: ${{ vars.GOOGLE_CLOUD_LOCATION }}');
    expect(workflow).toContain('gcp_service_account: ${{ vars.SERVICE_ACCOUNT_EMAIL }}');
    expect(workflow).toContain('gcp_workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}');
    expect(workflow).toContain('id-token: write');
    expect(workflow).not.toContain('gemini_api_key:');
    expect(workflow).not.toContain('secrets.GEMINI_API');
    expect(workflow).toContain("startsWith(github.event.comment.body, '@gemini-cli')");
    expect(workflow).toContain('github_pr_number: ${{ github.event.issue.pull_request && github.event.issue.number || \'\' }}');
    expect(workflow).toContain('pull_request_read');
    expect(workflow).not.toContain('github.event.issue.pull_request == null');
  });

  it('requires branch-and-pull-request isolation with no direct production action', () => {
    const instructions = readProjectFile('GEMINI.md');

    expect(instructions).toContain('Never write directly to `master`');
    expect(instructions).toContain('open a pull request targeting `master`');
    expect(instructions).toContain('publish a deployment');
  });
});
