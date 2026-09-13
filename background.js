// background.js  (Manifest V3 service worker)
// Receives finished-word summaries from content scripts, aggregates them,
// and persists everything to chrome.storage.local. Also keeps a short rolling
// buffer of recent word events so the popup can show a "recent WPM".
//
// Nothing here ever leaves the device.

"use strict";

const STORE_KEY = "typingCoachStats";
const RECENT_WINDOW_MS = 60 * 1000; // "recent WPM" = last 60 seconds
const MIN_COUNT_TO_KEEP = 3;        // a word must recur >=3x before it "counts"
// Guards against noise spikes: don't report a WPM until the sample is big
// enough to be meaningful (a 2-word window over 0.3s gives a fake 90+).
const MIN_RECENT_SAMPLES = 4;       // need >=4 words in the window
const MIN_RECENT_SPAN_MS = 3000;    // spanning >=3 seconds
const DAY_HISTORY = 60;             // days of per-day buckets to retain
const TREND_DAYS_POPUP = 14;
const TREND_DAYS_FULL = 30;

// Default shape of persisted stats.
function emptyStats() {
  return {
    totalWords: 0,       // total qualifying words typed (all time)
    totalChars: 0,
    totalActiveMs: 0,    // summed typing duration of all words
    totalBackspaces: 0,
    totalFumbles: 0,     // words that needed at least one correction
    // Denominator for the clean rate. Tracked separately from totalWords so
    // that words recorded before fumble tracking existed cannot count as
    // "clean" and inflate the figure.
    fumbleDenom: 0,
    firstSeen: Date.now(),
    // Per-word aggregates. Key = word.
    // value = { count, chars, durMs, backspaces, hesitations }
    words: {},
    // Best rolling WPM we've observed.
    bestWpm: 0,
    // Rolling buffer of recent word events { chars, at } for live WPM.
    // Persisted so it survives the MV3 service worker sleeping.
    recent: [],
    // Per-day buckets keyed "YYYY-MM-DD" (local time):
    // { chars, activeMs, words, fumbles }. Powers the trend strip.
    days: {},
  };
}

// Local-time day key. Deliberately not toISOString(), which is UTC and would
// roll the day over at the wrong moment for most of the world.
function dayKey(ts) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// The local calendar date `n` days before today. Walking the date field is
// DST-safe; subtracting a fixed 86_400_000 ms is not, and would repeat or skip
// a day whenever the clocks change.
function dayKeyBack(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // midday anchor keeps the shift clear of midnight
  d.setDate(d.getDate() - n);
  return dayKey(d.getTime());
}

// Drop buckets we will never display again.
function pruneDays(days) {
  const minKey = dayKeyBack(DAY_HISTORY);
  const out = {};
  for (const [k, v] of Object.entries(days || {})) {
    if (k >= minKey) out[k] = v; // ISO-like keys sort lexicographically
  }
  return out;
}

// Last `span` days, oldest first, including days with no typing.
function buildTrend(days, span) {
  const out = [];
  for (let i = span - 1; i >= 0; i--) {
    const key = dayKeyBack(i);
    const d = (days || {})[key];
    out.push({
      date: key,
      wpm: d ? Math.round(charsToWpm(d.chars, d.activeMs)) : 0,
      words: d ? d.words : 0,
      isToday: i === 0,
    });
  }
  return out;
}

async function loadStats() {
  const res = await chrome.storage.local.get(STORE_KEY);
  return res[STORE_KEY] || emptyStats();
}

async function saveStats(stats) {
  await chrome.storage.local.set({ [STORE_KEY]: stats });
}

// Standard WPM convention: one "word" = 5 characters.
function charsToWpm(chars, ms) {
  if (ms <= 0) return 0;
  const minutes = ms / 60000;
  return (chars / 5) / minutes;
}

// Prune events older than the window and return the survivors.
function pruneRecent(recent) {
  const cutoff = Date.now() - RECENT_WINDOW_MS;
  return (recent || []).filter((r) => r.at >= cutoff);
}

function computeRecentWpm(recent) {
  const r = pruneRecent(recent);
  if (r.length < MIN_RECENT_SAMPLES) return 0;
  const span = r[r.length - 1].at - r[0].at;
  if (span < MIN_RECENT_SPAN_MS) return 0; // too short a window to trust
  // Timestamps mark word *completion*, so the span covers only the intervals
  // between events. The first word was typed before the span began, so its
  // characters must not be counted against it — including them overstates
  // speed by n/(n-1), which is 33% at the four-sample minimum.
  const chars = r.slice(1).reduce((s, e) => s + e.chars, 0);
  return Math.round(charsToWpm(chars, span));
}

