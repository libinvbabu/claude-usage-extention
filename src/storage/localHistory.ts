// Local-only usage history. Stores compact snapshots (percentages, labels,
// timestamps) — never page HTML, prompts, or account identifiers. Writes are
// debounced and de-duplicated to keep storage churn low.

import type { ClaudeLimitSnapshot, UsageHistoryEntry } from "../types/usage";
import { storageGet, storageRemove, storageSet } from "./chromeStorage";

export const HISTORY_KEY = "claudeUsagePace.history";
export const MAX_ENTRIES = 500;
const DEBOUNCE_MS = 10_000;

let pending: ClaudeLimitSnapshot[] | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export async function loadHistory(): Promise<UsageHistoryEntry[]> {
  const stored = await storageGet<UsageHistoryEntry[]>(HISTORY_KEY);
  return Array.isArray(stored) ? stored : [];
}

export async function clearHistory(): Promise<void> {
  pending = null;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  await storageRemove(HISTORY_KEY);
}

export async function getLastEntry(): Promise<UsageHistoryEntry | null> {
  const history = await loadHistory();
  return history.length ? history[history.length - 1] : null;
}

/** Stable signature of a batch, used to skip writing unchanged readings. */
function signature(snapshots: ClaudeLimitSnapshot[]): string {
  return snapshots
    .map((s) => `${s.type}:${Math.round(s.usedPct * 10)}:${s.resetLabel}`)
    .sort()
    .join("|");
}

/** Strip a snapshot down to the fields we are allowed to persist. */
function sanitize(s: ClaudeLimitSnapshot): ClaudeLimitSnapshot {
  return {
    type: s.type,
    label: s.label,
    usedPct: s.usedPct,
    remainingPct: s.remainingPct,
    resetLabel: s.resetLabel,
    resetAt: s.resetAt,
    active: s.active,
    capturedAt: s.capturedAt,
  };
}

async function flush(): Promise<void> {
  timer = null;
  const batch = pending;
  pending = null;
  if (!batch || batch.length === 0) return;

  const history = await loadHistory();
  const last = history[history.length - 1];
  if (last && signature(last.snapshots) === signature(batch)) {
    return; // identical reading — nothing meaningful changed.
  }

  history.push({
    capturedAt: batch[0]?.capturedAt ?? maxCapturedAt(batch),
    snapshots: batch.map(sanitize),
  });
  if (history.length > MAX_ENTRIES) {
    history.splice(0, history.length - MAX_ENTRIES);
  }
  await storageSet(HISTORY_KEY, history);
}

function maxCapturedAt(batch: ClaudeLimitSnapshot[]): number {
  return batch.reduce((m, s) => Math.max(m, s.capturedAt), 0);
}

/**
 * Record a batch of snapshots. Debounced: only the most recent batch within the
 * debounce window is written, and identical consecutive readings are skipped.
 */
export function recordSnapshots(snapshots: ClaudeLimitSnapshot[]): void {
  if (!snapshots.length) return;
  pending = snapshots;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void flush();
  }, DEBOUNCE_MS);
}

/** Force any pending write immediately (useful before teardown / in tests). */
export async function flushHistoryNow(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  await flush();
}

export type HistorySummary = {
  entries: number;
  sessionsObserved: number;
  avgSessionUsedPct?: number;
  last3AvgUnusedPct?: number;
  typicalUnusedPct?: number;
  higherThanUsualToday?: boolean;
  lastObservedAt?: number;
};

/** Lightweight trends over stored history. All fields optional / best-effort. */
export function summarizeHistory(history: UsageHistoryEntry[]): HistorySummary {
  const summary: HistorySummary = {
    entries: history.length,
    sessionsObserved: 0,
  };
  if (history.length === 0) return summary;

  summary.lastObservedAt = history[history.length - 1].capturedAt;

  const sessionUsed: number[] = [];
  for (const entry of history) {
    const s = entry.snapshots.find((x) => x.type === "current_session");
    if (s) sessionUsed.push(s.usedPct);
  }
  summary.sessionsObserved = sessionUsed.length;
  if (sessionUsed.length) {
    const avg = sessionUsed.reduce((a, b) => a + b, 0) / sessionUsed.length;
    summary.avgSessionUsedPct = Math.round(avg * 10) / 10;
    summary.typicalUnusedPct = Math.round((100 - avg) * 10) / 10;

    const last3 = sessionUsed.slice(-3);
    const last3Unused = last3.map((u) => 100 - u);
    summary.last3AvgUnusedPct =
      Math.round((last3Unused.reduce((a, b) => a + b, 0) / last3Unused.length) * 10) / 10;

    const latest = sessionUsed[sessionUsed.length - 1];
    summary.higherThanUsualToday = latest > avg + 10;
  }
  return summary;
}
