// popup.js — renders the toolbar popup.
// Reads a summary from the background worker; owns no state of its own.

"use strict";

const { DASH } = TC;

function setStat(id, value) {
  document.getElementById(id).textContent = value || DASH;
}

function render(s) {
  // First run gets its own designed moment rather than a grid of dashes.
  const hasData = s.totalWords > 0;
  document.getElementById("onboard").hidden = hasData;
  document.getElementById("main").hidden = !hasData;
  if (!hasData) return;

  TC.countTo(document.getElementById("avgWpm"), s.avgWpm);
  setStat("recentWpm", s.recentWpm);
  setStat("bestWpm", s.bestWpm);
  TC.renderRing("cleanRing", s.cleanRate);

  TC.renderTrend("trend", s.trend, "trendAxis");

  document.getElementById("totalWords").textContent =
    s.totalWords.toLocaleString();

  TC.renderRows("slowest", s.slowest, {
    fillOf: TC.slownessFill(s.avgWpm),
    meterTitle: (i) =>
      `${i.word}: ${i.wpm} wpm against your ${s.avgWpm} wpm average`,
    format: (i) => `${i.wpm} wpm`,
    emptyText: "Words appear here once you have typed them a few times.",
  });

  TC.renderRows("mostCorrected", s.mostCorrected, {
    fillOf: (i) => i.fumbleRate,
    meterTitle: (i) =>
      `${i.word}: backspaced on ${Math.round(i.fumbleRate * i.count)} of ${i.count} tries`,
    warn: true,
    format: (i) => `${Math.round(i.fumbleRate * 100)}%`,
    emptyText: "No repeated corrections yet.",
  });
}

function refresh() {
  chrome.runtime.sendMessage({ type: "GET_SUMMARY" }, (summary) => {
    if (summary) render(summary);
  });
}

function openDashboard() {
  chrome.runtime.openOptionsPage();
  window.close();
}

document.getElementById("openDashboard").addEventListener("click", openDashboard);
document
  .getElementById("openDashboardRow")
  .addEventListener("click", openDashboard);

refresh();
