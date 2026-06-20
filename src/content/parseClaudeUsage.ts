// Resilient, text-first parser for Claude's Settings > Usage page.
//
// Claude's class names are volatile, so we never rely on them. Instead we walk
// text nodes, reconstruct logical lines, segment them into the known usage
// sections by their (start-anchored) headers, and extract values with regexes.
// Missing sections degrade gracefully to partial data.

import type { ClaudeLimitSnapshot, ClaudeLimitType } from "../types/usage";
import {
  parseResetIn,
  parseWeeklyReset,
  percentRegex,
} from "../core/timeWindows";

type SectionKind = ClaudeLimitType | "weekly_group";

type Section = {
  kind: SectionKind;
  label: string;
  lines: string[];
};

// Start-anchored so a body line like "You haven't used Sonnet yet" is NOT
// mistaken for the "Sonnet only" header.
const HEADERS: Array<{ kind: SectionKind; label: string; re: RegExp }> = [
  { kind: "current_session", label: "Current session", re: /^current session\b/i },
  { kind: "weekly_group", label: "Weekly limits", re: /^weekly limits?\b/i },
  { kind: "weekly_all_models", label: "All models", re: /^all models\b/i },
  { kind: "weekly_sonnet", label: "Sonnet", re: /^sonnet\b/i },
];

/**
 * Collect logical text lines from an element. Each text node is split on
 * newlines and inner whitespace is collapsed, so the result is robust whether
 * the page renders each label in its own element (real Claude) or as a single
 * multi-line text node (tests).
 */
export function collectLines(root: HTMLElement): string[] {
  const lines: string[] = [];
  if (typeof document === "undefined" || !root) return lines;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const raw = node.textContent ?? "";
    for (const seg of raw.split(/\n+/)) {
      const s = seg.replace(/\s+/g, " ").trim();
      if (s) lines.push(s);
    }
    node = walker.nextNode();
  }
  return lines;
}

function matchHeader(line: string): { kind: SectionKind; label: string } | null {
  for (const h of HEADERS) {
    if (h.re.test(line)) return { kind: h.kind, label: h.label };
  }
  return null;
}

