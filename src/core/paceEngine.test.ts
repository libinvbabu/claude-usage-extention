import { describe, expect, it } from "vitest";
import { computeSessionInsight, computeWeeklyInsight, getPaceStatus } from "./paceEngine";
import { DEFAULT_PREFERENCES } from "../storage/preferences";
import type { ClaudeLimitSnapshot } from "../types/usage";

describe("getPaceStatus", () => {
  it("classifies the pace gap", () => {
    expect(getPaceStatus(0, 0)).toBe("on_track");
    expect(getPaceStatus(5, 30)).toBe("under_pace"); // gap -25
    expect(getPaceStatus(30, 25)).toBe("on_track"); // gap +5
    expect(getPaceStatus(40, 25)).toBe("slightly_above"); // gap +15
    expect(getPaceStatus(60, 25)).toBe("at_risk"); // gap +35
    expect(getPaceStatus(100, 50)).toBe("exhausted");
  });
  it("returns unknown for non-finite inputs", () => {
    expect(getPaceStatus(Number.NaN, 10)).toBe("unknown");
  });
});

describe("computeSessionInsight", () => {
  // Matches the worked example in the spec: 9% used, 3h31m remaining.
  const now = 1_700_000_000_000;
  const snapshot: ClaudeLimitSnapshot = {
    type: "current_session",
    label: "Current session",
    usedPct: 9,
    remainingPct: 91,
    resetLabel: "Resets in 3 hr 31 min",
    resetAt: now + 211 * 60_000,
    active: true,
    capturedAt: now,
  };

  const insight = computeSessionInsight(snapshot, DEFAULT_PREFERENCES, now);

  it("reports the expected pace line (~30%)", () => {
    expect(insight.expectedPct).toBeCloseTo(29.7, 1);
  });
  it("reports a ~-21pt pace gap and under_pace status", () => {
    expect(insight.paceGapPct).toBeCloseTo(-20.7, 1);
    expect(insight.status).toBe("under_pace");
  });
  it("projects ~70% unused", () => {
    expect(insight.projectedUnusedPct).toBeCloseTo(69.7, 0);
    expect(insight.remainingPct).toBe(91);
  });
  it("computes a safe rate of ~26%/hr", () => {
    expect(insight.safeRatePctPerHour).toBeCloseTo(25.9, 0);
  });
  it("produces a non-empty recommendation", () => {
    expect(insight.recommendation.length).toBeGreaterThan(0);
  });

  it("degrades gracefully without a reset time", () => {
    const partial = computeSessionInsight(
      { ...snapshot, resetAt: undefined },
      DEFAULT_PREFERENCES,
      now,
    );
    expect(partial.status).toBe("unknown");
    expect(partial.expectedPct).toBeUndefined();
    expect(partial.remainingPct).toBe(91);
  });
});

describe("computeWeeklyInsight", () => {
  const now = new Date(2024, 0, 1, 9, 0).getTime(); // Mon 09:00 local
  const resetAt = now + 5 * 24 * 60 * 60 * 1000; // Sat 09:00
  const snapshot: ClaudeLimitSnapshot = {
    type: "weekly_all_models",
    label: "Weekly · all models",
    usedPct: 2,
    remainingPct: 98,
    resetLabel: "Resets Sat 9:00 AM",
    resetAt,
    active: true,
    capturedAt: now,
  };

  const insight = computeWeeklyInsight(snapshot, DEFAULT_PREFERENCES, now);

  it("is under pace early in the week", () => {
    expect(insight.status).toBe("under_pace");
    expect(insight.remainingPct).toBe(98);
  });
  it("computes a positive per-workday safe rate", () => {
    // 98% over 5 remaining working days (Mon–Fri) ≈ 19.6%/day
    expect(insight.safeRatePctPerWorkday).toBeCloseTo(19.6, 1);
  });
});
