// User preferences, persisted in chrome.storage.local under a single key.

import type { UserPreferences } from "../types/usage";
import { onStorageChanged, storageGet, storageSet } from "./chromeStorage";

export const PREFERENCES_KEY = "claudeUsagePace.preferences";

export const DEFAULT_PREFERENCES: UserPreferences = {
  workingDays: [1, 2, 3, 4, 5], // Mon–Fri
  workingHoursStart: "09:00",
  workingHoursEnd: "18:00",
  showClaudeCodeTips: true,
  compactMode: false,
};

/** Merge stored prefs over defaults, sanitising bad values. */
export function normalizePreferences(input: Partial<UserPreferences> | undefined): UserPreferences {
  const p = { ...DEFAULT_PREFERENCES, ...(input ?? {}) };
  const days = Array.isArray(p.workingDays)
    ? Array.from(new Set(p.workingDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)))
    : DEFAULT_PREFERENCES.workingDays;
  return {
    workingDays: days.length ? days.sort((a, b) => a - b) : DEFAULT_PREFERENCES.workingDays,
    workingHoursStart: /^\d{1,2}:\d{2}$/.test(p.workingHoursStart)
      ? p.workingHoursStart
      : DEFAULT_PREFERENCES.workingHoursStart,
    workingHoursEnd: /^\d{1,2}:\d{2}$/.test(p.workingHoursEnd)
      ? p.workingHoursEnd
      : DEFAULT_PREFERENCES.workingHoursEnd,
    showClaudeCodeTips: Boolean(p.showClaudeCodeTips),
    compactMode: Boolean(p.compactMode),
  };
}

export async function loadPreferences(): Promise<UserPreferences> {
  const stored = await storageGet<Partial<UserPreferences>>(PREFERENCES_KEY);
  return normalizePreferences(stored);
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  await storageSet(PREFERENCES_KEY, normalizePreferences(prefs));
}

/** Subscribe to preference changes (e.g. from the options page). */
export function onPreferencesChanged(cb: (prefs: UserPreferences) => void): () => void {
  return onStorageChanged(PREFERENCES_KEY, (value) => {
    cb(normalizePreferences(value as Partial<UserPreferences> | undefined));
  });
}
