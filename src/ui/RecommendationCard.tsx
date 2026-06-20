import type { PaceStatus } from "../types/usage";
import { statusLabel } from "../core/formatters";

type Props = {
  status: PaceStatus;
  title: string;
  body: string;
};

/** The single headline recommendation, with a status pill. */
export function RecommendationCard({ status, title, body }: Props) {
  return (
    <div className="cup-rec" data-status={status}>
      <div className="cup-rec-top">
        <span className="cup-pill" data-status={status}>
          {statusLabel(status)}
        </span>
        <span className="cup-rec-title">{title}</span>
      </div>
      <div className="cup-rec-body">{body}</div>
    </div>
  );
}
