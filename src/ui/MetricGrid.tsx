export type Metric = {
  label: string;
  value: string;
};

/** A compact two-column grid of label/value metrics. */
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  if (metrics.length === 0) return null;
  return (
    <div className="cup-metrics">
      {metrics.map((m) => (
        <div className="cup-metric" key={m.label}>
          <span className="cup-metric-label">{m.label}</span>
          <span className="cup-metric-value">{m.value}</span>
        </div>
      ))}
    </div>
  );
}
