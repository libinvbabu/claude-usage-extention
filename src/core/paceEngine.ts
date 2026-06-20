// Pace engine: turns raw usage snapshots into pacing insights (status,
// projections and safe spend rates). Pure functions — easy to unit test.

import type {
  ClaudeLimitSnapshot,
  ClaudePaceInsight,
  PaceStatus,
  UserPreferences,
} from "../types/usage";
import {
  clamp,
  computeSessionWindow,
  computeWeeklyWindow,
  HOUR_MS,
  SESSION_LENGTH_MS,
} from "./timeWindows";
import { parseTimeOfDay, remainingWorkingDays } from "./workingDays";
import { recommendForInsight } from "./statusRules";

const SESSION_HOURS = SESSION_LENGTH_MS / HOUR_MS; // 5

/**
 * Classify usage against elapsed time.
 *  - exhausted     : usedPct >= 100
 *  - under_pace    : gap <= -10  (well below the expected line)
 *  - on_track      : -10 < gap <= 10
 *  - slightly_above: 10 < gap <= 25
 *  - at_risk       : gap > 25
 *  - unknown       : inputs are not finite (e.g. no reset time parsed)
 */
export function getPaceStatus(usedPct: number, expectedPct: number): PaceStatus {
  if (!Number.isFinite(usedPct) || !Number.isFinite(expectedPct)) return "unknown";
  if (usedPct >= 100) return "exhausted";
  const gap = usedPct - expectedPct;
  if (gap <= -10) return "under_pace";
  if (gap <= 10) return "on_track";
  if (gap <= 25) return "slightly_above";
  return "at_risk";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Compute the session (5-hour) pacing insight. */
export function computeSessionInsight(
  snapshot: ClaudeLimitSnapshot,
  prefs: UserPreferences,
  now: number = Date.now(),
): ClaudePaceInsight {
  const usedPct = clamp(snapshot.usedPct, 0, Number.MAX_SAFE_INTEGER);
  const remainingPct = clamp(100 - usedPct, 0, 100);

  // Without a reset time we cannot place usage on the timeline; degrade safely.
  if (snapshot.resetAt === undefined) {
    return finalize(
      {
        type: snapshot.type,
        label: snapshot.label,
        status: usedPct >= 100 ? "exhausted" : "unknown",
        usedPct,
        remainingPct,
        resetLabel: snapshot.resetLabel,
        recommendation: "",
      },
      prefs,
    );
  }

  const win = computeSessionWindow(snapshot.resetAt, now);
  const expectedPct = round1(win.elapsedPct);
  const paceGapPct = round1(usedPct - expectedPct);
  const status = getPaceStatus(usedPct, win.elapsedPct);

  const elapsedHours = Math.max(win.elapsedMs / HOUR_MS, 0.1);
  const burnRatePctPerHour = usedPct / elapsedHours;
  const projectedEndPct = round1(burnRatePctPerHour * SESSION_HOURS);
  const projectedUnusedPct = round1(Math.max(0, 100 - projectedEndPct));

  const remainingHours = Math.max(win.remainingMs / HOUR_MS, 1 / 60);
  const safeRatePctPerHour = round1(remainingPct / remainingHours);

  return finalize(
    {
      type: snapshot.type,
      label: snapshot.label,
      status,
      usedPct,
      remainingPct,
      expectedPct,
      paceGapPct,
      resetAt: snapshot.resetAt,
      resetLabel: snapshot.resetLabel,
      remainingMs: win.remainingMs,
      elapsedPct: expectedPct,
      projectedEndPct,
      projectedUnusedPct,
      safeRatePctPerHour,
      recommendation: "",
    },
    prefs,
  );
}

/** Compute a weekly (7-day) pacing insight, paced against working days. */
export function computeWeeklyInsight(
  snapshot: ClaudeLimitSnapshot,
  prefs: UserPreferences,
  now: number = Date.now(),
): ClaudePaceInsight {
  const usedPct = clamp(snapshot.usedPct, 0, Number.MAX_SAFE_INTEGER);
  const remainingPct = clamp(100 - usedPct, 0, 100);

  if (snapshot.resetAt === undefined) {
    return finalize(
      {
        type: snapshot.type,
        label: snapshot.label,
        status: usedPct >= 100 ? "exhausted" : "unknown",
        usedPct,
        remainingPct,
        resetLabel: snapshot.resetLabel,
        recommendation: "",
      },
      prefs,
    );
  }

  const win = computeWeeklyWindow(snapshot.resetAt, now);
  const expectedPct = round1(win.elapsedPct);
  const paceGapPct = round1(usedPct - expectedPct);
  const status = getPaceStatus(usedPct, win.elapsedPct);

  const remDays = Math.max(
    remainingWorkingDays(prefs.workingDays, now, snapshot.resetAt),
    1,
  );
  const safeRatePctPerWorkday = round1(remainingPct / remDays);

  // Linear projection across the full week from current burn.
  let projectedEndPct: number | undefined;
  let projectedUnusedPct: number | undefined;
  if (win.elapsedPct >= 1) {
    projectedEndPct = round1((usedPct * 100) / win.elapsedPct);
    projectedUnusedPct = round1(Math.max(0, 100 - projectedEndPct));
  }

  return finalize(
    {
      type: snapshot.type,
      label: snapshot.label,
      status,
      usedPct,
      remainingPct,
      expectedPct,
      paceGapPct,
      resetAt: snapshot.resetAt,
      resetLabel: snapshot.resetLabel,
      remainingMs: win.remainingMs,
      elapsedPct: expectedPct,
      projectedEndPct,
      projectedUnusedPct,
      safeRatePctPerWorkday,
      recommendation: "",
    },
    prefs,
  );
}

function finalize(insight: ClaudePaceInsight, prefs: UserPreferences): ClaudePaceInsight {
  insight.recommendation = recommendForInsight(insight, prefs);
  return insight;
}

/** Build insights for every snapshot, routing by bucket type. */
export function computeInsights(
  snapshots: ClaudeLimitSnapshot[],
  prefs: UserPreferences,
  now: number = Date.now(),
): ClaudePaceInsight[] {
  return snapshots.map((s) =>
    s.type === "current_session"
      ? computeSessionInsight(s, prefs, now)
      : computeWeeklyInsight(s, prefs, now),
  );
}

/**
 * Effective remaining headroom for Sonnet work: bounded by BOTH the all-models
 * weekly bucket and the Sonnet-only weekly bucket (whichever is tighter).
 */
export function sonnetEffectiveRemainingPct(
  allModelsRemainingPct: number,
  sonnetRemainingPct: number,
): number {
  return Math.min(allModelsRemainingPct, sonnetRemainingPct);
}

/** Effective remaining headroom for non-Sonnet work: the all-models bucket. */
export function nonSonnetEffectiveRemainingPct(allModelsRemainingPct: number): number {
  return allModelsRemainingPct;
}

// Re-exported so callers that only need preference parsing don't import two modules.
export { parseTimeOfDay };
