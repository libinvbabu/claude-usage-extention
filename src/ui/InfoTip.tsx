// Accessible info tooltip. The trigger is a real <button> so it is reachable by
// keyboard; the bubble shows on hover and on focus (CSS :focus-within), and the
// full explanation is exposed to assistive tech via the button's aria-label
// (the visual bubble is aria-hidden to avoid double announcement).

/** Tooltip copy for every calculated metric, shared across cards. */
export const TOOLTIPS = {
  safePace:
    "How much of this limit you can use per hour before the reset, based on visible percentage left.",
  unused:
    "Estimated unused capacity if your current burn rate stays similar. This is not a guarantee.",
  pace: "Compares your current usage percentage against a linear pace through the reset window.",
  dailyBudget:
    "Approximate percent you can use per remaining workday before the weekly reset.",
  bottleneck: "The limit most likely to constrain your next heavy Claude task.",
} as const;

export function InfoTip({ label, text }: { label: string; text: string }) {
  return (
    <span className="cup-tip">
      <button type="button" className="cup-tip-btn" aria-label={`${label}: ${text}`}>
        <span aria-hidden="true">ⓘ</span>
      </button>
      <span role="tooltip" aria-hidden="true" className="cup-tip-bubble">
        {text}
      </span>
    </span>
  );
}
