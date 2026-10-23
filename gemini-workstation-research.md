# Gemini Development Workstation Research

## Transferable Interaction Patterns

Google AI Studio’s Build documentation describes an iterative project workspace: users can begin with a natural-language brief, inspect generated files, work against a live preview, refine through an ongoing chat, and use annotation mode to describe UI-specific changes. Its guidance also describes a project-aware agent that preserves prompt and file-state context across multi-file work. These are interaction patterns, not a visual design to reproduce.

The Gemini Developer workspace will adopt the following original equivalents:

| External pattern | Original Autonomous AI Hub implementation |
| --- | --- |
| Prompt-led app iteration | A mode-aware mission composer with build, review, diagnose, and plan intents. |
| Project-aware context | A visible project-context board showing the active branch, selected mirror, code boundary, and proposal status. |
| Preview and code inspection | A read-only execution/preview signal surface that links work to the guarded proposal and Activity Pulse records. |
| Annotation-driven refinement | A UI-focused change brief that can be carried into a Gemini Developer request without exposing site credentials. |
| Runtime settings and tools | Explicit, safe controls for response goal, source of context, and review depth; no client-side secret or arbitrary tool execution control. |

## Security Boundary

AI Studio’s Build documentation states that Gemini keys are server-side secrets and that apps can be exported to GitHub for external development. The existing Autonomous AI Hub must keep its Manus OAuth, Forge, database, owner, and deployment credentials in the hosting environment. The enhanced Gemini workspace will therefore provide project context and proposal controls, but never surface or request those secret values.

## Sources

1. Google AI, [Build apps in Google AI Studio](https://ai.google.dev/gemini-api/docs/aistudio-build-mode), accessed 2026-08-14.
2. Google AI, [Google AI Studio quickstart](https://ai.google.dev/gemini-api/docs/ai-studio-quickstart), accessed 2026-08-14.
3. Google AI, [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), accessed 2026-08-14.
