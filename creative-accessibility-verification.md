# Creative Interface Accessibility Verification

## Scope

The refreshed Workspace, Gemini Developer, System Factory, and Task History routes were reviewed after the visual refresh. Desktop and narrow mobile viewport captures were completed for all four surfaces. The browser-visible layouts retain their controls without overlaying the main work area, and the mobile branch map reduces to icon navigation while preserving native button controls.

## Keyboard and Focus Contract

| Surface | Keyboard-reachable controls | Verification evidence |
| --- | --- | --- |
| Workspace | Branch map buttons, top-level destination buttons, provider and profile controls, prompt sparks, composer, and Send action | Native buttons and selects are retained; the branch map publishes its current route through `aria-current`; the composer has an accessible branch-specific label. |
| Gemini Developer | Destination buttons, mirror form fields, private-mirror cards, removal actions, and provider-locked composer | Mirror cards are focusable, support Enter and Space activation, and expose `aria-pressed` for the selected mirror. |
| System Factory | Destination buttons, governed forms, consent control, child registry, reviewer actions, and approval controls | Existing actionable controls remain native buttons, inputs, selects, or textareas within named panels. |
| Task History | Destination buttons, horizontal archive table, and empty-state Workspace action | The route exposes a named destination navigation landmark and uses native button controls. |

## Visible Focus and Motion

The global visual system now applies a high-contrast cyan `:focus-visible` outline with an offset, so keyboard focus remains visible on the pale blueprint surfaces. Reduced-motion coverage is retained through `@media (prefers-reduced-motion: reduce)`, which disables entrance animation and the primary exploration-control transitions. Automated regression coverage in `server/creativeAccessibility.test.ts` asserts these focus, landmark, accessible-name, keyboard-handler, and reduced-motion contracts.

## Browser-Run Keyboard Audit

The headless Chromium audit in `scripts/creative-accessibility-audit.mjs` completed successfully against a temporary authenticated local session on **2026-08-13**. It uses native CDP key events rather than click simulation and records its output in `creative-accessibility-audit.json`.

| Route | Reachable controls | Tab / Shift+Tab evidence | Visible focus |
| --- | ---: | --- | --- |
| Workspace | 17 | Content Creation, then Code Generation when reversing | `3px` cyan focus outline observed |
| Task History | 3 | System Factory, then Workspace when reversing | `3px` cyan focus outline observed |
| System Factory | 15 | Task History, then Workspace when reversing | `3px` cyan focus outline observed |
| Gemini Developer | 16 | Task History, then Workspace when reversing | `3px` cyan focus outline observed |
| Design Studio | 15 | Task History, then Workspace when reversing | `3px` cyan focus outline observed |

Space activated the **Content Creation** branch and updated its `aria-current` state. Enter activated the focused **Task History** destination and routed the live application to `/task-history`. The audit does not submit prompts, write private mirrors, alter governed records, or create provider work.

The same browser-run audit also selected the **Identity Forge** engine by pressing Enter, then pressed Enter on **Open in Design & UI**. The application returned to `/`, selected the Design & UI branch, and populated the editable composer with the engine’s brief without sending a task.

## Hands-on Canvas Command Audit

The authenticated browser audit verified that the focused **Orbit field** responds to the left-arrow command by changing position, that `?` opens the shortcut settings panel, and that ordinary typing inside the project-seed field does not add a new text layer. Shortcut preferences expose an enabled state and nudge distance; normal `Tab` focus navigation remains available. The canvas hotkeys cover layer movement, bracket-based layer selection, duplication, deletion, layer creation, undo/redo, and design-spec export without automatically submitting a chat task.
