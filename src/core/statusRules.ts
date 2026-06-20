// Recommendation engine. Three responsibilities:
//   1. recommendForInsight()      — a short per-bucket line (screen-reader aid).
//   2. selectTopRecommendation()  — the single headline + bottleneck + guidance mode.
//   3. taskGuidanceFor()          — state-based, actionable task guidance.
//
// Copy is deliberately careful: it never claims exact "messages" or "tokens"
// left, and never overstates certainty — only percentage-based pacing guidance.

import type {
  BottleneckType,
  ClaudeLimitType,
  ClaudePaceInsight,
  GuidanceMode,
  PaceStatus,
  UserPreferences,
} from "../types/usage";

export type TopRecommendation = {
  status: PaceStatus;
  title: string;
  body: string;
  /** Which limit is most likely to constrain the next heavy task. */
  bottleneck: BottleneckType;
  /** Human label for the bottleneck line, e.g. "None", "Current session". */
  bottleneckLabel: string;
  /** Drives the task-guidance card. */
  guidanceMode: GuidanceMode;
};

export type TaskGuidanceItem = { heading: string; body: string };
export type TaskGuidance = { mode: GuidanceMode; items: TaskGuidanceItem[] };

const HEALTHY: PaceStatus[] = ["under_pace", "on_track"];

const BOTTLENECK_LABELS: Record<BottleneckType, string> = {
  none: "None — session and weekly limits both have room",
  current_session: "Current session",
  weekly_all_models: "Weekly all-model limit",
  // Generic fallback; the parsed model name (e.g. "Sonnet") is substituted when
  // available — see labelForBottleneck().
  weekly_sonnet: "Weekly model-specific limit",
};

/**
 * Extract a model name from a weekly bucket label like "Weekly · Sonnet" → "Sonnet".
 * Returns "" when no specific model can be read, so callers fall back to the
 * generic "Weekly model-specific limit" wording rather than hardcoding Sonnet.
 */
function modelNameFromLabel(label: string | undefined): string {
  if (!label || !label.includes("·")) return "";
  const tail = label.split("·").pop()?.trim() ?? "";
  return tail && !/^weekly$/i.test(tail) ? tail : "";
}

/** Bottleneck line for a chosen insight, substituting the model name when known. */
function labelForBottleneck(insight: ClaudePaceInsight): string {
  if (insight.type === "weekly_sonnet") {
    const model = modelNameFromLabel(insight.label);
    return model ? `Weekly ${model} limit` : BOTTLENECK_LABELS.weekly_sonnet;
  }
  return BOTTLENECK_LABELS[insight.type];
}

function byType(
  insights: ClaudePaceInsight[],
): Partial<Record<ClaudeLimitType, ClaudePaceInsight>> {
  const map: Partial<Record<ClaudeLimitType, ClaudePaceInsight>> = {};
  for (const i of insights) map[i.type] = i;
  return map;
}

function isHealthy(insight: ClaudePaceInsight | undefined): boolean {
  return !insight || HEALTHY.includes(insight.status);
}

/** Of two weekly buckets in the same trouble band, the tighter (lower remaining). */
function tighterWeekly(
  all: ClaudePaceInsight | undefined,
  sonnet: ClaudePaceInsight | undefined,
  band: PaceStatus[],
): ClaudePaceInsight | undefined {
  const candidates = [all, sonnet].filter(
    (i): i is ClaudePaceInsight => !!i && band.includes(i.status),
  );
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => a.remainingPct - b.remainingPct)[0];
}

