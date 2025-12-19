// day-selector.js

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export class DaySelector {
  constructor(container) {
    this.container = container;
    this.difficulty = container.dataset.difficulty;
    this.today = new Date();
    this.render();
  }

  render() {
    this.container.innerHTML = "";

    // Build 7 days ending today (rightmost)
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(this.today);
      date.setDate(this.today.getDate() - offset);

      const dayIndex = date.getDay();
      const label = DAY_LABELS[dayIndex];

      const btn = document.createElement("div");
      btn.className = "day-button";
      btn.textContent = label;
      btn.dataset.state = this.getStateForDate(date);
      btn.dataset.date = this.dateKey(date);

      this.container.appendChild(btn);
    }
  }

  getStateForDate(date) {
    // 🔧 Replace later with real persistence
    const todayKey = this.dateKey(date);

    const saved = localStorage.getItem(
      `top-${this.difficulty}-${todayKey}`
    );

    if (saved === "finished") return "finished";
    if (saved === "started") return "started";
    return "unstarted";
  }


  dateKey(date) {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  }
}
