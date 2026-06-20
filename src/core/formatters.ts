// Display formatters. Kept separate so UI stays declarative and these can be
// unit tested without React.

import type { PaceStatus } from "../types/usage";

/** "9%" / "12.5%" — drops the trailing ".0". For rates/projections. */
export function formatPct(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

/**
 * Integer percentage for headline figures ("91% left", "9% used"), clamped to
 * 0–100 so a stray reading can never render an out-of-range or non-finite value.
 */
export function formatPctInt(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "—";
  const clamped = Math.min(100, Math.max(0, n));
  return `${Math.round(clamped)}%`;
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Local clock time for an absolute reset, in Claude's 12-hour style ("5:30 PM").
 * If the reset falls on a different local calendar day than `now` (e.g. a session
 * that crosses midnight), the weekday is prepended ("Tue 2:30 AM") so it stays
 * unambiguous — matching the weekly cards' "Resets Wed 3:30 AM" format.
 */
export function formatClockTime(
  epochMs: number | undefined,
  now: number = Date.now(),
): string {
  if (epochMs === undefined || !Number.isFinite(epochMs)) return "";
  const d = new Date(epochMs);
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const time = `${hours}:${d.getMinutes().toString().padStart(2, "0")} ${ampm}`;

  const n = new Date(now);
  const sameDay =
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate();
  return sameDay ? time : `${WEEKDAYS[d.getDay()]} ${time}`;
}

/**
 * Session reset line combining the absolute clock time and the relative
 * countdown, in that order: "Resets 6:29 PM · in 3h 30m". Degrades to whichever
 * half is available ("Resets in 3h 30m" / "Resets 6:29 PM"), and returns "" when
 * neither is — callers fall back to the raw label. Never produces "undefined",
 * "NaN", awkward "in now" phrasing, or a dangling separator.
 */
export function formatSessionReset(
  resetAt: number | undefined,
  remainingMs: number | undefined,
  now: number = Date.now(),
): string {
  const absolute = formatClockTime(resetAt, now); // "" when unknown
  const relRaw =
    remainingMs !== undefined && Number.isFinite(remainingMs) && remainingMs > 0
      ? formatDuration(remainingMs)
      : "";
  const relative = relRaw === "now" ? "" : relRaw;

  if (absolute && relative) return `Resets ${absolute} · in ${relative}`;
  if (relative) return `Resets in ${relative}`;
  if (absolute) return `Resets ${absolute}`;
  return "";
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

/**
 * Human label for a pace status, used on the status pill. Deliberately avoids
 * the internal "under_pace" jargon — users see "Has headroom" instead.
 */
export function statusLabel(status: PaceStatus): string {
  switch (status) {
    case "under_pace":
      return "Has headroom";
    case "on_track":
      return "On track";
    case "slightly_above":
      return "Use carefully";
    case "at_risk":
      return "At risk";
    case "exhausted":
      return "Wait for reset";
    default:
      return "Usage unavailable";
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

/** "just now" within the first few seconds, otherwise the relative form. */
export function formatLastRead(fromMs: number | undefined, now: number = Date.now()): string {
  if (fromMs === undefined || !Number.isFinite(fromMs)) return "—";
  if (now - fromMs < 10_000) return "just now";
  return formatAgo(fromMs, now);
}
