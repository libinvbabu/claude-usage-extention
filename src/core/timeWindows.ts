// Time-window math for Claude's rolling 5-hour session and 7-day weekly windows,
// plus parsers that turn Claude's visible reset text into absolute timestamps.
//
// All "next occurrence" math uses the browser's local time zone, which matches
// how Claude renders reset labels (e.g. "Resets Wed 3:29 AM" is local time).

export const HOUR_MS = 60 * 60 * 1000;
export const SESSION_LENGTH_MS = 5 * HOUR_MS;
export const WEEKLY_LENGTH_MS = 7 * 24 * HOUR_MS;

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// --- Reset-text parsing --------------------------------------------------

// "9% used" / "12.5% used"
export const percentRegex = /(\d+(?:\.\d+)?)\s*%\s*used/i;
// "Resets in 3 hr 31 min" / "Resets in 31 min" / "Resets in 2 hr"
export const resetInRegex = /resets\s+in\s+(?:(\d+)\s*hr)?\s*(?:(\d+)\s*min)?/i;
// "Resets Wed 3:29 AM"
export const weeklyResetRegex =
  /resets\s+(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s+(\d{1,2}):(\d{2})\s*(am|pm)/i;

const DAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * Parse a "Resets in X hr Y min" string into milliseconds remaining.
 * Returns null when neither hours nor minutes can be found.
 */
export function parseResetIn(text: string): number | null {
  const m = text.match(resetInRegex);
  if (!m) return null;
  const hours = m[1] ? parseInt(m[1], 10) : 0;
  const mins = m[2] ? parseInt(m[2], 10) : 0;
  if (!m[1] && !m[2]) return null;
  return (hours * 60 + mins) * 60 * 1000;
}

/**
 * Parse a "Resets <Day> <h>:<mm> <AM|PM>" weekly reset label into the absolute
 * epoch-ms of the next occurrence at or after `now` (local time zone).
 */
export function parseWeeklyReset(text: string, now: number = Date.now()): number | null {
  const m = text.match(weeklyResetRegex);
  if (!m) return null;
  const targetDow = DAY_INDEX[m[1].toLowerCase().slice(0, 3)];
  if (targetDow === undefined) return null;

  let hour = parseInt(m[2], 10) % 12;
  if (/pm/i.test(m[4])) hour += 12;
  const minute = parseInt(m[3], 10);

  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  const dayDiff = (targetDow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + dayDiff);
  if (d.getTime() <= now) {
    d.setDate(d.getDate() + 7);
  }
  return d.getTime();
}

// --- Window computation --------------------------------------------------

export type TimeWindow = {
  startAt: number;
  resetAt: number;
  elapsedMs: number;
  remainingMs: number;
  /** Percentage of the window that has elapsed, clamped to 0–100. */
  elapsedPct: number;
  lengthMs: number;
};

function computeWindow(resetAt: number, lengthMs: number, now: number): TimeWindow {
  const startAt = resetAt - lengthMs;
  const elapsedMs = clamp(now - startAt, 0, lengthMs);
  const remainingMs = clamp(resetAt - now, 0, lengthMs);
  const elapsedPct = clamp((elapsedMs / lengthMs) * 100, 0, 100);
  return { startAt, resetAt, elapsedMs, remainingMs, elapsedPct, lengthMs };
}

/** Compute the rolling 5-hour session window from its reset time. */
export function computeSessionWindow(resetAt: number, now: number = Date.now()): TimeWindow {
  return computeWindow(resetAt, SESSION_LENGTH_MS, now);
}

/** Compute the 7-day weekly window from its reset time. */
export function computeWeeklyWindow(resetAt: number, now: number = Date.now()): TimeWindow {
  return computeWindow(resetAt, WEEKLY_LENGTH_MS, now);
}
