// Content-script entry point. Detects the Claude usage settings page, parses
// the visible usage text, computes pacing insights, and keeps an injected
// dashboard in sync across SPA navigation and DOM mutations.

import type { UserPreferences } from "../types/usage";
import { computeInsights } from "../core/paceEngine";
import { buildTips, selectTopRecommendation } from "../core/statusRules";
import { parseUsagePage } from "./parseClaudeUsage";
import { loadPreferences, onPreferencesChanged } from "../storage/preferences";
import { recordSnapshots } from "../storage/localHistory";
import { PANEL_HOST_ID, removePanel, renderPanel } from "./injectPanel";

const LOCATION_EVENT = "cup:locationchange";
const REFRESH_DEBOUNCE_MS = 300;
const PERIODIC_REFRESH_MS = 60_000;

let cachedPrefs: UserPreferences | null = null;

// --- Page detection ------------------------------------------------------

function isUsageUrl(): boolean {
  if (!location.hostname.includes("claude.ai")) return false;
  const target = `${location.pathname}${location.hash}`.toLowerCase();
  return target.includes("settings/usage");
}

function pageHasUsageText(): boolean {
  const body = document.body;
  if (!body) return false;
  // innerText does not pierce our shadow root, so this won't echo our own UI.
  const text = body.innerText || "";
  return /your usage limits|weekly limits|current session/i.test(text);
}

function isUsagePage(): boolean {
  return isUsageUrl() || pageHasUsageText();
}

// --- Locating the native usage section -----------------------------------

function elementForText(re: RegExp): HTMLElement | null {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    if (re.test(node.textContent ?? "")) {
      return node.parentElement;
    }
    node = walker.nextNode();
  }
  return null;
}

/** Climb until the subtree contains both the session and a weekly marker. */
function climbToCard(el: HTMLElement): HTMLElement {
  let cur: HTMLElement = el;
  for (let i = 0; i < 8 && cur.parentElement; i++) {
    const t = cur.textContent ?? "";
    if (/current session/i.test(t) && /(all models|weekly limits|sonnet)/i.test(t)) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return cur;
}

/** Best container holding the native usage section, or null. */
function findUsageContainer(): HTMLElement | null {
  const session = elementForText(/current session/i);
  if (session) return climbToCard(session);
  const alt = elementForText(/your usage limits|weekly limits/i);
  return alt ? climbToCard(alt) : null;
}

// --- Options ---------------------------------------------------------------

function openOptions(): void {
  try {
    const runtime = (typeof chrome !== "undefined" ? chrome.runtime : undefined) as
      | (typeof chrome.runtime & { openOptionsPage?: () => void })
      | undefined;
    if (runtime?.openOptionsPage) {
      runtime.openOptionsPage();
      return;
    }
    const url = runtime?.getURL?.("options.html");
    if (url) window.open(url, "_blank", "noopener");
  } catch {
    /* ignore — options are also reachable from chrome://extensions */
  }
}

// --- Core refresh ----------------------------------------------------------

async function refresh(): Promise<void> {
  if (!isUsagePage()) {
    removePanel();
    return;
  }

  if (!cachedPrefs) cachedPrefs = await loadPreferences();
  const prefs = cachedPrefs;

  const container = findUsageContainer();
  const parseRoot = container ?? document.body;
  const snapshots = parseUsagePage(parseRoot);

  if (snapshots.length === 0) {
    // Only surface a "not found" card when the URL clearly says usage; on other
    // Claude pages we stay invisible.
    if (isUsageUrl()) {
      renderPanel(
        {
          insights: [],
          recommendation: selectTopRecommendation([]),
          tips: [],
          compact: prefs.compactMode,
          onOpenOptions: openOptions,
        },
        container,
      );
    } else {
      removePanel();
    }
    return;
  }

  recordSnapshots(snapshots);

  const insights = computeInsights(snapshots, prefs);
  const recommendation = selectTopRecommendation(insights);
  const tips = buildTips(insights, prefs);

  renderPanel(
    {
      insights,
      recommendation,
      tips,
      compact: prefs.compactMode,
      lastObservedAt: Date.now(),
      onOpenOptions: openOptions,
    },
    container,
  );
}

// --- Scheduling ------------------------------------------------------------

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn();
    }, ms);
  };
}

const scheduleRefresh = debounce(() => {
  void refresh();
}, REFRESH_DEBOUNCE_MS);

function watchMutations(): void {
  const observer = new MutationObserver((mutations) => {
    const host = document.getElementById(PANEL_HOST_ID);
    if (host) {
      // Ignore churn that is entirely inside our own panel.
      const allInside = mutations.every((m) => host.contains(m.target));
      if (allInside) return;
    }
    scheduleRefresh();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function hookSpaNavigation(): void {
  for (const type of ["pushState", "replaceState"] as const) {
    const original = history[type];
    history[type] = function (
      this: History,
      ...args: Parameters<History[typeof type]>
    ) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event(LOCATION_EVENT));
      return result;
    } as History[typeof type];
  }
  window.addEventListener("popstate", scheduleRefresh);
  window.addEventListener("hashchange", scheduleRefresh);
  window.addEventListener(LOCATION_EVENT, scheduleRefresh);
}

function start(): void {
  // Only run in the top frame to avoid duplicate panels inside iframes.
  if (window.top !== window.self) return;

  hookSpaNavigation();
  watchMutations();
  onPreferencesChanged((prefs) => {
    cachedPrefs = prefs;
    scheduleRefresh();
  });
  // Keep the countdown / projections fresh even without DOM changes.
  setInterval(() => {
    if (isUsagePage()) void refresh();
  }, PERIODIC_REFRESH_MS);

  void refresh();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
