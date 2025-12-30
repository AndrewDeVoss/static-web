// day-selector.js

import { todayInSaintLouis } from "../utility/datetime/datetime.js";

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
    const todayKey = todayInSaintLouis(this.now);
    const [year, month, day] = todayKey.split("-").map(Number);

    // Month is 0-based
    const base = new Date(year, month - 1, day);

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
