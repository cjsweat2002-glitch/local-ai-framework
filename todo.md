# Autonomous AI Hub - Implementation Checklist

## Database & Schema
- [x] Create conversations table (id, userId, branch, createdAt, updatedAt)
- [x] Create messages table (id, conversationId, role, content, createdAt)
- [x] Create tasks table (id, userId, conversationId, branch, agentProfile, provider, status, manusTaskId, output, createdAt, completedAt)
- [x] Define agent profile constants (Standard, Lite, Max)
- [x] Define fixed branch constants (Code Generation, Content Creation, Data Analysis, Automation, Design & UI, Research)
- [x] Define task status constants (queued, processing, completed, failed)

## Backend - tRPC Procedures
- [x] Implement conversation.getOrCreate procedure
- [x] Implement conversation.list procedure (per user, per branch)
- [x] Implement conversation.getWithMessages procedure with full message history
- [x] Implement message.add and message.update procedures
- [x] Implement task.submit procedure (routes through provider pool with branch context + history)
- [x] Implement task.poll procedure (for real-time status updates)
- [x] Implement task.list procedure (task history page)
- [x] Implement authenticated server-sent-event task streaming for Built-in Forge
- [x] Set up Manus API v2 client with task.create, task.sendMessage, and task.listMessages endpoints

## Frontend - Core UI Components
- [x] Create ConversationChat component with message bubbles (user/assistant styling)
- [x] Create BranchSidebar component with fixed six branches
- [x] Create in-branch agent profile selector (Standard, Lite, Max)
- [x] Add inline task status indicators (queued, processing, completed, failed)
- [x] Add message input with send button and keyboard shortcut
- [x] Implement real-time streaming into chat bubbles (token-by-token) through Built-in Forge SSE
- [x] Clarify Manus as event-polled transport and set Built-in Forge as the default provider for genuine token-level SSE streaming.
- [x] Update the supplied Manus credential securely and rerun direct create-to-event-retrieval validation with Manus Lite.
- [x] Confirm a fresh Manus Lite task visibly renders completed output in chat and Task History.

## Frontend - Pages
- [x] Update Home.tsx with main chat interface (sidebar + chat area)
- [x] Create TaskHistory.tsx page listing all past submissions
- [x] Create navigation/routing between Home and TaskHistory

## Frontend - Real-time & State Management
- [x] Implement polling for real-time task updates
- [x] Set up conversation state management (current branch, provider, and message history)
- [x] Implement immediate local message updates for message submission
- [x] Handle polled Manus output with incremental DOM updates

## Styling & Design
- [x] Apply mathematical blueprint aesthetic (white grid background, geometric shapes)
- [x] Implement cyan and pink wireframe accents
- [x] Set up typography (bold sans-serif headlines, monospaced technical labels)
- [x] Ensure responsive design across devices
- [x] Add subtle animations for message appearance and status transitions

## Authentication & Security
- [x] Verify Manus OAuth integration end-to-end in the preview session
- [x] Complete user isolation for conversation history, message writes, task writes, and polling
- [x] Protect conversation, message, and task procedures with protectedProcedure

## Testing & Deployment
- [x] Write Vitest tests for auth and provider orchestration
- [x] Validate Manus API authentication with the configured server-side key
- [x] Verify Built-in Forge streaming works end-to-end
- [x] Create checkpoint before first deployment
- [x] Deploy to permanent URL: https://autonomaai-btpk72xz.manus.space
- [x] Synchronize the validated project source and deployment architecture diagram to cjsweat2002-glitch/local-ai-framework through pull request #4.
- [x] Merge GitHub pull request #4 into master and verify the live deployment remains current.

## Completed
- [x] Project initialized with web-db-user scaffold

