import { DaySelector } from "./day-selector.js";

document.querySelectorAll(".day-selector").forEach(el => {
  new DaySelector(el);
});

const difficultyConfig = {
  easy:   { width: 5, height: 5 },
  medium: { width: 6, height: 5 },
  hard:   { width: 6, height: 6 },
  random: null
};

document.querySelectorAll(".difficulty-card").forEach(card => {
  card.addEventListener("click", () => {
    const difficulty = card.dataset.difficulty;
    const config = difficultyConfig[difficulty];

    let url = "./turn-of-phrase.html";

    if (config) {
      url += `?width=${config.width}&height=${config.height}&difficulty=${difficulty}`;
    } else {
      url += `?difficulty=random&seed=${Math.floor(Math.random() * 1e9)}`;
    }

    window.location.href = url;
  });
});
