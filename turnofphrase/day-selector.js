// day-selector.js

import { todayInSaintLouis } from "../utility/datetime/datetime";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export class DaySelector {
  constructor(container) {
    this.container = container;
    this.difficulty = container.dataset.difficulty;

    // Anchor: current moment (real Date object)
    this.now = new Date();

    this.render();
  }

  render() {
    this.container.innerHTML = "";

    // Build 7 days ending today (rightmost)
    for (let offset = 6; offset >= 0; offset--) {
      const date = this.dateOffsetFromToday(offset);

      const dayIndex = date.getDay();
      const label = DAY_LABELS[dayIndex];

      const btn = document.createElement("div");
      btn.className = "day-button";
      btn.textContent = label;
      btn.dataset.state = this.getStateForDate(date);
      btn.dataset.date = todayInSaintLouis(date); // YYYY-MM-DD

      this.container.appendChild(btn);
    }
  }

  dateOffsetFromToday(offset) {
    // Convert "now" → St. Louis calendar date string
    const todayKey = todayInSaintLouis(this.now);

    // Parse safely as local midnight
    const base = new Date(`${todayKey}T00:00:00`);

    base.setDate(base.getDate() - offset);
    return base;
  }

  getStateForDate(date) {
    const key = todayInSaintLouis(date);

    const saved = localStorage.getItem(
      `top-${this.difficulty}-${key}`
    );

    if (saved === "finished") return "finished";
    if (saved === "started") return "started";
    return "unstarted";
  }
}
