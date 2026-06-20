# Chrome Web Store Reviewer Notes

Claude Usage Pace has a single purpose: adding pacing insights to Claude's visible Usage settings page.

## How to test

1. Install the extension.
2. Open `https://claude.ai/code#settings/usage`.
3. The dashboard appears near Claude's native usage limits section.
4. Click Options to configure working days, working hours, compact mode, and debug mode.
5. Click Re-read to re-parse visible usage values.

## Privacy

The extension has no backend and makes no external network requests. It reads only visible usage text from Claude's settings page and stores preferences/small usage snapshots in `chrome.storage.local`.

## Permissions

- `storage` is used for preferences and local history.
- Host permission for `claude.ai` is used only to inject the dashboard and read visible usage text on Claude pages.

## Limitations

The extension does not estimate exact messages or tokens left. It provides percentage-based pacing guidance only.

## Affiliation

This extension is independent and is not affiliated with Anthropic.
