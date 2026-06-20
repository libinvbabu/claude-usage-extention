import { describe, expect, it } from "vitest";
import {
  computeSessionWindow,
  parseResetIn,
  parseWeeklyReset,
  SESSION_LENGTH_MS,
} from "./timeWindows";

describe("parseResetIn", () => {
  it("parses hours and minutes", () => {
    expect(parseResetIn("Resets in 3 hr 31 min")).toBe((3 * 60 + 31) * 60_000);
  });
  it("parses minutes only", () => {
    expect(parseResetIn("Resets in 31 min")).toBe(31 * 60_000);
  });
  it("parses hours only", () => {
    expect(parseResetIn("Resets in 2 hr")).toBe(2 * 60 * 60_000);
  });
  it("is case-insensitive and tolerant of spacing", () => {
    expect(parseResetIn("resets in  1hr  5min")).toBe((60 + 5) * 60_000);
  });
  it("returns null when no duration present", () => {
    expect(parseResetIn("Current session")).toBeNull();
    expect(parseResetIn("Resets in soon")).toBeNull();
  });
});

describe("parseWeeklyReset", () => {
  // Monday 2024-01-01 09:00 local.
  const now = new Date(2024, 0, 1, 9, 0, 0, 0).getTime();

  it("finds the next matching weekday/time (AM)", () => {
    const ts = parseWeeklyReset("Resets Wed 3:29 AM", now);
    expect(ts).not.toBeNull();
    const d = new Date(ts as number);
    expect(d.getDay()).toBe(3); // Wednesday
    expect(d.getHours()).toBe(3);
    expect(d.getMinutes()).toBe(29);
    expect(ts as number).toBeGreaterThan(now);
  });

  it("handles PM correctly", () => {
    const ts = parseWeeklyReset("Resets Mon 11:30 PM", now);
    const d = new Date(ts as number);
    expect(d.getDay()).toBe(1);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(30);
  });

  it("rolls to next week when the time today has already passed", () => {
    const wed9am = new Date(2024, 0, 3, 9, 0, 0, 0).getTime(); // Wed 09:00
    const ts = parseWeeklyReset("Resets Wed 3:29 AM", wed9am);
    const d = new Date(ts as number);
    expect(d.getDay()).toBe(3);
    expect(ts as number).toBeGreaterThan(wed9am);
    expect((ts as number) - wed9am).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
  });

  it("returns null for unparseable text", () => {
    expect(parseWeeklyReset("Resets sometime soon", now)).toBeNull();
  });
});

describe("computeSessionWindow", () => {
  it("derives elapsed/remaining from the reset time", () => {
    const now = 1_700_000_000_000;
    const resetAt = now + 211 * 60_000; // 3h31m left
    const w = computeSessionWindow(resetAt, now);
    expect(w.lengthMs).toBe(SESSION_LENGTH_MS);
    expect(w.remainingMs).toBe(211 * 60_000);
    expect(w.elapsedMs).toBe(SESSION_LENGTH_MS - 211 * 60_000);
    expect(w.elapsedPct).toBeCloseTo(29.67, 1);
  });

  it("clamps when the reset is in the past", () => {
    const now = 1_700_000_000_000;
    const w = computeSessionWindow(now - 1000, now);
    expect(w.remainingMs).toBe(0);
    expect(w.elapsedPct).toBe(100);
  });
});