async function handleWord(msg) {
  const stats = await loadStats();

  stats.totalWords += 1;
  stats.totalChars += msg.chars;
  stats.totalActiveMs += msg.duration;
  stats.totalBackspaces += msg.backspaces;
  stats.totalFumbles = (stats.totalFumbles || 0) + (msg.backspaces > 0 ? 1 : 0);
  stats.fumbleDenom = (stats.fumbleDenom || 0) + 1;

  const w = stats.words[msg.word] || {
    count: 0,          // times this word was typed
    chars: 0,
    durMs: 0,
    backspaces: 0,     // total corrections across all attempts
    fumbles: 0,        // attempts with >=1 correction (for the % below)
    hesitations: 0,
  };
  w.count += 1;
  w.chars += msg.chars;
  w.durMs += msg.duration;
  w.backspaces += msg.backspaces;
  w.fumbles += msg.backspaces > 0 ? 1 : 0;
  w.hesitations += msg.hesitations;
  stats.words[msg.word] = w;

  // Per-day bucket, for the trend strip.
  stats.days = pruneDays(stats.days);
  const key = dayKey(msg.at);
  const bucket = stats.days[key] || { chars: 0, activeMs: 0, words: 0, fumbles: 0 };
  bucket.chars += msg.chars;
  bucket.activeMs += msg.duration;
  bucket.words += 1;
  bucket.fumbles += msg.backspaces > 0 ? 1 : 0;
  stats.days[key] = bucket;

  // Rolling recent buffer for live WPM (persisted, pruned to the window).
  stats.recent = pruneRecent(stats.recent);
  stats.recent.push({ chars: msg.chars, at: msg.at });
  const rwpm = computeRecentWpm(stats.recent);
  if (rwpm > stats.bestWpm) stats.bestWpm = rwpm;

  await saveStats(stats);
}

// Build the numbers a view wants to display. `limit` controls how deep the
// word lists go: the popup stays shallow, the dashboard goes deeper.
function buildSummary(stats, limit = 3, trendDays = TREND_DAYS_POPUP) {
  // Overall average WPM across all typing.
  const avgWpm = Math.round(charsToWpm(stats.totalChars, stats.totalActiveMs));

  // Turn per-word aggregates into ranked "stuck word" lists.
  const words = Object.entries(stats.words)
    .filter(([, v]) => v.count >= MIN_COUNT_TO_KEEP)
    .map(([word, v]) => {
      const avgWordWpm = charsToWpm(v.chars, v.durMs);
      return {
        word,
        count: v.count,
        wpm: Math.round(avgWordWpm),
        hesitationRate: v.hesitations / v.count,
        // Share of attempts where you had to fix at least one character (0..1).
        fumbleRate: (v.fumbles || 0) / v.count,
      };
    });

  // Slowest words (need a few samples to be meaningful).
  const slowest = [...words].sort((a, b) => a.wpm - b.wpm).slice(0, limit);
  // Most-corrected words.
  const mostCorrected = [...words]
    .filter((w) => w.fumbleRate > 0)
    .sort((a, b) => b.fumbleRate - a.fumbleRate)
    .slice(0, limit);

  // Share of words typed without needing a correction. Needs a meaningful
  // sample before it says anything, and is null until then so the views can
  // show a dash rather than a misleading 100%.
  const denom = stats.fumbleDenom || 0;
  const cleanRate =
    denom >= 20
      ? Math.round((1 - (stats.totalFumbles || 0) / denom) * 100)
      : null;

  return {
    avgWpm,
    recentWpm: computeRecentWpm(stats.recent),
    bestWpm: stats.bestWpm,
    cleanRate,
    totalWords: stats.totalWords,
    totalChars: stats.totalChars,
    totalActiveMs: stats.totalActiveMs,
    trackedWordCount: words.length,
    slowest,
    mostCorrected,
    trend: buildTrend(stats.days, trendDays),
    firstSeen: stats.firstSeen,
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "WORD") {
    handleWord(msg);
    return; // no response needed
  }

  if (msg.type === "GET_SUMMARY") {
    loadStats().then((stats) =>
      sendResponse(buildSummary(stats, 3, TREND_DAYS_POPUP))
    );
    return true; // keep the channel open for the async response
  }

  if (msg.type === "GET_FULL") {
    loadStats().then((stats) =>
      sendResponse(buildSummary(stats, 20, TREND_DAYS_FULL))
    );
    return true;
  }

  if (msg.type === "RESET") {
    saveStats(emptyStats()).then(() => sendResponse({ ok: true }));
    return true;
  }
});
