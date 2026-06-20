import { useEffect, useMemo, useState } from "react";
import type { UserPreferences } from "../types/usage";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
} from "../storage/preferences";
import {
  clearHistory,
  loadHistory,
  summarizeHistory,
  type HistorySummary,
} from "../storage/localHistory";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Preset = "mon-fri" | "mon-sat" | "all" | "custom";

const PRESETS: Record<Exclude<Preset, "custom">, number[]> = {
  "mon-fri": [1, 2, 3, 4, 5],
  "mon-sat": [1, 2, 3, 4, 5, 6],
  all: [0, 1, 2, 3, 4, 5, 6],
};

function sameDays(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function detectPreset(days: number[]): Preset {
  for (const [name, value] of Object.entries(PRESETS)) {
    if (sameDays(days, value)) return name as Preset;
  }
  return "custom";
}

export function OptionsPage() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const [summary, setSummary] = useState<HistorySummary | null>(null);

  const preset = useMemo(() => detectPreset(prefs.workingDays), [prefs.workingDays]);

  useEffect(() => {
    void (async () => {
      setPrefs(await loadPreferences());
      setSummary(summarizeHistory(await loadHistory()));
      setLoaded(true);
    })();
  }, []);

  // Persist whenever prefs change (after initial load).
  useEffect(() => {
    if (!loaded) return;
    void savePreferences(prefs);
    setSavedNote("All changes saved");
    const t = setTimeout(() => setSavedNote(""), 1500);
    return () => clearTimeout(t);
  }, [prefs, loaded]);

  const update = (patch: Partial<UserPreferences>) => setPrefs((p) => ({ ...p, ...patch }));

  const applyPreset = (name: Preset) => {
    if (name === "custom") {
      update({ workingDays: prefs.workingDays });
    } else {
      update({ workingDays: PRESETS[name] });
    }
  };

  const toggleDay = (day: number) => {
    const set = new Set(prefs.workingDays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    update({ workingDays: Array.from(set).sort((a, b) => a - b) });
  };

  const onResetHistory = async () => {
    await clearHistory();
    setSummary(summarizeHistory([]));
    setSavedNote("Local history cleared");
    setTimeout(() => setSavedNote(""), 1500);
  };

  return (
    <div className="opt-wrap">
      <div className="opt-head">
        <span className="opt-logo" aria-hidden="true" />
        <span className="opt-title">Claude Usage Pace</span>
      </div>
      <p className="opt-subtitle">
        Pacing preferences. Everything is stored locally in your browser — nothing is
        ever sent anywhere.
      </p>

      <section className="opt-card">
        <h2>Working days</h2>
        <p className="opt-hint">
          Weekly pacing is spread across the days you actually work, so the “daily
          budget” reflects real availability.
        </p>
        <div className="opt-segment">
          {(["mon-fri", "mon-sat", "all", "custom"] as Preset[]).map((name) => (
            <button
              key={name}
              type="button"
              className={`opt-seg-btn ${preset === name ? "active" : ""}`}
              onClick={() => applyPreset(name)}
            >
              {name === "mon-fri"
                ? "Mon–Fri"
                : name === "mon-sat"
                  ? "Mon–Sat"
                  : name === "all"
                    ? "Every day"
                    : "Custom"}
            </button>
          ))}
        </div>
        <div className="opt-days">
          {DAY_NAMES.map((label, idx) => (
            <label className="opt-day" key={label}>
              <input
                type="checkbox"
                checked={prefs.workingDays.includes(idx)}
                onChange={() => toggleDay(idx)}
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="opt-card">
        <h2>Working hours</h2>
        <p className="opt-hint">Used to estimate remaining working time before a weekly reset.</p>
        <div className="opt-times">
          <div className="opt-field">
            <label htmlFor="start">Start</label>
            <input
              id="start"
              type="time"
              value={prefs.workingHoursStart}
              onChange={(e) => update({ workingHoursStart: e.target.value })}
            />
          </div>
          <div className="opt-field">
            <label htmlFor="end">End</label>
            <input
              id="end"
              type="time"
              value={prefs.workingHoursEnd}
              onChange={(e) => update({ workingHoursEnd: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="opt-card">
        <h2>Display</h2>
        <p className="opt-hint">Tune what the in-page panel shows.</p>
        <div className="opt-row">
          <div>
            <div className="opt-row-label">Show Claude Code tips</div>
            <div className="opt-row-desc">
              Suggest <code>/clear</code> / <code>/compact</code> and pacing advice.
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={prefs.showClaudeCodeTips}
              onChange={(e) => update({ showClaudeCodeTips: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>
        <div className="opt-row">
          <div>
            <div className="opt-row-label">Compact mode</div>
            <div className="opt-row-desc">Render a denser panel.</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={prefs.compactMode}
              onChange={(e) => update({ compactMode: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>
        <div className="opt-row">
          <div>
            <div className="opt-row-label">Show parser debug details</div>
            <div className="opt-row-desc">
              Show what the panel read from the page. Helpful for spotting Claude UI
              changes; off by default.
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={prefs.showParserDebug}
              onChange={(e) => update({ showParserDebug: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>
      </section>

      <section className="opt-card">
        <h2>Privacy</h2>
        <p className="opt-hint">
          This extension reads visible usage text from Claude's Usage page and stores
          compact snapshots locally. It does not send data anywhere — there is no
          backend, no analytics, and no external network calls.
        </p>
      </section>

      <section className="opt-card">
        <h2>Local history</h2>
        <p className="opt-hint">
          Compact usage snapshots stored on this device only (max 500). No HTML,
          prompts, or account identifiers are kept.
        </p>
        {summary ? (
          <div className="opt-stats">
            <div className="opt-stat">
              <div className="v">{summary.entries}</div>
              <div className="k">Snapshots stored</div>
            </div>
            <div className="opt-stat">
              <div className="v">
                {summary.typicalUnusedPct !== undefined
                  ? `~${summary.typicalUnusedPct}%`
                  : "—"}
              </div>
              <div className="k">Typical session unused</div>
            </div>
          </div>
        ) : null}
        <button type="button" className="opt-btn danger" onClick={() => void onResetHistory()}>
          Reset local history
        </button>
      </section>

      <div className="opt-saved">{savedNote}</div>
      <div className="opt-foot">Claude Usage Pace · local-only · no tracking</div>
    </div>
  );
}
