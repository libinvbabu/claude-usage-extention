// Display formatters. Kept separate so UI stays declarative and these can be
// unit tested without React.

import type { PaceStatus } from "../types/usage";

/** "9%" / "12.5%" — drops the trailing ".0". */
export function formatPct(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

/** "3h 31m" / "31m" / "2h" / "now". */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms <= 0) return "now";
  const totalMin = Math.round(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 && days === 0) parts.push(`${mins}m`);
  return parts.length ? parts.join(" ") : "now";
}

/** "~26% / hr". */
export function formatRatePerHour(pctPerHour: number | undefined): string {
  if (pctPerHour === undefined || !Number.isFinite(pctPerHour)) return "—";
  return `~${formatPct(pctPerHour)} / hr`;
}

/** "~14% / day". */
export function formatRatePerDay(pctPerDay: number | undefined): string {
  if (pctPerDay === undefined || !Number.isFinite(pctPerDay)) return "—";
  return `~${formatPct(pctPerDay)} / day`;
}

/**
 * Signed pace gap as plain language.
 *  gap = used - expected.  Negative = under pace (good), positive = over.
 */
export function formatPaceGap(gap: number | undefined): string {
  if (gap === undefined || !Number.isFinite(gap)) return "—";
  const pts = Math.abs(Math.round(gap));
  if (pts === 0) return "right on pace";
  return gap < 0 ? `${pts} pts under pace` : `${pts} pts over pace`;
}

/** Human label for a pace status, used on the status pill. */
export function statusLabel(status: PaceStatus): string {
  switch (status) {
    case "under_pace":
      return "Under pace";
    case "on_track":
      return "On track";
    case "slightly_above":
      return "Slightly above";
    case "at_risk":
      return "At risk";
    case "exhausted":
      return "Exhausted";
    default:
      return "Unknown";
  }
}

/** "5s ago" / "3m ago" / "2h ago". */
export function formatAgo(fromMs: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - fromMs);
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}
