# Privacy practices — Claude Usage Pace

Claude Usage Pace is local-only.

## Single purpose

Adds usage pacing insights to Claude's visible Usage settings page.

## Data accessed

- Visible usage percentages and reset labels from Claude's Usage settings page
- Extension preferences such as working days, working hours, compact mode, and debug mode
- An optional, compact local history of usage percentages and timestamps

## Data NOT collected

- Claude prompts
- Claude responses
- Conversation contents
- Account identifiers
- Personal information
- Analytics events
- Browsing history outside claude.ai
- Page HTML

## Data sharing

- No data is sold
- No data is transferred to third parties
- No data is used for advertising
- No data leaves the user's browser

## Permissions justification

- `storage` — saves local preferences and a compact local history. Nothing is synced or uploaded.
- host access to `https://claude.ai/*` — reads the visible usage text and injects the pacing dashboard on Claude pages. This host permission is required for the extension's single purpose.

## Remote code

No remote code is used. The content script and options page are fully bundled in the package; there are no external scripts, no `fetch`/XHR/WebSocket calls, and no network requests of any kind.
