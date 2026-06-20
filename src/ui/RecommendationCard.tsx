import type { PaceStatus } from "../types/usage";
import { statusLabel } from "../core/formatters";
import { InfoTip, TOOLTIPS } from "./InfoTip";

type Props = {
  status: PaceStatus;
  title: string;
  body: string;
  bottleneckLabel: string;
};

/** The single headline recommendation: status pill, careful copy, bottleneck. */
export function RecommendationCard({ status, title, body, bottleneckLabel }: Props) {
  return (
    <section className="cup-rec" data-status={status} aria-label="Top recommendation">
      <div className="cup-rec-top">
        <span className="cup-pill" data-status={status}>
          {statusLabel(status)}
        </span>
        <span className="cup-rec-title">{title}</span>
      </div>
      <p className="cup-rec-body">{body}</p>
      <div className="cup-rec-bottleneck">
        <span className="cup-rec-bottleneck-label">
          Current bottleneck
          <InfoTip label="Current bottleneck" text={TOOLTIPS.bottleneck} />
        </span>
        <span className="cup-rec-bottleneck-value">{bottleneckLabel}</span>
      </div>
    </section>
  );
}
