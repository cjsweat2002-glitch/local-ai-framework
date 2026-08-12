# Validation Notes

## OAuth

On 2026-08-12, the preview sign-in control was repaired to call the template's browser-side OAuth starter. The completed Manus sign-in flow returned successfully to the protected Autonomous AI Hub workspace, where the authenticated user controls, six branch buttons, provider selector, profile selector, and task input were visible.

## Live task validation

An approved minimal Manus validation prompt was submitted from the authenticated **Code Generation** branch. The user prompt appeared immediately, and the input changed to a working state. At the latest observation, the assistant placeholder was present but no response text had yet been returned; further task-state polling is required before declaring the live flow validated.

After adding persisted-task resume logic, a refresh exposed a maximum-update-depth error in the conversation component. The resume effect requires stabilization before another live-flow observation.

The first stabilization attempt, which memoized query inputs and skipped unchanged state updates, did not resolve the error-boundary failure after reload. Further isolation of the rendered controls is required.

Separating polling reads from persistence writes also did not clear the update-depth error, so the persisted active-task rehydration branch remains the highest-priority suspect.

The terminal-task guard resolved the browser error. The task history page correctly persisted the test submission with its Code Generation branch, Manus provider, Standard profile, failed status, timestamp, and provider error. A direct provider task-detail diagnostic confirmed that Manus returned `404 not_found` for the task ID supplied by task creation, so the current configured API access cannot retrieve that task after creation.

The authenticated workspace remains stable after the terminal Manus test. With user confirmation, Built-in Forge is now being validated as the provider-pool path for genuine server-sent token streaming.

The Built-in Forge provider was selected successfully in the authenticated Code Generation branch. The next validation step is a minimal prompt to observe token events and terminal persistence.

The approved minimal Built-in Forge prompt was submitted successfully. Its user message appeared immediately, the input switched into a working state, and the assistant message is awaiting streamed token events.

Built-in Forge returned the requested response through the live chat, where it rendered with a completed status. Task History then confirmed that the provider, Standard profile, completed state, timestamp, and final output were persisted correctly.

The authenticated workspace was reopened after the recovery update, and Built-in Forge was selected for a dedicated in-progress refresh validation.

An approximately 300-word Built-in Forge task was submitted and the authenticated workspace was reloaded immediately while the input showed a working state. The page recovered without an update-depth error and loaded the durable task result into the assistant bubble, showing the full completed response beginning with "refresh recovery validated.". A longer mid-stream reload remains needed to visibly observe post-refresh partial output before terminal completion.

Built-in Forge was selected again to run a longer response designed to keep the task in processing long enough to inspect the reloaded state.

The longer Built-in Forge task was submitted and the workspace was reloaded immediately. The reloaded page visibly restored a partial assistant response, retained the `processing` status marker and working state, and continued showing output after the reload. This conclusively demonstrates post-refresh polling and durable partial-output recovery while the task is still in progress.

Task History then showed the recovered long-running Built-in Forge task as completed with its full persisted output, alongside the earlier Forge validation tasks and the intentionally failed Manus diagnostic task.
