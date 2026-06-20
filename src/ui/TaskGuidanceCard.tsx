import type { ReactNode } from "react";
import type { TaskGuidance } from "../core/statusRules";

/** Wrap slash-commands (e.g. /clear) in <code> for readability. */
function withCode(text: string): ReactNode[] {
  return text.split(/(\/[a-z]+)/g).map((part, i) =>
    /^\/[a-z]+$/.test(part) ? <code key={i}>{part}</code> : <span key={i}>{part}</span>,
  );
}

/** State-based "what's a good use of Claude right now" guidance. */
export function TaskGuidanceCard({ guidance }: { guidance: TaskGuidance }) {
  return (
    <section className="cup-guidance" aria-label="Task guidance">
      {guidance.items.map((item) => (
        <div className="cup-guidance-item" key={item.heading}>
          <div className="cup-guidance-heading">{item.heading}</div>
          <div className="cup-guidance-body">{withCode(item.body)}</div>
        </div>
      ))}
    </section>
  );
}
