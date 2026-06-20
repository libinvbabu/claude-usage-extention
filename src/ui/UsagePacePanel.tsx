import type { ClaudePaceInsight } from "../types/usage";
import type { TaskGuidance, TopRecommendation } from "../core/statusRules";
import { formatLastRead } from "../core/formatters";
import { RecommendationCard } from "./RecommendationCard";
import { LimitCard } from "./LimitCard";
import { TaskGuidanceCard } from "./TaskGuidanceCard";

export type UsagePacePanelProps = {
  insights: ClaudePaceInsight[];
  recommendation: TopRecommendation;
  /** Task guidance card content, or null when Claude Code tips are disabled. */
  guidance: TaskGuidance | null;
  compact: boolean;
  /** Whether to show the internal parser-debug panel. */
  showDebug: boolean;
  /** One line per expected bucket: what the parser found (or "not found"). */
  debugLines: string[];
  /** When the page was last read (epoch ms). */
  lastReadAt?: number;
  onOpenOptions?: () => void;
  onReread?: () => void;
};

function Footer({
  lastReadAt,
  onReread,
}: {
  lastReadAt?: number;
  onReread?: () => void;
}) {
  return (
    <footer className="cup-footer">
      <div className="cup-footer-note">Based on Claude's visible usage bars. Local-only.</div>
      <div className="cup-footer-actions">
        <span className="cup-footer-read">Last read from page: {formatLastRead(lastReadAt)}</span>
        {onReread ? (
          <button type="button" className="cup-btn cup-btn-sm" onClick={onReread}>
            Re-read
          </button>
        ) : null}
      </div>
    </footer>
  );
}

function ErrorCard({ onReread }: { onReread?: () => void }) {
  return (
    <section className="cup-error" aria-label="Usage unavailable">
      <p className="cup-error-text">
        Claude Usage Pace couldn't read usage yet. Open Claude's Usage settings, or click Re-read
        after the page finishes loading.
      </p>
      {onReread ? (
        <button type="button" className="cup-btn" onClick={onReread}>
          Re-read
        </button>
      ) : null}
    </section>
  );
}

function DebugPanel({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <details className="cup-debug">
      <summary>Parser debug</summary>
      <ul>
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </details>
  );
}

/** Top-level injected dashboard. */
export function UsagePacePanel({
  insights,
  recommendation,
  guidance,
  compact,
  showDebug,
  debugLines,
  lastReadAt,
  onOpenOptions,
  onReread,
}: UsagePacePanelProps) {
  const empty = insights.length === 0;
  const session = insights.filter((i) => i.type === "current_session");
  const weekly = insights.filter((i) => i.type !== "current_session");

  return (
    <div className={`cup ${compact ? "compact" : ""}`}>
      <header className="cup-header">
        <div className="cup-brand">
          <span className="cup-logo" aria-hidden="true" />
          <span className="cup-title">Claude Usage Pace</span>
        </div>
        {onOpenOptions ? (
          <button
            type="button"
            className="cup-iconbtn"
            onClick={onOpenOptions}
            aria-label="Open Claude Usage Pace options"
          >
            Options
          </button>
        ) : null}
      </header>

      {empty ? (
        <ErrorCard onReread={onReread} />
      ) : (
        <>
          <RecommendationCard
            status={recommendation.status}
            title={recommendation.title}
            body={recommendation.body}
            bottleneckLabel={recommendation.bottleneckLabel}
          />

          {session.map((insight) => (
            <LimitCard key={insight.type} insight={insight} />
          ))}

          {weekly.length > 0 ? (
            <div className={`cup-weekly ${weekly.length >= 2 ? "cols" : ""}`}>
              {weekly.map((insight) => (
                <LimitCard key={insight.type} insight={insight} />
              ))}
            </div>
          ) : null}

          {guidance ? <TaskGuidanceCard guidance={guidance} /> : null}

          <Footer lastReadAt={lastReadAt} onReread={onReread} />
        </>
      )}

      {showDebug ? <DebugPanel lines={debugLines} /> : null}
    </div>
  );
}
