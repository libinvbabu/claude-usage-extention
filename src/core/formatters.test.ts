import { describe, expect, it } from "vitest";
import {
  formatClockTime,
  formatDuration,
  formatLastRead,
  formatPct,
  formatPctInt,
  formatRatePerDay,
  formatRatePerHour,
  formatSessionReset,
  statusLabel,
} from "./formatters";

describe("formatters never emit NaN or Infinity", () => {
  it("formatPct returns an em dash for non-finite input", () => {
    expect(formatPct(Number.NaN)).toBe("—");
    expect(formatPct(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatPct(undefined)).toBe("—");
    expect(formatPct(31)).toBe("31%");
    expect(formatPct(40.6)).toBe("40.6%");
  });

  it("formatPctInt rounds to a whole number and clamps to 0–100", () => {
    expect(formatPctInt(Number.NaN)).toBe("—");
    expect(formatPctInt(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatPctInt(undefined)).toBe("—");
    expect(formatPctInt(40.6)).toBe("41%");
    expect(formatPctInt(91)).toBe("91%");
    expect(formatPctInt(150)).toBe("100%"); // clamped
    expect(formatPctInt(-5)).toBe("0%"); // clamped
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

describe("statusLabel maps internal status to user-facing copy", () => {
  it("renders under_pace as 'Has headroom' (never 'Under pace')", () => {
    expect(statusLabel("under_pace")).toBe("Has headroom");
  });
  it("maps the remaining statuses", () => {
    expect(statusLabel("on_track")).toBe("On track");
    expect(statusLabel("slightly_above")).toBe("Use carefully");
    expect(statusLabel("at_risk")).toBe("At risk");
    expect(statusLabel("exhausted")).toBe("Wait for reset");
    expect(statusLabel("unknown")).toBe("Usage unavailable");
  });
});

describe("formatSessionReset", () => {
  const now = new Date(2024, 0, 1, 14, 59).getTime(); // Mon 2:59 PM
  const at629pm = new Date(2024, 0, 1, 18, 29).getTime(); // same-day 6:29 PM
  const threeHalfHours = (3 * 60 + 30) * 60_000;

  it("shows absolute then relative when both are available", () => {
    expect(formatSessionReset(at629pm, threeHalfHours, now)).toBe("Resets 6:29 PM · in 3h 30m");
  });

  it("shows only the relative countdown when there is no absolute time", () => {
    expect(formatSessionReset(undefined, threeHalfHours, now)).toBe("Resets in 3h 30m");
  });

  it("shows only the absolute time when there is no countdown", () => {
    expect(formatSessionReset(at629pm, undefined, now)).toBe("Resets 6:29 PM");
  });

  it("returns an empty string (never a dangling separator) when nothing is known", () => {
    expect(formatSessionReset(undefined, undefined, now)).toBe("");
    expect(formatSessionReset(undefined, Number.NaN, now)).toBe("");
    expect(formatSessionReset(undefined, -1, now)).toBe("");
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
