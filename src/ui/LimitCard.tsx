import type { ClaudePaceInsight } from "../types/usage";
import {
  formatDuration,
  formatPaceGap,
  formatPct,
  formatRatePerDay,
  formatRatePerHour,
} from "../core/formatters";
import { MiniBar } from "./MiniBar";
import { MetricGrid, type Metric } from "./MetricGrid";

/** One usage bucket: headline remaining %, reset, pace marker and metrics. */
export function LimitCard({ insight }: { insight: ClaudePaceInsight }) {
  const isSession = insight.type === "current_session";

  const metrics: Metric[] = [];
  if (insight.paceGapPct !== undefined) {
    metrics.push({ label: "Pace", value: formatPaceGap(insight.paceGapPct) });
  }
  if (isSession) {
    if (insight.safeRatePctPerHour !== undefined) {
      metrics.push({ label: "Safe pace", value: formatRatePerHour(insight.safeRatePctPerHour) });
    }
  } else if (insight.safeRatePctPerWorkday !== undefined) {
    metrics.push({ label: "Daily budget", value: formatRatePerDay(insight.safeRatePctPerWorkday) });
  }
  if (insight.projectedUnusedPct !== undefined) {
    metrics.push({ label: "Projected unused", value: `~${formatPct(insight.projectedUnusedPct)}` });
  }

  const resetText =
    isSession && insight.remainingMs !== undefined
      ? `Resets in ${formatDuration(insight.remainingMs)}`
      : insight.resetLabel;

  return (
    <div className={`cup-card ${isSession ? "session" : ""}`} data-status={insight.status}>
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
      {insight.recommendation ? <div className="cup-card-note">{insight.recommendation}</div> : null}
    </div>
  );
}
