import { describe, expect, it } from "vitest";
import { parseTimeOfDay, remainingWorkingDays, remainingWorkingHours } from "./workingDays";

const MON_FRI = [1, 2, 3, 4, 5];
const ALL = [0, 1, 2, 3, 4, 5, 6];

describe("remainingWorkingDays", () => {
  it("counts Mon–Fri across a full week", () => {
    const from = new Date(2024, 0, 1, 9, 0).getTime(); // Mon
    const to = new Date(2024, 0, 8, 0, 0).getTime(); // next Mon 00:00
    expect(remainingWorkingDays(MON_FRI, from, to)).toBe(5);
  });

  it("counts every day when all days are working days", () => {
    const from = new Date(2024, 0, 1, 9, 0).getTime();
    const to = new Date(2024, 0, 8, 0, 0).getTime();
    expect(remainingWorkingDays(ALL, from, to)).toBe(7);
  });

  it("counts a partial remaining week", () => {
    const from = new Date(2024, 0, 3, 9, 0).getTime(); // Wed
    const to = new Date(2024, 0, 8, 0, 0).getTime(); // next Mon
    // Wed, Thu, Fri
    expect(remainingWorkingDays(MON_FRI, from, to)).toBe(3);
  });

  it("returns 0 when the window is empty or inverted", () => {
    const now = new Date(2024, 0, 3, 9, 0).getTime();
    expect(remainingWorkingDays(MON_FRI, now, now)).toBe(0);
    expect(remainingWorkingDays(MON_FRI, now, now - 1000)).toBe(0);
  });
});

describe("remainingWorkingHours", () => {
  it("sums working-hour blocks across remaining days", () => {
    const start = parseTimeOfDay("09:00", 540); // 540
    const end = parseTimeOfDay("17:00", 1020); // 1020 -> 8h/day
    const from = new Date(2024, 0, 1, 9, 0).getTime(); // Mon 09:00
    const to = new Date(2024, 0, 3, 9, 0).getTime(); // Wed 09:00
    // Mon 09:00->17:00 (8h) + Tue 09:00->17:00 (8h) = 16h
    expect(remainingWorkingHours(MON_FRI, start, end, from, to)).toBeCloseTo(16, 1);
  });
});

describe("parseTimeOfDay", () => {
  it("parses HH:MM", () => {
    expect(parseTimeOfDay("09:30", 0)).toBe(9 * 60 + 30);
  });
  it("falls back on bad input", () => {
    expect(parseTimeOfDay("nope", 123)).toBe(123);
  });
});
