// Recommendation engine. Two responsibilities:
//   1. recommendForInsight()      — a short per-bucket line.
//   2. selectTopRecommendation()  — the single most important headline.
//   3. buildTips()                — optional Claude Code usage tips.
//
// No exact "messages left" is ever produced — only percentage-based guidance.

import type {
  ClaudeLimitType,
  ClaudePaceInsight,
  PaceStatus,
  UserPreferences,
} from "../types/usage";

export type TopRecommendation = {
  status: PaceStatus;
  title: string;
  body: string;
};

const HEALTHY: PaceStatus[] = ["under_pace", "on_track"];
const ABOVE: PaceStatus[] = ["slightly_above", "at_risk"];

function byType(
  insights: ClaudePaceInsight[],
): Partial<Record<ClaudeLimitType, ClaudePaceInsight>> {
  const map: Partial<Record<ClaudeLimitType, ClaudePaceInsight>> = {};
  for (const i of insights) map[i.type] = i;
  return map;
}

/** A concise recommendation for a single bucket card. */
export function recommendForInsight(
  insight: ClaudePaceInsight,
  _prefs: UserPreferences,
): string {
  const isSession = insight.type === "current_session";
  const isSonnet = insight.type === "weekly_sonnet";

  switch (insight.status) {
    case "exhausted":
      if (isSession) return "Session exhausted — wait for the 5-hour reset.";
      if (isSonnet) return "Sonnet weekly limit reached — avoid Sonnet until reset.";
      return "Weekly limit reached — wait for the weekly reset.";
    case "at_risk":
      if (isSession) return "Burning fast — pause long agentic runs.";
      if (isSonnet) return "Sonnet is the bottleneck — use it sparingly.";
      return "Weekly quota is the bottleneck — high-value tasks only.";
    case "slightly_above":
      if (isSession) return "A bit ahead of pace — trim context.";
      return "Slightly ahead for the week — ease off non-essential runs.";
    case "on_track":
      if (isSession) return "On track — normal usage is fine.";
      return "Weekly usage is on track.";
    case "under_pace":
      if (isSession) return "Well under pace — room for heavy work.";
      return "Plenty of weekly headroom.";
    default:
      return isSession ? "Session usage captured." : "Weekly usage captured.";
  }
}

/** Pick the single most important headline across all buckets. */
export function selectTopRecommendation(
  insights: ClaudePaceInsight[],
): TopRecommendation {
  if (insights.length === 0) {
    return {
      status: "unknown",
      title: "No usage data",
      body: "Usage data not found on this page.",
    };
  }

  const m = byType(insights);
  const session = m.current_session;
  const weekly = m.weekly_all_models;
  const sonnet = m.weekly_sonnet;

  // 1. Session exhausted.
  if (session?.status === "exhausted") {
    return {
      status: "exhausted",
      title: "Session exhausted",
      body: "Current session is exhausted. Wait until reset before starting heavy Claude Code work.",
    };
  }
  // 2. Weekly all-model exhausted.
  if (weekly?.status === "exhausted") {
    return {
      status: "exhausted",
      title: "Weekly limit exhausted",
      body: "Weekly all-model limit is exhausted. Wait for the weekly reset or use usage credits if enabled.",
    };
  }
  // 3. Sonnet exhausted.
  if (sonnet?.status === "exhausted") {
    return {
      status: "exhausted",
      title: "Sonnet limit exhausted",
      body: "Sonnet weekly limit is exhausted. Avoid Sonnet-heavy work until reset.",
    };
  }
  // 4. Session at risk.
  if (session?.status === "at_risk") {
    return {
      status: "at_risk",
      title: "Slow down",
      body: "Slow down. Avoid long agentic Claude Code runs until the session resets.",
    };
  }
  // 5. Weekly at risk.
  if (weekly?.status === "at_risk" || sonnet?.status === "at_risk") {
    return {
      status: "at_risk",
      title: "Weekly is the bottleneck",
      body: "Session has room, but weekly quota is the bottleneck. Use Claude for high-value tasks only.",
    };
  }
  // 6. Session under pace and weekly healthy.
  if (
    session?.status === "under_pace" &&
    (!weekly || HEALTHY.includes(weekly.status))
  ) {
    return {
      status: "under_pace",
      title: "Good time for heavy work",
      body: "Good time for heavy work. You have meaningful session and weekly headroom.",
    };
  }
  // 7. Session on track.
  if (session?.status === "on_track") {
    return {
      status: "on_track",
      title: "On track",
      body: "Normal usage is fine. Keep an eye on long contexts.",
    };
  }
  // 8. Fallback.
  return {
    status: session?.status ?? weekly?.status ?? "unknown",
    title: "Usage data found",
    body: "Usage data found. Continue normally.",
  };
}

/**
 * Optional, actionable Claude Code tips based on the current picture.
 * Returns an empty list when tips are disabled or nothing notable applies.
 */
export function buildTips(
  insights: ClaudePaceInsight[],
  prefs: UserPreferences,
): string[] {
  if (!prefs.showClaudeCodeTips) return [];

  const m = byType(insights);
  const session = m.current_session;
  const weekly = m.weekly_all_models;
  const sonnet = m.weekly_sonnet;
  const tips: string[] = [];

  const burnHigh =
    session?.status === "at_risk" ||
    (session?.projectedEndPct !== undefined && session.projectedEndPct > 100);

  if (burnHigh) {
    tips.push("Burn rate is high — run /clear before the next task to drop old context.");
  } else if (session?.status === "slightly_above") {
    tips.push("Use shorter prompts and avoid carrying old context (/compact can help).");
  }

  if (weekly && ABOVE.includes(weekly.status)) {
    tips.push("Save Claude Code for high-value tasks this week.");
  }

  const sonnetConstrained =
    sonnet &&
    (ABOVE.includes(sonnet.status) ||
      sonnet.status === "exhausted" ||
      (sonnet.remainingPct < (weekly?.remainingPct ?? 100) - 10 && sonnet.usedPct > 0));
  if (sonnetConstrained) {
    tips.push("Use Sonnet carefully; it may be the limiting bucket this week.");
  }

  // Encourage good hygiene when there is clear headroom.
  if (
    tips.length === 0 &&
    session?.status === "under_pace" &&
    (!weekly || HEALTHY.includes(weekly.status))
  ) {
    tips.push(
      "Good window for a larger task. Start fresh with /clear so old context doesn't eat quota.",
    );
  }

  return tips;
}
