# Gemini Integration Notes

The official Gemini API documentation identifies `https://generativelanguage.googleapis.com` as the API host and uses the `x-goog-api-key` header for server-side API-key authentication. The current documentation recommends the Interactions API for new integrations and lists Gemini Flash-family models for low-latency generation. The existing connected Gemini integration identifies `gemini-2.5-flash` as an available model and confirms a server-side `GEMINI_API_KEY` credential.

For real-time output, the documented REST pattern is `POST /v1beta/interactions?alt=sse` with `stream: true`. Text is emitted in `step.delta` events whose delta type is `text`, enabling token-level forwarding to the existing browser chat transport. The connected key was validated against `gemini-3.6-flash` on the Interactions API; although `gemini-2.5-flash` appears in model discovery, the Interactions endpoint returned a model-unavailable error for that older identifier.

Source: https://ai.google.dev/gemini-api/docs (retrieved 2026-08-12).
