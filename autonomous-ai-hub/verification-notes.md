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

After securely updating the Manus credential, a direct create-to-event-retrieval validation succeeded: task creation and `task.listMessages` both returned HTTP 200 with a valid event payload. The application runtime was restarted, and a minimal Manus task was then submitted through the authenticated workspace to verify browser-level polling.

The first browser task still returned the previous task-retrieval guidance. Investigation established that the live server did not receive `MANUS_API_KEY` because the runtime environment contract had not declared it. The contract was corrected, the server was restarted, and the live process then confirmed a non-empty Manus credential before repeating the browser validation.

After the live credential correction, direct validation found profile-specific behavior in the Manus API: `manus-1.6-lite` supports create-to-event retrieval, while `manus-1.6` and the omitted default profile returned `task not found` throughout a 15-second retrieval window. The API also confirmed that the only accepted profile identifiers are `manus-1.6`, `manus-1.6-lite`, and `manus-1.6-max`. The next validation focuses on the known API-compatible Lite profile.

The authenticated browser session selected the Lite profile and submitted a minimal Manus task. The UI entered the working state, and the next observation will confirm whether its polled events are rendered through the chat interface.

The Manus Lite browser task entered the working state. A fresh short-branch validation remains required to capture the assistant output and completed state in both the chat and Task History. The chat now initially selects Lite because it is the profile verified to expose retrievable events for this credential. Built-in Forge remains the provider offering genuine token-level SSE; the Manus integration remains event-polled.

The empty Content Creation branch was opened with Manus and Lite selected. A minimal task was submitted successfully, displaying the user message and working state; this isolated run is being used to capture the final visible completion evidence.

The isolated Manus Lite task rendered `Lite event flow validated.` in the assistant bubble with a completed status. Task History then confirmed the persisted record as Content Creation / Manus / Lite / completed with the same output. This completes browser-level Manus Lite event-polling validation.

A fresh authenticated workspace load now displays Built-in Forge as the default provider and Lite as the initial agent profile. This makes the verified token-level SSE provider the default path while keeping Manus Lite available for validated event-polled task execution.

After GitHub PR #4 was merged into `master`, the permanent production domain was rechecked. Its live client bundle includes the `built-in-forge` default-provider state, confirming the hosted deployment is serving the current published release configuration.

The Gemini integration was added with a server-only credential and Gemini appeared as a selectable provider in the authenticated workspace. Google Gemini was selected for a short end-to-end streaming validation.

The initial chat request correctly reached the Gemini stream route but received a model-unavailable response for `gemini-2.5-flash` on the Interactions API. Model discovery plus a direct authenticated API probe identified `gemini-3.6-flash` as the working Interactions model, and the route was updated before repeating browser validation.

After an explicit runtime restart, the chat displayed the corrected response `Gemini streaming validated.` for the live validation prompt. Task History confirmation is the final check for persisted Google Gemini provider metadata.

Task History showed that an earlier exact-response task was persisted as Built-in Forge after a development-state reset, so a new clean validation was started by reopening the workspace and explicitly selecting Google Gemini immediately before submission.

The fresh explicitly selected Gemini task returned `Gemini provider persistence validated 2026.` in the assistant bubble with a completed status after the `gemini-3.6-flash` correction. Task History is being checked next to confirm the persisted provider label.

Task History confirmed the fresh completed task as Code Generation / Google Gemini / Lite / completed with the exact persisted output. Raw database verification independently returned `provider = google-gemini`, and the Task History provider-label fallback was corrected with a regression test so future Gemini rows do not display as Manus.

Gemini ownership coverage now verifies that an unauthorized user cannot create a Google Gemini task for another user’s conversation or retrieve another user’s persisted Gemini task output. The polling router retains the detailed retrieval guidance only for Manus, preserving generic access-denied errors for other providers.
