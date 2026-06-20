// Working-day / working-hour math used for weekly pacing. Weekly limits are
// best paced against the days you actually work, not raw calendar days.

import { clamp, HOUR_MS } from "./timeWindows";

/** Minutes since local midnight for a "HH:MM" string. Defaults safely. */
export function parseTimeOfDay(value: string, fallbackMinutes: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? "");
  if (!m) return fallbackMinutes;
  const h = clamp(parseInt(m[1], 10), 0, 23);
  const min = clamp(parseInt(m[2], 10), 0, 59);
  return h * 60 + min;
}

/**
 * Count the number of working-day calendar dates in [fromMs, toMs), including
 * the day containing `fromMs`. A "working day" is one whose day-of-week is in
 * `workingDays` (0 = Sunday … 6 = Saturday).
 */
export function remainingWorkingDays(
  workingDays: number[],
  fromMs: number,
  toMs: number,
): number {
  if (toMs <= fromMs) return 0;
  const set = new Set(workingDays);
  let count = 0;
  const cursor = new Date(fromMs);
  cursor.setHours(0, 0, 0, 0);
  // Hard cap the loop; a weekly window is never more than ~8 days.
  for (let i = 0; i < 366 && cursor.getTime() < toMs; i++) {
    if (set.has(cursor.getDay())) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Approximate the number of working hours remaining until `toMs`, given the
 * configured working-hours window. Today is counted as a partial day (only the
 * hours still ahead within the working window); subsequent working days count
 * as full working-hour blocks.
 */
export function remainingWorkingHours(
  workingDays: number[],
  startMinutes: number,
  endMinutes: number,
  fromMs: number,
  toMs: number,
): number {
  if (toMs <= fromMs) return 0;
  const set = new Set(workingDays);
  const dayLengthMin = Math.max(endMinutes - startMinutes, 0);
  let minutes = 0;

  // Guard against degenerate working-hour config.
  if (dayLengthMin === 0) return 0;

  const cursor = new Date(fromMs);
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 366 && cursor.getTime() < toMs; i++) {
    if (set.has(cursor.getDay())) {
      const dayStart = cursor.getTime() + startMinutes * 60 * 1000;
      const dayEnd = cursor.getTime() + endMinutes * 60 * 1000;
      // Intersect the working block [dayStart, dayEnd) with [fromMs, toMs).
      const lo = Math.max(dayStart, fromMs);
      const hi = Math.min(dayEnd, toMs);
      if (hi > lo) minutes += (hi - lo) / (60 * 1000);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return minutes / 60;
}

/** Hours represented by one working-hour block. */
export function workdayLengthHours(startMinutes: number, endMinutes: number): number {
  return Math.max(endMinutes - startMinutes, 0) / 60;
}

export { HOUR_MS };
