import { InfoTip } from "./InfoTip";

export type Metric = {
  label: string;
  value: string;
  /** Optional tooltip explaining how the metric is calculated. */
  tip?: string;
};

/** A compact two-column grid of label/value metrics, with optional tooltips. */
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  if (metrics.length === 0) return null;
  return (
    <div className="cup-metrics">
      {metrics.map((m) => (
        <div className="cup-metric" key={m.label}>
          <span className="cup-metric-label">
            {m.label}
            {m.tip ? <InfoTip label={m.label} text={m.tip} /> : null}
          </span>
          <span className="cup-metric-value">{m.value}</span>
        </div>
      ))}
    </div>
  );
}
