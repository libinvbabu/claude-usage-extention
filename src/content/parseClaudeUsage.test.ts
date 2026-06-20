import { describe, expect, it } from "vitest";
import {
  looksLikeUsageContent,
  parseCurrentSession,
  parseUsagePage,
  parseWeeklyAllModels,
} from "./parseClaudeUsage";

const NOW = 1_700_000_000_000;

function buildPage(lines: string[]): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = lines.map((l) => `<div><span>${l}</span></div>`).join("");
  return root;
}

const SAMPLE = [
  "Current session",
  "Resets in 3 hr 31 min",
  "9% used",
  "Weekly limits",
  "All models",
  "Resets Wed 3:29 AM",
  "2% used",
  "Sonnet only",
  "You haven't used Sonnet yet",
  "0% used",
];

describe("parseUsagePage (sample text)", () => {
  const root = buildPage(SAMPLE);
  const snapshots = parseUsagePage(root, NOW);

  it("finds all three buckets", () => {
    expect(snapshots.map((s) => s.type)).toEqual([
      "current_session",
      "weekly_all_models",
      "weekly_sonnet",
    ]);
  });

  it("parses the current session", () => {
    const s = snapshots.find((x) => x.type === "current_session")!;
    expect(s.usedPct).toBe(9);
    expect(s.remainingPct).toBe(91);
    expect(s.resetAt).toBe(NOW + 211 * 60_000);
  });

  it("parses weekly all models with a future reset", () => {
    const s = snapshots.find((x) => x.type === "weekly_all_models")!;
    expect(s.usedPct).toBe(2);
    expect(s.resetLabel).toMatch(/Wed 3:29 AM/);
    expect(s.resetAt).toBeGreaterThan(NOW);
  });

  it("treats 'haven't used Sonnet yet' as 0% and inherits the weekly reset", () => {
    const sonnet = snapshots.find((x) => x.type === "weekly_sonnet")!;
    const all = snapshots.find((x) => x.type === "weekly_all_models")!;
    expect(sonnet.usedPct).toBe(0);
    expect(sonnet.resetAt).toBe(all.resetAt);
  });
});

describe("parser edge cases", () => {
  it("handles decimal percentages and minute-only resets", () => {
    const root = buildPage(["Current session", "Resets in 45 min", "12.5% used"]);
    const s = parseCurrentSession(root, NOW)!;
    expect(s.usedPct).toBe(12.5);
    expect(s.resetAt).toBe(NOW + 45 * 60_000);
  });

  it("handles an hours-only reset", () => {
    const root = buildPage(["Current session", "Resets in 2 hr", "5% used"]);
    const s = parseCurrentSession(root, NOW)!;
    expect(s.resetAt).toBe(NOW + 2 * 60 * 60_000);
  });

  it("returns partial data when Sonnet is missing", () => {
    const root = buildPage([
      "Current session",
      "Resets in 1 hr 0 min",
      "20% used",
      "Weekly limits",
      "All models",
      "Resets Fri 10:00 AM",
      "40% used",
    ]);
    const snapshots = parseUsagePage(root, NOW);
    expect(snapshots.map((s) => s.type)).toEqual([
      "current_session",
      "weekly_all_models",
    ]);
  });

  it("does not mistake a body line for the Sonnet header", () => {
    const root = buildPage(SAMPLE);
    const sonnet = parseWeeklyAllModels(root, NOW);
    expect(sonnet?.usedPct).toBe(2);
  });

  it("returns nothing for an unrelated page", () => {
    const root = buildPage(["Welcome back", "Start a new chat", "Settings"]);
    expect(parseUsagePage(root, NOW)).toHaveLength(0);
    expect(looksLikeUsageContent(root)).toBe(false);
  });

  it("recognises a real usage page", () => {
    expect(looksLikeUsageContent(buildPage(SAMPLE))).toBe(true);
  });
});
