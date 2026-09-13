// dashboard.js — renders the full options page.

"use strict";

const { DASH } = TC;

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function render(s) {
  // On first run the hero is replaced by the onboarding panel; the reference
  // sections below (privacy, data) stay visible since they are still useful.
  const hasData = s.totalWords > 0;
  document.getElementById("onboard").hidden = hasData;
  document.getElementById("hero").hidden = !hasData;

  if (hasData) {
    TC.countTo(document.getElementById("avgWpm"), s.avgWpm, 900);
    setText("recentWpm", s.recentWpm || DASH);
    setText("bestWpm", s.bestWpm || DASH);
    TC.renderRing("cleanRing", s.cleanRate, 40, 3.5);
    TC.renderTrend("trend", s.trend, "trendAxis");
    setText("totalWords", s.totalWords.toLocaleString());
  }

  setText("ovWords", s.totalWords.toLocaleString());
  setText("ovChars", s.totalChars.toLocaleString());
  setText("ovTracked", s.trackedWordCount.toLocaleString());
  setText("ovTime", TC.formatDuration(s.totalActiveMs));
  setText("ovSince", TC.formatDate(s.firstSeen));

  TC.renderRows("slowest", s.slowest, {
    fillOf: TC.slownessFill(s.avgWpm),
    meterTitle: (i) =>
      `${i.word}: ${i.wpm} wpm against your ${s.avgWpm} wpm average`,
    format: (i) => `${i.wpm} wpm · ${i.count}×`,
    emptyText: "Words appear here once you have typed them a few times.",
  });

  TC.renderRows("mostCorrected", s.mostCorrected, {
    fillOf: (i) => i.fumbleRate,
    meterTitle: (i) =>
      `${i.word}: backspaced on ${Math.round(i.fumbleRate * i.count)} of ${i.count} tries`,
    warn: true,
    format: (i) => `${Math.round(i.fumbleRate * 100)}% of ${i.count}×`,
    emptyText: "No repeated corrections yet.",
  });
}

function refresh() {
  chrome.runtime.sendMessage({ type: "GET_FULL" }, (summary) => {
    if (summary) render(summary);
  });
}

// Two-click confirm, consistent with the popup and safe inside extension pages.
const resetBtn = document.getElementById("reset");
let armed = false;
let armTimer = null;

function disarm() {
  armed = false;
  resetBtn.textContent = "Reset All Data";
  resetBtn.classList.remove("armed");
  clearTimeout(armTimer);
}

resetBtn.addEventListener("click", () => {
  if (!armed) {
    armed = true;
    resetBtn.textContent = "Confirm Reset";
    resetBtn.classList.add("armed");
    armTimer = setTimeout(disarm, 3000);
    return;
  }
  disarm();
  chrome.runtime.sendMessage({ type: "RESET" }, () => refresh());
});

refresh();
