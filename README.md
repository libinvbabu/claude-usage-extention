# Claude Usage Pace

Inline pacing helper for Claude usage.

> **Claude shows how much you used. Claude Usage Pace shows whether that usage is
> healthy for right now.**

A small, **local-only** dashboard injected directly into Claude's usage settings
page (`https://claude.ai/settings/usage` and `https://claude.ai/code#settings/usage`),
right below Claude's native usage section.

It answers questions Claude's raw bars don't:

- Is this a good time to start a heavy Claude Code task?
- Am I under or over pace for the current five-hour session?
- How much session capacity is left?
- Is my weekly quota becoming the bottleneck?
- Am I likely to leave usage unused?
- Should I clear context before starting a large task?

![Panel mock](docs/panel-mock.svg)

## Features

- **Top recommendation** with careful, non-overconfident copy and a **current
  bottleneck** line (None / Current session / Weekly all-model / Weekly
  model-specific, e.g. Sonnet).
- **Current session pacing** — large "% left", live countdown, used-vs-expected
  mini bar with a linear pace marker, safe pace per hour, and "Unused if pace
  continues".
- **Weekly all-model pacing**, plus **Sonnet** pacing when visible (inherits the
  weekly reset if it has none).
- **Bottleneck detection** — surfaces the limit most likely to constrain heavy work.
- **State-based task guidance** — what's a good use of Claude right now, with
  `/clear` / `/compact` hints (toggleable).
- **Tooltips** explaining every calculated metric (Safe pace, Pace, Daily budget,
  Unused if pace continues, Current bottleneck) — keyboard accessible.
- **Re-read** button to re-parse the visible page without reloading.
- **Parser debug mode** (off by default) to spot Claude UI changes during beta.
- **Graceful error state** — a small, non-alarming note instead of a broken
  dashboard when usage can't be read; never shows `NaN`/`Infinity`.
- **Local-only** storage of compact snapshots — no tracking, no backend, no
  network calls.

## Install (load unpacked)

```bash
npm install
npm run build      # outputs ./dist
```

Then in Chrome (or any Chromium browser):

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select the **`dist/`** folder.
4. Visit `https://claude.ai/settings/usage` (or `https://claude.ai/code#settings/usage`).
   The **Claude Usage Pace** panel appears beneath the native usage section.

To change preferences: right-click the extension → **Options**, click the panel's
**Options** button, or use **Details → Extension options** on `chrome://extensions`.

## Development

```bash
npm install
npm run dev        # full build once, then rebuilds content.js on change
npm run build      # type-check + production build of dist/
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (flat config)
npm run test       # vitest unit tests
npm run icons      # regenerate public/icons/*.png
```

After `npm run dev`, reload the extension from `chrome://extensions` (and reload the
Claude tab) to pick up changes.

### Architecture

```
src/
  content/       page detection, DOM parsing, injection + lifecycle
    index.tsx          orchestrator: detect → parse → compute → inject, MutationObserver + SPA hooks
    injectPanel.ts     single shadow-DOM React root mounted after the native section
    parseClaudeUsage.ts resilient, text-first parser (no reliance on class names)
  core/          pure logic (unit-tested)
    timeWindows.ts     session/weekly windows + reset-text parsers
    workingDays.ts     working-day / working-hour math
    paceEngine.ts      status, projections, safe rates
    statusRules.ts     top recommendation, bottleneck, and task guidance
    formatters.ts      display helpers (never emit NaN/Infinity)
  storage/       chrome.storage.local wrappers
    preferences.ts     user preferences
    localHistory.ts    debounced, capped, de-duplicated snapshot history
  ui/            React components
    UsagePacePanel.tsx, RecommendationCard, LimitCard, MiniBar, MetricGrid,
    TaskGuidanceCard, InfoTip (accessible tooltip)
  options/       options page
  types/         shared types
  styles/        scoped panel/options CSS (design tokens + container queries)
```

The build is two passes (`vite.config.ts` and `vite.content.config.ts`): the options
page is a normal Vite HTML build, while the content script is built in library/IIFE
mode so it is a single self-contained `content.js` (MV3 content scripts cannot use
runtime ES module imports). The panel renders inside a **shadow root**, so its styles
are fully isolated from claude.ai and vice-versa, and it lays out responsively using
**CSS container queries** (so it reacts to the panel's own width, not the viewport).

## Privacy

Claude Usage Pace reads only visible usage percentages and reset labels from Claude's Usage settings page. It does not read Claude prompts, responses, or conversation content. It does not use a backend, analytics, or external network requests. Preferences and compact usage snapshots are stored locally in the browser.

It never stores page HTML or account identifiers, and it makes **no external network
calls** — there is no backend, no analytics, and no remote/hosted code.

Permissions requested:

- `storage` — to save your preferences and local history on this device.
- host access to `https://claude.ai/*` — to read the usage page and inject the panel.

See [`store-assets/privacy-practices.md`](store-assets/privacy-practices.md) for the
full breakdown used in the Chrome Web Store listing.

## Limitations & assumptions

Claude usage is variable. This extension does not estimate exact messages, tokens, or guaranteed remaining tasks. It provides percentage-based pacing guidance only.

- **Usage is variable.** The extension never estimates exact "messages" or "tokens"
  left. All guidance is **percentage-based** — actual capacity depends on
  conversation length, files, model, tools, and task complexity.
- **The usage page is the source of truth.** Usage happens across Claude Code,
  Desktop, and the web; this reads the page Claude shows, which already aggregates
  those.
- **Reset text drives the clock.** The weekly reset is taken from Claude's visible
  "Resets <Day> <time>" label (interpreted in your browser's local time zone). The
  session is treated as a rolling **5-hour** window derived from "Resets in X hr Y min".
- **Working-day pacing.** The weekly "daily budget" is spread across your configured
  working days (default Mon–Fri), so it reflects realistic availability.
- **Resilient, not bullet-proof parsing.** If Claude changes its layout drastically,
  the parser may find partial or no data; in that case the panel shows whatever it
  can, or a small non-blocking note on the usage page only. Enable **Show parser
  debug details** in Options to see exactly what was read.
- Chrome / Chromium, Manifest V3.

## Chrome Web Store submission notes

Listing drafts live in [`store-assets/`](store-assets/):

- [`short-description.txt`](store-assets/short-description.txt) — the one-line summary.
- [`description.md`](store-assets/description.md) — the full listing description.
- [`privacy-practices.md`](store-assets/privacy-practices.md) — the privacy disclosures
  and per-permission justification used in the data-use form.
- [`review-notes.md`](store-assets/review-notes.md) — reviewer instructions (how to test,
  privacy, permissions, limitations).
- [`screenshot-plan.md`](store-assets/screenshot-plan.md) — the five listing screenshots
  and capture hygiene checklist.

Before submitting:

1. `npm run lint && npm run test && npm run build` — all must pass; the packaged
   extension is the contents of `dist/`.
2. Confirm `manifest.json` requests only `storage` and the `https://claude.ai/*` host
   permission (no `tabs`, `activeTab`, `scripting`, broad hosts, or remote code).
3. Capture screenshots per the plan, with parser debug mode **off** and no private
   account/conversation data visible.

## Not affiliated with Anthropic

Claude Usage Pace is an independent tool and is **not affiliated with, endorsed by, or
sponsored by Anthropic**. "Claude" is a trademark of Anthropic.

## License

MIT — see source headers. Personal/educational tool; not affiliated with Anthropic.
