# Creative Workspace Interaction Research

## Scope

This record captures the interaction patterns studied from Adobe Photoshop and Adobe InDesign. The implementation should use the patterns as functional inspiration only; it must not copy Adobe layouts, styling, names, or visual assets.

## Transferable Patterns

| Source | Documented pattern | Original application direction |
| --- | --- | --- |
| Photoshop workspace overview | A document-centered workspace, related tool groups, grouped/stacked panels, an options bar that reflects the selected tool, and in-app notifications. | Keep the Design Studio canvas central; provide a selection-aware control strip, optional inspector groups, and a separate Activity Pulse surface. |
| InDesign workspace basics | Custom workspaces; grouped/docked panels; selection-sensitive controls; screen modes; status information; guides/grids; and panel behavior preferences. | Offer named workspace modes, collapsible option groups, clear canvas/preview states, and persistent activity/status feedback without imitating the source interface. |

## Activity Pulse Design Boundary

The no-cost implementation stores owner-isolated activity records in the application database and refreshes them while the Activity Pulse page is open. It provides visible browser-side pings for newly observed records, but does **not** claim to run a free always-on background worker after the page is closed.

## Sources

1. Adobe Help Center, [Workspace overview — Photoshop](https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/workspace-overview.html).
2. Adobe Help Center, [Workspace basics — InDesign](https://helpx.adobe.com/ca/indesign/using/workspace-basics.html).
3. Adobe Help Center, [Create and manage workspaces — InDesign](https://helpx.adobe.com/indesign/desktop/get-started/settings-and-preferences/create-and-manage-workspaces.html).
