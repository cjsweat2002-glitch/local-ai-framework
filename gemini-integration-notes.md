# Gemini Integration Notes

The official Gemini API documentation identifies `https://generativelanguage.googleapis.com` as the API host and uses the `x-goog-api-key` header for server-side API-key authentication. The current documentation recommends the Interactions API for new integrations and lists Gemini Flash-family models for low-latency generation. The existing connected Gemini integration identifies `gemini-2.5-flash` as an available model and confirms a server-side `GEMINI_API_KEY` credential.

For real-time output, the documented REST pattern is `POST /v1beta/interactions?alt=sse` with `stream: true`. Text is emitted in `step.delta` events whose delta type is `text`, enabling token-level forwarding to the existing browser chat transport. The connected key was validated against `gemini-3.6-flash` on the Interactions API; although `gemini-2.5-flash` appears in model discovery, the Interactions endpoint returned a model-unavailable error for that older identifier.

Source: https://ai.google.dev/gemini-api/docs (retrieved 2026-08-12).

## Dedicated developer workspace and synchronization boundary

The Gemini API supports server-side model interactions, SSE streaming, file utilities, and Python-only code execution. It can therefore power a first-class in-app Gemini workspace for direct code generation, design specifications, debugging, and web-development prompts. The existing `GEMINI_API_KEY` remains server-side; it must not be exposed in the browser. Source: https://ai.google.dev/api and https://ai.google.dev/gemini-api/docs/code-execution (retrieved 2026-08-12).

Consumer Gemini Gems are reusable custom experts in the Gemini application, but the Google AI Developers Forum states that the Gemini app does not expose an API or API access to Gems. The supported in-app alternative is a user-owned, versioned "Gem blueprint": store the Gem's instructions, files/context references, and preferred model settings in Autonomous AI Hub and apply them as a server-side system instruction to the Gemini API. Source: https://gemini.google/overview/gems/ and https://discuss.ai.google.dev/t/accessing-gemini-gems-through-api/40534 (retrieved 2026-08-12).

Google's supported programmatic notebook management applies to Gemini Notebook Enterprise, is currently Preview, and requires a licensed Google Cloud project plus Google authorization/IAM. It can create, retrieve, list, share, and delete enterprise notebooks. Connecting it requires the user's Google Cloud project number, location, and an OAuth or service-account access model with the relevant IAM role. Source: https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks (retrieved 2026-08-12).
