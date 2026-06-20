import type { ClaudePaceInsight } from "../types/usage";
import {
  formatClockTime,
  formatDuration,
  formatPaceGap,
  formatPct,
  formatRatePerDay,
  formatRatePerHour,
} from "../core/formatters";
import { MiniBar } from "./MiniBar";
import { MetricGrid, type Metric } from "./MetricGrid";
import { InfoTip, TOOLTIPS } from "./InfoTip";

/** One usage bucket: headline remaining %, reset, pace marker and metrics. */
export function LimitCard({ insight }: { insight: ClaudePaceInsight }) {
  const isSession = insight.type === "current_session";

  const metrics: Metric[] = [];
  if (insight.paceGapPct !== undefined) {
    metrics.push({ label: "Pace", value: formatPaceGap(insight.paceGapPct), tip: TOOLTIPS.pace });
  }
  // Safe pace / daily budget are only meaningful with a known reset time.
  if (isSession) {
    if (insight.safeRatePctPerHour !== undefined) {
      metrics.push({
        label: "Safe pace",
        value: formatRatePerHour(insight.safeRatePctPerHour),
        tip: TOOLTIPS.safePace,
      });
    }
  } else if (insight.safeRatePctPerWorkday !== undefined) {
    metrics.push({
      label: "Daily budget",
      value: formatRatePerDay(insight.safeRatePctPerWorkday),
      tip: TOOLTIPS.dailyBudget,
    });
  }

  // Session shows the countdown plus the actual local reset time (the weekly
  // cards already carry an absolute "Resets <Day> <time>" label).
  const sessionClock =
    isSession && insight.resetAt !== undefined ? formatClockTime(insight.resetAt) : "";
  const resetText =
    isSession && insight.remainingMs !== undefined
      ? `Resets in ${formatDuration(insight.remainingMs)}${sessionClock ? ` · ${sessionClock}` : ""}`
      : insight.resetLabel;

  return (
    <div
      className={`cup-card ${isSession ? "session" : ""}`}
      data-status={insight.status}
    >
      <div className="cup-card-head">
        <span className="cup-card-label">{insight.label}</span>
        <span className="cup-card-used">{formatPct(insight.usedPct)} used</span>
      </div>
      <div className="cup-card-headline">
        <span className="cup-big">{formatPct(insight.remainingPct)}</span>
        <span className="cup-reset">left · {resetText}</span>
      </div>
      <MiniBar usedPct={insight.usedPct} expectedPct={insight.expectedPct} status={insight.status} />
      <MetricGrid metrics={metrics} />
      {insight.projectedUnusedPct !== undefined ? (
        <div className="cup-unused">
          <span className="cup-metric-label">
            Unused if pace continues
            <InfoTip label="Unused if pace continues" text={TOOLTIPS.unused} />
          </span>
          <span className="cup-unused-value">~{formatPct(insight.projectedUnusedPct)}</span>
        </div>
      ) : null}
      {insight.recommendation ? (
        <span className="cup-sr-only">{insight.recommendation}</span>
      ) : null}
    </div>
  );
}
