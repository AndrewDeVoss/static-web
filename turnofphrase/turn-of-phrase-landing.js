import { DaySelector } from "./day-selector.js";

document.querySelectorAll(".day-selector").forEach(el => {
  new DaySelector(el);
});

const difficultyConfig = {
  easy: { width: 5, height: 5 },
  medium: { width: 6, height: 5 },
  hard: { width: 6, height: 6 },
  random: null
};

// When clicking on a difficulty card, use today's date.
document.querySelectorAll(".difficulty-card").forEach(card => {
  card.addEventListener("click", () => {
    const date = new Date().toISOString().slice(0, 10);
    const difficulty = card.dataset.difficulty;
    updateUrl(difficulty, date);
  });
});

// When clicking on a day selector, update the URL with the selected date.
document.querySelectorAll(".day-button").forEach(dayButton => {
  dayButton.addEventListener("click", e => {
    e.stopPropagation();
    const date = dayButton.dataset.date;

    const card = dayButton.closest(".difficulty-card");
    if (!card) return; // safety

    const difficulty = card.dataset.difficulty;
    updateUrl(difficulty, date);
  });
});

function updateUrl(difficulty, date) {
  const config = difficultyConfig[difficulty];
  let url = "./turn-of-phrase.html";

  if (config) {
    url += `?width=${config.width}&height=${config.height}&difficulty=${difficulty}&date=${date}`;
  } else {
    url += `?difficulty=custom`;
  }
  window.location.href = url;
}
