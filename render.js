// render.js — shared rendering helpers for the popup and the dashboard.
// Plain script (no modules); attaches helpers to window.TC.

"use strict";

window.TC = (() => {
  const DASH = "––";

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Count a number up to its value. Tabular figures keep digits from jittering.
  function countTo(el, target, duration = 700) {
    if (!target || reduceMotion) {
      el.textContent = target || DASH;
      return;
    }
    const start = performance.now();
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      // easeOutExpo: fast commit, long settle.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // ------------------------------------------------------------- Trend ---
  // Bars scale against the best day in view, so the shape reads as relative
  // progress rather than absolute speed.
  function renderTrend(containerId, trend, axisId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";

    const peak = Math.max(...trend.map((d) => d.wpm), 1);

    trend.forEach((day, i) => {
      const bar = document.createElement("div");
      bar.className = "trend-bar";
      if (day.wpm === 0) {
        bar.classList.add("empty");
        bar.style.height = "2px";
      } else {
        bar.style.height = `${clamp((day.wpm / peak) * 100, 8, 100)}%`;
        if (day.isToday) bar.classList.add("today");
      }
      if (!reduceMotion) bar.style.animationDelay = `${i * 22}ms`;
      bar.title = day.wpm
        ? `${day.date}: ${day.wpm} wpm, ${day.words} words`
        : `${day.date}: no typing`;
      el.appendChild(bar);
    });

    if (axisId) {
      const axis = document.getElementById(axisId);
      if (axis) {
        axis.innerHTML = "";
        const left = document.createElement("span");
        left.textContent = `${trend.length} days ago`;
        const right = document.createElement("span");
        right.textContent = "Today";
        axis.append(left, right);
      }
    }
  }

  // -------------------------------------------------------------- Rows ---
  // Each row carries a meter so the list can be scanned by shape.
  // `fillOf` returns 0..1; `warn` switches the fill to the orange ramp.
  function renderRows(containerId, items, opts) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";

    if (!items || items.length === 0) {
      const p = document.createElement("p");
      p.className = "row-empty";
      p.textContent = opts.emptyText;
      el.appendChild(p);
      return;
    }

    items.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "row";

      const label = document.createElement("span");
      label.className = "row-label";
      label.textContent = item.word;

      const meter = document.createElement("span");
      meter.className = "meter";
      if (opts.meterTitle) meter.title = opts.meterTitle(item);
      const fill = document.createElement("span");
      fill.className = "meter-fill" + (opts.warn ? " warn" : "");
      fill.style.transform = `scaleX(${clamp(opts.fillOf(item), 0.06, 1)})`;
      if (!reduceMotion) fill.style.animationDelay = `${120 + i * 45}ms`;
      meter.appendChild(fill);

      const value = document.createElement("span");
      value.className = "row-value";
      value.textContent = opts.format(item);

      row.append(label, meter, value);
      el.appendChild(row);
    });
  }

  // -------------------------------------------------------------- Ring ---
  function renderRing(containerId, percent, size = 34, stroke = 3) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";

    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

    const mk = (cls) => {
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", size / 2);
      circle.setAttribute("cy", size / 2);
      circle.setAttribute("r", r);
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke-width", stroke);
      circle.setAttribute("class", cls);
      return circle;
    };

    const track = mk("ring-track");
    const fill = mk("ring-fill");
    fill.setAttribute("stroke-dasharray", c);
    // Start empty, then release to the real value so the ring draws itself.
    fill.setAttribute("stroke-dashoffset", reduceMotion ? c * (1 - percent / 100) : c);

    svg.append(track, fill);

    const value = document.createElement("span");
    value.className = "ring-value";
    value.textContent = percent === null ? DASH : `${percent}`;

    el.append(svg, value);

    if (!reduceMotion) {
      requestAnimationFrame(() => {
        fill.setAttribute("stroke-dashoffset", c * (1 - percent / 100));
      });
    }
  }

  // --------------------------------------------------------- Formatters ---
  function formatDuration(ms) {
    if (!ms || ms < 1000) return DASH;
    const totalMin = Math.round(ms / 60000);
    if (totalMin < 1) return "under a minute";
    if (totalMin < 60) return `${totalMin}m`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function formatDate(ts) {
    if (!ts) return DASH;
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Fill for "slowest": how far below your overall average this word sits.
  function slownessFill(avgWpm) {
    return (item) => (avgWpm > 0 ? 1 - item.wpm / avgWpm : 0.5);
  }

  return {
    DASH,
    reduceMotion,
    countTo,
    clamp,
    renderTrend,
    renderRows,
    renderRing,
    formatDuration,
    formatDate,
    slownessFill,
  };
})();
