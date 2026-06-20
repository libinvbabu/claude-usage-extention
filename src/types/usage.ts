// Core data model for Claude Usage Pace.
//
// All types are local-only: nothing here is ever transmitted off the device.

/** The usage buckets Claude exposes in Settings > Usage. */
export type ClaudeLimitType =
  | "current_session"
  | "weekly_all_models"
  | "weekly_sonnet";

/**
 * A single parsed reading of one Claude usage bucket, captured from the
 * visible text of the usage settings page.
 */
export type ClaudeLimitSnapshot = {
  type: ClaudeLimitType;
  /** Human label as shown in the UI, e.g. "Current session". */
  label: string;
  /** Percentage of this bucket already consumed (0–100). */
  usedPct: number;
  /** Percentage of this bucket still available (0–100). */
  remainingPct: number;
  /** Raw reset text as shown, e.g. "Resets in 3 hr 31 min" or "Resets Wed 3:29 AM". */
  resetLabel: string;
  /** Absolute reset time in epoch ms, when it could be derived. */
  resetAt?: number;
  /** Whether this bucket is currently being tracked / has data. */
  active: boolean;
  /** When this snapshot was captured (epoch ms). */
  capturedAt: number;
};

/** Pacing classification for a bucket relative to elapsed time. */
export type PaceStatus =
  | "under_pace"
  | "on_track"
  | "slightly_above"
  | "at_risk"
  | "exhausted"
  | "unknown";

/**
 * A computed pacing insight for one bucket: combines the raw snapshot with
 * time-window math, projections and a per-bucket recommendation.
 */
export type ClaudePaceInsight = {
  type: ClaudeLimitType;
  label: string;
  status: PaceStatus;
  usedPct: number;
  remainingPct: number;
  /** Percentage of the window that has elapsed (the "expected" usage line). */
  expectedPct?: number;
  /** usedPct - expectedPct. Positive = ahead of pace (burning fast). */
  paceGapPct?: number;
  resetAt?: number;
  resetLabel: string;
  /** Milliseconds until reset. */
  remainingMs?: number;
  /** Percentage of the window that has elapsed (alias of expectedPct). */
  elapsedPct?: number;
  /** Projected usage at the end of the window if the current burn rate holds. */
  projectedEndPct?: number;
  /** Projected unused allowance at reset (0–100). */
  projectedUnusedPct?: number;
  /** Safe spend rate (% per hour) to exactly exhaust by reset — session buckets. */
  safeRatePctPerHour?: number;
  /** Safe spend rate (% per working day) to exactly exhaust by reset — weekly buckets. */
  safeRatePctPerWorkday?: number;
  recommendation: string;
};

/** User-configurable preferences, persisted in chrome.storage.local. */
export type UserPreferences = {
  /** Working day indices: 0 = Sunday, 1 = Monday … 6 = Saturday. */
  workingDays: number[];
  /** Working hours start, "HH:MM" 24h. */
  workingHoursStart: string;
  /** Working hours end, "HH:MM" 24h. */
  workingHoursEnd: string;
  /** Show Claude Code-specific tips (/clear, /compact, etc.). */
  showClaudeCodeTips: boolean;
  /** Render a denser panel. */
  compactMode: boolean;
};

/** One stored history entry: a batch of snapshots captured together. */
export type UsageHistoryEntry = {
  capturedAt: number;
  snapshots: ClaudeLimitSnapshot[];
};
