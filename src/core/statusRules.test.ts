import { describe, expect, it } from "vitest";
import { selectTopRecommendation, taskGuidanceFor } from "./statusRules";
import type { ClaudeLimitType, ClaudePaceInsight, PaceStatus } from "../types/usage";

function insight(
  type: ClaudeLimitType,
  status: PaceStatus,
  over: Partial<ClaudePaceInsight> = {},
): ClaudePaceInsight {
  return {
    type,
    label: type,
    status,
    usedPct: 0,
    remainingPct: 100,
    resetLabel: "Resets soon",
    recommendation: "note",
    ...over,
  };
}

describe("selectTopRecommendation", () => {
  it("reports unavailable when there is no usable data", () => {
    const r = selectTopRecommendation([]);
    expect(r.title).toBe("Usage data unavailable");
    expect(r.status).toBe("unknown");
    expect(r.bottleneck).toBe("none");
    expect(r.bottleneckLabel).toBe("Usage data unavailable");
    expect(r.guidanceMode).toBe("unavailable");
  });

  it("treats all-unknown insights as unavailable", () => {
    const r = selectTopRecommendation([insight("current_session", "unknown")]);
    expect(r.guidanceMode).toBe("unavailable");
  });

  it("recommends heavy work with no bottleneck when under pace on both", () => {
    const r = selectTopRecommendation([
      insight("current_session", "under_pace"),
      insight("weekly_all_models", "under_pace"),
    ]);
    expect(r.title).toBe("Good window for heavy work");
    expect(r.status).toBe("under_pace");
    expect(r.bottleneck).toBe("none");
    expect(r.bottleneckLabel).toBe("None — session and weekly limits both have room");
    expect(r.guidanceMode).toBe("under_pace");
    expect(r.body).toMatch(/below target usage for both session and weekly limits/i);
    // The user-facing copy must not leak the internal "under pace" jargon.
    expect(r.body).not.toMatch(/under pace/i);
  });

  it("softens the body when the week is only on track", () => {
    const r = selectTopRecommendation([
      insight("current_session", "under_pace"),
      insight("weekly_all_models", "on_track"),
    ]);
    expect(r.title).toBe("Good window for heavy work");
    expect(r.body).toMatch(/within pace for the week/i);
  });

  it("flags the weekly limit as the bottleneck when it is at risk", () => {
    const r = selectTopRecommendation([
      insight("current_session", "on_track"),
      insight("weekly_all_models", "at_risk"),
    ]);
    expect(r.title).toBe("Weekly limit is the bottleneck");
    expect(r.status).toBe("at_risk");
    expect(r.bottleneck).toBe("weekly_all_models");
    expect(r.bottleneckLabel).toBe("Weekly all-model limit");
    expect(r.guidanceMode).toBe("weekly_bottleneck");
  });

  it("prefers the tighter weekly bucket as the bottleneck and shows the parsed model", () => {
    const r = selectTopRecommendation([
      insight("current_session", "on_track"),
      insight("weekly_all_models", "at_risk", { remainingPct: 30 }),
      insight("weekly_sonnet", "at_risk", { remainingPct: 8, label: "Weekly · Sonnet" }),
    ]);
    expect(r.bottleneck).toBe("weekly_sonnet");
    expect(r.bottleneckLabel).toBe("Weekly Sonnet limit");
  });

  it("falls back to a generic model-specific bottleneck when no model name is parsed", () => {
    const r = selectTopRecommendation([
      insight("current_session", "on_track"),
      insight("weekly_sonnet", "at_risk", { remainingPct: 8, label: "Weekly limit" }),
    ]);
    expect(r.bottleneck).toBe("weekly_sonnet");
    expect(r.bottleneckLabel).toBe("Weekly model-specific limit");
  });

  it("prioritises a session at risk over the week", () => {
    const r = selectTopRecommendation([
      insight("current_session", "at_risk"),
      insight("weekly_all_models", "under_pace"),
    ]);
    expect(r.title).toBe("Slow down for this session");
    expect(r.bottleneck).toBe("current_session");
    expect(r.guidanceMode).toBe("at_risk");
  });

  it("tells the user to wait when the session is exhausted", () => {
    const r = selectTopRecommendation([
      insight("current_session", "exhausted", { usedPct: 100, remainingPct: 0 }),
      insight("weekly_all_models", "under_pace"),
    ]);
    expect(r.title).toBe("Wait until reset");
    expect(r.status).toBe("exhausted");
    expect(r.bottleneck).toBe("current_session");
  });
});

describe("taskGuidanceFor", () => {
  it("returns under-pace guidance starting with 'Good for'", () => {
    const g = taskGuidanceFor("under_pace");
    expect(g?.items[0].heading).toBe("Good for");
    expect(g?.items).toHaveLength(2);
  });

  it("uses 'One focused Claude Code task' in the under-pace guidance", () => {
    const g = taskGuidanceFor("under_pace");
    expect(g?.items[0].body).toContain("One focused Claude Code task");
    expect(g?.items[0].body).not.toContain("larger");
  });

  it("returns weekly-bottleneck guidance that saves usage", () => {
    const g = taskGuidanceFor("weekly_bottleneck");
    expect(g?.items[0].heading).toBe("Save usage for");
  });

  it("returns null when unavailable", () => {
    expect(taskGuidanceFor("unavailable")).toBeNull();
  });
});