## Remaining integration work
- [x] Add provider pool selection and provider-aware task routing beyond Manus
- [x] Persist provider identity with each task
- [x] Replace polling-only output reveal with an explicit Built-in Forge SSE transport
- [x] Verify contrast and responsive layouts after the CSS repair
- [x] Mark completed implementation items and save the first project checkpoint
- [x] Configure a server-side Gemini API credential without exposing it to the browser.
- [x] Add Google Gemini to the persisted provider model, provider selector, and task routing.
- [x] Implement Gemini response streaming with durable chat and Task History persistence.
- [x] Validate Gemini success, error, and ownership paths with Vitest and an authenticated browser flow.
- [x] Publish the Gemini-enabled production release and synchronize the source to GitHub (master commit 4d98d32).
- [x] Define a governed parent–child provider architecture with explicit purpose, capability, market-positioning, and human-approval boundaries.
- [x] Add versioned tensor-exchange records that separate parent and child workspaces while preserving lineage and update history.
- [x] Build a personal-development child workspace with symbolic language, interface model, capability relationships, and provider market-signal records.
- [x] Implement integrity watchers that assess progress, identify meaningful deltas, and emit bounded proposals rather than autonomous actions.
- [x] Enforce watcher consent, cooldown, and meaningful-signal thresholds for exchanges, signals, and review proposals.
- [x] Re-run post-safeguard parent approval validation: proposal approval updates the child, writes an approval exchange, and records the full audit sequence without violating cooldown policy.
- [x] Save and publish the governed System Factory safeguards in the permanent production release (checkpoint b105c747).
- [x] Verify the canonical production System Factory route serves the published release without cache-busting.
- [x] Validate the authenticated owner production workspace: consent control, review gating, cooldown response, and audit history.
- [x] Validate the production consent-gating cycle: disable watcher consent, confirm review is blocked, then re-enable consent and confirm review availability without creating a new proposal.
- [x] Confirm production release parity: the published checkpoint 447c9e85 contains the verified safeguard implementation and GitHub master 44bddd7 contains the matching source plus final verification records.
- [x] Save the final parity checklist state, synchronize it to GitHub master, and recheck the canonical production System Factory route (checkpoint 12605458; master 670f779).
- [x] Synchronize the governed System Factory safeguards to GitHub master and confirm the pushed source matches the release (master a4fa933).
- [x] Apply the user-approved watcher proposal for Interface Differentiation Child and verify its human-approved lineage records.
- [x] Add a dedicated Gemini development branch with direct code-generation and web-development interaction in the workspace.
- [x] Assess and implement the supported secure connection workflow for the user’s Gemini notebooks and Gems.
- [x] Validate, publish, and synchronize the Gemini developer workspace release (checkpoint c5fbb2fe; GitHub master e75ac44).
- [x] Provide a consumer Gemini notebook and Gem mirror workflow that preserves user-controlled instructions and content without unsupported direct API synchronization.
- [x] Validate Gemini Developer streaming and persistence with a real in-workspace code or web-development request.
- [x] Validate the browser mirror flow: save a user-controlled mirror, select it, and confirm it is used as Gemini Developer context.
- [x] Add regression coverage for the Gemini Developer conversation branch and mirror-backed context contract.
- [x] Reopen or inspect Task History for the successful Gemini Developer request to confirm the completed stream is persisted.
- [x] Run a distinctive mirror-only browser validation and verify that the Gemini response reflects the selected private mirror instruction.
- [x] Verify the successful Gemini Developer task in the browser Task History page with its branch, Google Gemini provider label, completed status, and output preview.
- [x] Assess supported ways for the consumer Gemini app to access and edit the Autonomous AI Hub source and deployment.
- [x] Add a secure Gemini-to-GitHub website-editing handoff workflow with review and deployment safeguards.
- [ ] Validate, publish, and synchronize the Gemini app editing workflow release.
- [x] Select the approved edit-capable GitHub workflow for Gemini-assisted website changes.
- [x] Add the supplied Gemini credential as the repository’s encrypted GitHub Actions secret.
- [x] Add a guarded Gemini CLI workflow that responds only to Gemini requests in issues and pull requests and never deploys directly.
- [x] Extend the guarded Gemini workflow to support owner-approved requests in pull-request comments as well as issues, then validate both trigger paths.
- [ ] Verify the guarded Gemini workflow end-to-end from one issue comment and one pull-request comment, confirming plan-first behavior and no deployment action.
- [ ] Replace the invalid `GEMINI_API` GitHub Actions secret with a valid Google AI Studio Gemini API key and re-run the non-destructive planning validation.
- [x] Replace the rejected consumer-key workflow authentication with Google Cloud Vertex identity authentication.
- [x] Configure Google Cloud Workload Identity Federation for the repository and grant the guarded Gemini workflow least-privilege Vertex access.
- [x] Preserve the guarded Vertex configuration inactive after the billing-gated validation, pending the owner's future decision to enable billing.

## Security and verification follow-ups
- [x] Add ownership checks to message.add and task.submit so users cannot write to another user's conversation.
- [x] Add an authenticated access test or complete a browser-based OAuth verification flow.
- [x] Repair the Sign In with Manus route, which previously returned a page-not-found response in the preview.
- [x] Fix database insert ID extraction so newly added chat messages have unique React keys.
- [x] Verify polling resumes after a page refresh while a task remains processing; browser validation showed post-refresh partial output and a processing status marker.
- [x] Stabilize and verify in-flight task rehydration without a maximum-update-depth error (validated with Built-in Forge).
- [x] Replace the raw Manus task-not-found response with actionable provider guidance.
