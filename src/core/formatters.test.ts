import { describe, expect, it } from "vitest";
import {
  formatClockTime,
  formatDuration,
  formatLastRead,
  formatPct,
  formatRatePerDay,
  formatRatePerHour,
} from "./formatters";

describe("formatters never emit NaN or Infinity", () => {
  it("formatPct returns an em dash for non-finite input", () => {
    expect(formatPct(Number.NaN)).toBe("—");
    expect(formatPct(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatPct(undefined)).toBe("—");
    expect(formatPct(31)).toBe("31%");
    expect(formatPct(40.6)).toBe("40.6%");
  });

  it("rate formatters guard non-finite input", () => {
    expect(formatRatePerHour(Number.NaN)).toBe("—");
    expect(formatRatePerDay(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatRatePerHour(40.6)).toBe("~40.6% / hr");
    expect(formatRatePerDay(24)).toBe("~24% / day");
  });

  it("formatDuration clamps to 'now' for non-positive input", () => {
    expect(formatDuration(Number.NaN)).toBe("now");
    expect(formatDuration(-5)).toBe("now");
    expect(formatDuration(102 * 60_000)).toBe("1h 42m");
  });
});

describe("formatClockTime", () => {
  it("formats a same-day reset as a 12-hour local time", () => {
    const now = new Date(2024, 0, 1, 13, 46).getTime(); // Mon 1:46 PM
    const reset = new Date(2024, 0, 1, 17, 30).getTime(); // Mon 5:30 PM
    expect(formatClockTime(reset, now)).toBe("5:30 PM");
  });
  it("prepends the weekday when the reset crosses into another day", () => {
    const now = new Date(2024, 0, 1, 23, 0).getTime(); // Mon 11:00 PM
    const reset = new Date(2024, 0, 2, 2, 30).getTime(); // Tue 2:30 AM
    expect(formatClockTime(reset, now)).toBe("Tue 2:30 AM");
  });
  it("handles noon and midnight", () => {
    const day = new Date(2024, 0, 1, 0, 0).getTime();
    expect(formatClockTime(new Date(2024, 0, 1, 12, 0).getTime(), day)).toBe("12:00 PM");
    expect(formatClockTime(new Date(2024, 0, 1, 0, 5).getTime(), day)).toBe("12:05 AM");
  });
  it("returns an empty string when unknown", () => {
    expect(formatClockTime(undefined)).toBe("");
  });
});

describe("formatLastRead", () => {
  const now = 1_700_000_000_000;
  it("says 'just now' within the first few seconds", () => {
    expect(formatLastRead(now - 2_000, now)).toBe("just now");
  });
  it("falls back to the relative form for older reads", () => {
    expect(formatLastRead(now - 120_000, now)).toBe("2m ago");
  });
  it("returns an em dash when unknown", () => {
    expect(formatLastRead(undefined, now)).toBe("—");
  });
});
