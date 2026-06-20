# Reviewer notes — Claude Usage Pace

Claude Usage Pace has a single purpose: adding pacing insights to Claude's visible Usage settings page.

## How to test

1. Install the extension (load unpacked from `dist/`, or from the packaged build).
2. Open https://claude.ai/settings/usage (or https://claude.ai/code#settings/usage).
3. The dashboard appears directly beneath Claude's native usage limits section.
4. Click **Options** to configure working days, working hours, compact mode, Claude Code tips, and parser debug mode.
5. Click **Re-read** to re-parse the visible usage values without reloading the page.

## Privacy

The extension has no backend and makes no external network requests. It reads only the visible usage text from Claude's settings page and stores preferences and small usage snapshots in `chrome.storage.local`. It never stores page HTML, prompts, responses, or account identifiers.

## Permissions

- `storage` — preferences and a compact local history.
- host permission for `https://claude.ai/*` — used only to inject the dashboard and read the visible usage text on Claude pages. This is the minimum host access needed for the stated single purpose.

No other permissions are requested. There is no remote/hosted code.

## Limitations (intentional)

The extension does not estimate exact messages or tokens left. It provides percentage-based pacing guidance only, derived from the percentages Claude already shows. If Claude changes its usage page, the panel degrades gracefully (it shows whatever it can parse, or a small non-blocking "couldn't read usage yet" note on the usage page only).

## Graceful degradation

The parser is text-first and does not rely on Claude's CSS class names. If a section is missing, the panel shows partial data rather than incorrect or empty (NaN) values.
