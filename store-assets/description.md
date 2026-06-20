Claude Usage Pace adds a small, local-only dashboard to Claude's Usage settings page.

Claude shows how much you used. Claude Usage Pace shows whether that usage is healthy for right now.

It helps you understand:
- Current five-hour session headroom
- Weekly all-model usage pace
- Model-specific weekly limits when visible (e.g. Sonnet)
- Whether you are under pace, on track, or at risk
- Which limit is the current bottleneck for heavy work
- How much capacity may go unused if your pace continues
- Whether it is a good time to start a larger Claude Code task

The extension reads only the usage text already visible on Claude's settings page. It has no backend, does not track you, and does not send usage data anywhere. Everything is computed and stored in your browser.

What it is not:
Claude usage is variable and depends on model, context length, files, features, and task complexity. This extension does not estimate exact messages or tokens left. It provides percentage-based pacing guidance only, and degrades gracefully if Claude's usage page changes.

Permissions:
- storage — saves your preferences and a small local usage history on this device.
- access to https://claude.ai — reads the visible usage text and injects the dashboard on Claude's pages.
