import type { ReactNode } from "react";
import type { ClaudePaceInsight } from "../types/usage";
import type { TopRecommendation } from "../core/statusRules";
import { formatAgo } from "../core/formatters";
import { RecommendationCard } from "./RecommendationCard";
import { LimitCard } from "./LimitCard";

export type UsagePacePanelProps = {
  insights: ClaudePaceInsight[];
  recommendation: TopRecommendation;
  tips: string[];
  compact: boolean;
  lastObservedAt?: number;
  onOpenOptions?: () => void;
};

/** Wrap slash-commands (e.g. /clear) in <code> for readability. */
function renderTip(text: string): ReactNode[] {
  return text.split(/(\/[a-z]+)/g).map((part, i) =>
    /^\/[a-z]+$/.test(part) ? <code key={i}>{part}</code> : <span key={i}>{part}</span>,
  );
}

/** Top-level injected dashboard. */
export function UsagePacePanel({
  insights,
  recommendation,
  tips,
  compact,
  lastObservedAt,
  onOpenOptions,
}: UsagePacePanelProps) {
  const empty = insights.length === 0;
  const weeklyCount = insights.filter((i) => i.type !== "current_session").length;
  const useColumns = weeklyCount >= 2;

  return (
    <div className={`cup ${compact ? "compact" : ""}`}>
      <div className="cup-header">
        <div className="cup-brand">
          <span className="cup-logo" aria-hidden="true" />
          <span className="cup-title">Claude Usage Pace</span>
        </div>
        <div className="cup-actions">
          {onOpenOptions ? (
            <button
              type="button"
              className="cup-iconbtn"
              onClick={onOpenOptions}
              title="Open options"
            >
              ⚙ Options
            </button>
          ) : null}
        </div>
      </div>

      {empty ? (
        <div className="cup-empty">Usage data not found on this page.</div>
      ) : (
        <>
          <RecommendationCard
            status={recommendation.status}
            title={recommendation.title}
            body={recommendation.body}
          />

          <div className={`cup-grid ${useColumns ? "cols" : ""}`}>
            {insights.map((insight) => (
              <LimitCard key={insight.type} insight={insight} />
            ))}
          </div>

          {tips.length > 0 ? (
            <div className="cup-tips">
              <div className="cup-tips-title">Suggestion</div>
              <ul>
                {tips.map((tip, i) => (
                  <li key={i}>{renderTip(tip)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="cup-footer">
            <span>Local-only · nothing leaves your browser</span>
            {lastObservedAt ? <span>Updated {formatAgo(lastObservedAt)}</span> : null}
          </div>
        </>
      )}
    </div>
  );
}
