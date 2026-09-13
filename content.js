// content.js
// Runs inside every page. Its ONLY job is to watch typing *timing* and
// package up finished words. It never keeps a running log of raw text:
// it builds one word at a time in memory, measures it, sends the summary
// to the background service worker, and throws the characters away.
//
// Privacy rules enforced here (see README for the full model):
//   1. Sensitive fields (passwords, OTP, credit-card) are ignored entirely.
//   2. Only alphabetic words (letters + ' and -) are ever emitted.
//   3. We send aggregate facts about a word, never the sequence of words.

(() => {
  "use strict";

  // ---- Tunables -----------------------------------------------------------
  const PAUSE_THRESHOLD_MS = 400; // a gap longer than this counts as a "hesitation"
  const IDLE_RESET_MS = 3000;     // gap longer than this = you stopped typing; end the word
  const MAX_WORD_LEN = 20;        // ignore absurdly long tokens (likely not real words)
  const MIN_WORD_LEN = 2;

  // ---- Per-word state (in memory only, cleared on every word boundary) ----
  let buffer = "";          // characters of the word currently being typed
  let backspaces = 0;       // corrections made while typing this word
  let hesitations = 0;      // number of long gaps within this word
  let wordActiveMs = 0;     // real time spent typing this word (see accumulate())

  // ---- Cross-word state: measures true "fingers on keyboard" time ----------
  // We track the gap since the *previous* keystroke of any kind. If it's short
  // enough to still be one continuous burst of typing, it counts as active
  // time (this is what makes average WPM match sustained speed, not burst
  // speed). Long gaps = you stopped/thought, and are excluded.
  let lastEventTime = 0;

  // Add the gap since the last keystroke to the current word's active time,
  // as long as it's part of a continuous burst. Always advances lastEventTime.
  function accumulate(now) {
    const gap = now - lastEventTime;
    if (lastEventTime > 0 && gap > 0 && gap < IDLE_RESET_MS) {
      wordActiveMs += gap;
    }
    lastEventTime = now;
  }

  // Decide whether we should watch the currently focused element.
  function isSensitiveTarget(el) {
    if (!el) return true;
    const tag = el.tagName;
    const editable = el.isContentEditable;
    const isField = tag === "INPUT" || tag === "TEXTAREA" || editable;
    if (!isField) return true; // not a text field at all -> ignore

    if (tag === "INPUT") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      // Only track "text-like" inputs. Skip password/number/etc.
      const allowed = ["text", "search", "email", "url", ""];
      if (!allowed.includes(type)) return true;
    }

    // Honor autocomplete hints for secrets.
    const ac = (el.getAttribute("autocomplete") || "").toLowerCase();
    if (
      ac.includes("password") ||
      ac.includes("one-time-code") ||
      ac.includes("cc-") ||
      ac.includes("credit")
    ) {
      return true;
    }
    return false;
  }

  function resetWord() {
    buffer = "";
    backspaces = 0;
    hesitations = 0;
    wordActiveMs = 0;
  }

  // Keep only words made purely of letters (plus internal ' and -).
  function isCleanWord(w) {
    return /^[a-z]+(?:['-][a-z]+)*$/i.test(w);
  }

  // Finalize the current word and ship a summary to the background worker.
  //
  // `withDelimiter` is true when a space/punctuation key ended the word. That
  // keystroke's time is already counted in wordActiveMs, so its character must
  // be counted too — the standard WPM convention treats a "word" as five
  // keystrokes *including* the delimiter. Counting letters alone while timing
  // the space understates speed by roughly 17%.
  function flushWord(withDelimiter) {
    const word = buffer.toLowerCase();
    const len = buffer.length;
    const chars = len + (withDelimiter ? 1 : 0);
    const duration = wordActiveMs; // real typing time, incl. inter-word gaps

    if (
      len >= MIN_WORD_LEN &&
      len <= MAX_WORD_LEN &&
      duration > 0 &&
      isCleanWord(word)
    ) {
      try {
        chrome.runtime.sendMessage({
          type: "WORD",
          word,          // the word (letters only, already validated)
          chars,         // how many characters
          duration,      // ms of real typing time (incl. inter-word gaps)
          backspaces,    // corrections during this word
          hesitations,   // long pauses within this word
          at: Date.now(), // timestamp, for rolling WPM
        });
      } catch (e) {
        // Extension context can be invalidated on reload; ignore.
      }
    }
    resetWord();
  }

  document.addEventListener(
    "keydown",
    (e) => {
      if (isSensitiveTarget(e.target)) {
        resetWord();
        return;
      }

      const now = performance.now();
      const key = e.key;

      // Backspace: a correction on the current word. Its time still counts as
      // active typing time.
      if (key === "Backspace") {
        accumulate(now);
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1);
          backspaces += 1;
        }
        return;
      }

      // Word boundaries: space, enter, tab, or punctuation ends the word.
      const isBoundary =
        key === " " ||
        key === "Enter" ||
        key === "Tab" ||
        (key.length === 1 && /[^a-zA-Z'-]/.test(key));

      if (isBoundary) {
        accumulate(now); // the keystroke that ends the word is typing too
        if (buffer.length > 0) flushWord(true);
        return;
      }

      // Ignore modifier / navigation keys (they have multi-char names).
      if (key.length !== 1) return;

      // A real character. Measure the gap before we fold it into active time.
      const gap = now - lastEventTime;

      if (buffer.length > 0 && lastEventTime > 0 && gap > IDLE_RESET_MS) {
        // You walked away mid-word; discard the partial word (accumulate below
        // won't count this long gap either).
        resetWord();
      }

      accumulate(now);

      if (buffer.length > 0 && gap > PAUSE_THRESHOLD_MS && gap < IDLE_RESET_MS) {
        hesitations += 1;
      }
      buffer += key;
    },
    true // capture phase, so we see keys before the page does
  );

  // If focus leaves a field, close out any word in progress. No delimiter was
  // typed, so no delimiter character is counted.
  document.addEventListener(
    "blur",
    () => {
      if (buffer.length > 0) flushWord(false);
    },
    true
  );
})();