/** Segment collected lines into usage sections keyed by header. */
export function parseSections(root: HTMLElement): Section[] {
  const lines = collectLines(root);
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const header = matchHeader(line);
    if (header) {
      current = { kind: header.kind, label: header.label, lines: [line] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
    // Lines before the first header (page chrome) are ignored.
  }
  return sections;
}

function sectionText(s: Section): string {
  return s.lines.join("\n");
}

function extractUsedPct(s: Section): number | null {
  const blob = sectionText(s);
  const m = blob.match(percentRegex);
  if (m) return parseFloat(m[1]);
  // "You haven't used Sonnet yet" → treat as 0%.
  if (/you\s*haven'?t\s+used[\s\S]*?yet/i.test(blob)) return 0;
  return null;
}

function extractResetLine(s: Section): string | null {
  return s.lines.find((l) => /^resets\b/i.test(l)) ?? null;
}

function firstOfKind(sections: Section[], kind: SectionKind): Section | undefined {
  return sections.find((s) => s.kind === kind);
}

function snapshot(
  type: ClaudeLimitType,
  label: string,
  usedPct: number,
  resetLabel: string,
  resetAt: number | undefined,
  capturedAt: number,
): ClaudeLimitSnapshot {
  const clampedUsed = Math.max(0, usedPct);
  return {
    type,
    label,
    usedPct: clampedUsed,
    remainingPct: Math.max(0, Math.min(100, 100 - clampedUsed)),
    resetLabel,
    resetAt,
    active: true,
    capturedAt,
  };
}

/** Parse the "Current session" 5-hour bucket. */
export function parseCurrentSession(
  root: HTMLElement,
  now: number = Date.now(),
): ClaudeLimitSnapshot | null {
  const section = firstOfKind(parseSections(root), "current_session");
  if (!section) return null;
  const used = extractUsedPct(section);
  if (used === null) return null;

  const resetLine = extractResetLine(section);
  const remainingMs = parseResetIn(sectionText(section));
  const resetAt = remainingMs !== null ? now + remainingMs : undefined;
  return snapshot(
    "current_session",
    "Current session",
    used,
    resetLine ?? "Resets in —",
    resetAt,
    now,
  );
}

/** Parse the weekly "All models" bucket. */
export function parseWeeklyAllModels(
  root: HTMLElement,
  now: number = Date.now(),
): ClaudeLimitSnapshot | null {
  const section = firstOfKind(parseSections(root), "weekly_all_models");
  if (!section) return null;
  const used = extractUsedPct(section);
  if (used === null) return null;

  const resetLine = extractResetLine(section);
  const resetAt = resetLine ? (parseWeeklyReset(resetLine, now) ?? undefined) : undefined;
  return snapshot(
    "weekly_all_models",
    "Weekly · all models",
    used,
    resetLine ?? "Weekly reset",
    resetAt,
    now,
  );
}

/**
 * Parse the weekly "Sonnet only" bucket. When the Sonnet section has no reset
 * text of its own, callers may supply the weekly all-models reset as a fallback.
 */
export function parseWeeklySonnet(
  root: HTMLElement,
  now: number = Date.now(),
  inherited?: { resetLabel: string; resetAt?: number },
): ClaudeLimitSnapshot | null {
  const section = firstOfKind(parseSections(root), "weekly_sonnet");
  if (!section) return null;
  const used = extractUsedPct(section) ?? 0;

  const resetLine = extractResetLine(section);
  let resetLabel = resetLine ?? inherited?.resetLabel ?? "Weekly reset";
  let resetAt = resetLine
    ? (parseWeeklyReset(resetLine, now) ?? undefined)
    : inherited?.resetAt;
  if (resetAt === undefined && inherited?.resetAt !== undefined) {
    resetAt = inherited.resetAt;
    if (!resetLine) resetLabel = inherited.resetLabel;
  }

  return snapshot("weekly_sonnet", "Weekly · Sonnet", used, resetLabel, resetAt, now);
}

/**
 * Parse all available usage buckets from the page. Returns whatever could be
 * found (possibly empty). Sonnet inherits the all-models weekly reset when it
 * has none of its own.
 */
export function parseUsagePage(
  root: HTMLElement,
  now: number = Date.now(),
): ClaudeLimitSnapshot[] {
  const sections = parseSections(root);
  const out: ClaudeLimitSnapshot[] = [];

  const sessionSection = firstOfKind(sections, "current_session");
  if (sessionSection) {
    const used = extractUsedPct(sessionSection);
    if (used !== null) {
      const resetLine = extractResetLine(sessionSection);
      const remainingMs = parseResetIn(sectionText(sessionSection));
      out.push(
        snapshot(
          "current_session",
          "Current session",
          used,
          resetLine ?? "Resets in —",
          remainingMs !== null ? now + remainingMs : undefined,
          now,
        ),
      );
    }
  }

  const allSection = firstOfKind(sections, "weekly_all_models");
  let weeklyResetLabel = "Weekly reset";
  let weeklyResetAt: number | undefined;
  if (allSection) {
    const used = extractUsedPct(allSection);
    if (used !== null) {
      const resetLine = extractResetLine(allSection);
      weeklyResetLabel = resetLine ?? weeklyResetLabel;
      weeklyResetAt = resetLine ? (parseWeeklyReset(resetLine, now) ?? undefined) : undefined;
      out.push(
        snapshot(
          "weekly_all_models",
          "Weekly · all models",
          used,
          weeklyResetLabel,
          weeklyResetAt,
          now,
        ),
      );
    }
  }

  const sonnetSection = firstOfKind(sections, "weekly_sonnet");
  if (sonnetSection) {
    const used = extractUsedPct(sonnetSection) ?? 0;
    const resetLine = extractResetLine(sonnetSection);
    const resetLabel = resetLine ?? weeklyResetLabel;
    const resetAt = resetLine ? (parseWeeklyReset(resetLine, now) ?? undefined) : weeklyResetAt;
    out.push(
      snapshot(
        "weekly_sonnet",
        "Weekly · Sonnet",
        used,
        resetLabel,
        resetAt ?? weeklyResetAt,
        now,
      ),
    );
  }

  return out;
}

/** True when the given element appears to contain Claude usage content. */
export function looksLikeUsageContent(root: HTMLElement | null): boolean {
  if (!root) return false;
  const sections = parseSections(root);
  return sections.some(
    (s) => s.kind === "current_session" || s.kind === "weekly_all_models",
  );
}
