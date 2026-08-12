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
- [ ] Confirm genuine token-level streaming from Manus task events; the currently configured API key cannot retrieve API-created tasks.

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
- [ ] Deploy to permanent URL
- [ ] Synchronize the validated project source and deployment architecture diagram to cjsweat2002-glitch/local-ai-framework

## Completed
- [x] Project initialized with web-db-user scaffold

## Remaining integration work
- [x] Add provider pool selection and provider-aware task routing beyond Manus
- [x] Persist provider identity with each task
- [x] Replace polling-only output reveal with an explicit Built-in Forge SSE transport
- [x] Verify contrast and responsive layouts after the CSS repair
- [x] Mark completed implementation items and save the first project checkpoint

## Security and verification follow-ups
- [x] Add ownership checks to message.add and task.submit so users cannot write to another user's conversation.
- [x] Add an authenticated access test or complete a browser-based OAuth verification flow.
- [x] Repair the Sign In with Manus route, which previously returned a page-not-found response in the preview.
- [x] Fix database insert ID extraction so newly added chat messages have unique React keys.
- [x] Verify polling resumes after a page refresh while a task remains processing; browser validation showed post-refresh partial output and a processing status marker.
- [x] Stabilize and verify in-flight task rehydration without a maximum-update-depth error (validated with Built-in Forge).
- [x] Replace the raw Manus task-not-found response with actionable provider guidance.