/** A concise recommendation for a single bucket (used as a screen-reader label). */
export function recommendForInsight(
  insight: ClaudePaceInsight,
  _prefs: UserPreferences,
): string {
  const isSession = insight.type === "current_session";
  const isSonnet = insight.type === "weekly_sonnet";

  switch (insight.status) {
    case "exhausted":
      if (isSession) return "Session used up — wait for the 5-hour reset.";
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

function rec(
  status: PaceStatus,
  title: string,
  body: string,
  bottleneck: BottleneckType,
  guidanceMode: GuidanceMode,
  bottleneckLabel?: string,
): TopRecommendation {
  return {
    status,
    title,
    body,
    bottleneck,
    bottleneckLabel: bottleneckLabel ?? BOTTLENECK_LABELS[bottleneck],
    guidanceMode,
  };
}

/**
 * Pick the single most important headline across all buckets, plus the current
 * bottleneck and the guidance mode. Order = most-constraining first.
 */
export function selectTopRecommendation(
  insights: ClaudePaceInsight[],
): TopRecommendation {
  const present = insights.filter((i) => i.status !== "unknown");
  if (present.length === 0) {
    return rec(
      "unknown",
      "Usage data unavailable",
      "Usage values couldn't be read from this page. Open Claude's Usage settings, or click Re-read once it finishes loading.",
      "none",
      "unavailable",
      "Usage data unavailable",
    );
  }

  const m = byType(insights);
  const session = m.current_session;
  const weekly = m.weekly_all_models;
  const sonnet = m.weekly_sonnet;

  // 1. Exhausted — most immediate first (session, then weekly all-models, then Sonnet).
  if (session?.status === "exhausted") {
    return rec(
      "exhausted",
      "Wait until reset",
      "This 5-hour session is used up. Wait for the session to reset before starting heavy Claude Code work.",
      "current_session",
      "at_risk",
    );
  }
  if (weekly?.status === "exhausted") {
    return rec(
      "exhausted",
      "Wait until reset",
      "Your weekly all-model limit is used up. Wait for the weekly reset before starting heavy work.",
      "weekly_all_models",
      "weekly_bottleneck",
    );
  }
  if (sonnet?.status === "exhausted") {
    return rec(
      "exhausted",
      "Wait until reset",
      "Your Sonnet weekly limit is used up. Switch models or wait for the weekly reset.",
      "weekly_sonnet",
      "weekly_bottleneck",
      labelForBottleneck(sonnet),
    );
  }

  // 2. Session is the pressing limit (at risk).
  if (session?.status === "at_risk") {
    return rec(
      "at_risk",
      "Slow down for this session",
      "You're well ahead of pace for this 5-hour session. Long agentic runs may use it up before it resets.",
      "current_session",
      "at_risk",
    );
  }

  // 3. A weekly limit is at risk while the session still has room.
  const weeklyAtRisk = tighterWeekly(weekly, sonnet, ["at_risk"]);
  if (weeklyAtRisk) {
    return rec(
      "at_risk",
      "Weekly limit is the bottleneck",
      "Your session still has room, but a weekly limit is filling faster than time is passing. It's the limit most likely to constrain heavy work.",
      weeklyAtRisk.type,
      "weekly_bottleneck",
      labelForBottleneck(weeklyAtRisk),
    );
  }

  // 4. Session a little ahead of pace.
  if (session?.status === "slightly_above") {
    return rec(
      "slightly_above",
      "Slow down for this session",
      "You're a little ahead of pace for this 5-hour session. Prefer smaller prompts and trim old context before a big task.",
      "current_session",
      "slightly_above",
    );
  }

  // 5. A weekly limit is a little ahead of pace.
  const weeklyAbove = tighterWeekly(weekly, sonnet, ["slightly_above"]);
  if (weeklyAbove) {
    return rec(
      "slightly_above",
      "Weekly limit is the bottleneck",
      "Your session has room, but weekly usage is a bit ahead of pace. The weekly limit is the more likely constraint this week.",
      weeklyAbove.type,
      "weekly_bottleneck",
      labelForBottleneck(weeklyAbove),
    );
  }

  // 6. Clear headroom: session under pace and everything else healthy.
  const sessionUnder = session
    ? session.status === "under_pace"
    : weekly?.status === "under_pace";
  if (sessionUnder && isHealthy(weekly) && isHealthy(sonnet)) {
    const bothUnder =
      (session?.status === "under_pace" || !session) &&
      (weekly?.status === "under_pace" || !weekly);
    const body = bothUnder
      ? "You're below target usage for both session and weekly limits. Large Claude Code tasks can still drain usage quickly, especially with long context."
      : "You're below target usage for this session and within pace for the week. Large Claude Code tasks can still drain usage quickly, especially with long context.";
    return rec("under_pace", "Good window for heavy work", body, "none", "under_pace");
  }

  // 7. On track / mixed-but-healthy fallback.
  return rec(
    session?.status ?? weekly?.status ?? "on_track",
    "Normal usage is fine",
    "Usage is tracking roughly with the time elapsed. Normal coding and review work is fine — keep an eye on long contexts.",
    "none",
    "on_track",
  );
}

// State-based task guidance. Copy is intentionally action-oriented and avoids
// any claim of exact remaining messages or tokens.
const GUIDANCE: Record<GuidanceMode, TaskGuidanceItem[]> = {
  under_pace: [
    { heading: "Good for", body: "Small questions · Debugging · One focused Claude Code task" },
    { heading: "Before a large task", body: "Run /clear, then give a focused task brief." },
  ],
  on_track: [
    { heading: "Good for", body: "Normal coding and review tasks" },
    {
      heading: "Before a large task",
      body: "Start fresh if the current conversation has lots of old context.",
    },
  ],
  slightly_above: [
    { heading: "Use carefully", body: "Prefer smaller prompts and short debugging loops." },
    { heading: "Before continuing", body: "Run /compact or /clear to reduce old context." },
  ],
  at_risk: [
    { heading: "Avoid for now", body: "Long agentic Claude Code runs and large refactors." },
    {
      heading: "Better move",
      body: "Wait for reset, or use Claude only for high-value short tasks.",
    },
  ],
  weekly_bottleneck: [
    { heading: "Save usage for", body: "High-value coding tasks and important reviews." },
    { heading: "Avoid", body: "Long exploratory agent runs until the weekly reset." },
  ],
  unavailable: [],
};

/**
 * Build the task-guidance card content for a guidance mode, or null when there
 * is nothing useful to show (the "unavailable" state).
 */
export function taskGuidanceFor(mode: GuidanceMode): TaskGuidance | null {
  const items = GUIDANCE[mode];
  return items.length ? { mode, items } : null;
}
