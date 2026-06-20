import type { PaceStatus } from "../types/usage";
import { clamp } from "../core/timeWindows";

type Props = {
  usedPct: number;
  /** Where the "expected" pace line sits (elapsed %); drawn as a marker. */
  expectedPct?: number;
  status?: PaceStatus;
};

/** A thin used-vs-expected progress bar with an optional pace marker. */
export function MiniBar({ usedPct, expectedPct, status }: Props) {
  const fill = clamp(usedPct, 0, 100);
  const showMarker = expectedPct !== undefined && Number.isFinite(expectedPct);
  const label = showMarker
    ? `${Math.round(fill)}% used; linear pace target ${Math.round(clamp(expectedPct as number, 0, 100))}%`
    : `${Math.round(fill)}% used`;
  return (
    <div className="cup-bar" data-status={status} role="img" aria-label={label}>
      <div className="cup-bar-fill" style={{ width: `${fill}%` }} />
      {showMarker && (
        <div
          className="cup-bar-marker"
          style={{ left: `${clamp(expectedPct as number, 0, 100)}%` }}
          title={`Linear pace target (~${Math.round(expectedPct as number)}%)`}
        />
      )}
    </div>
  );
}
