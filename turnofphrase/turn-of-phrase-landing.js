import { todayInSaintLouis } from "../utility/datetime/datetime.js";
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
    const date = todayInSaintLouis();
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

// Mark as finished, started, etc.
updateDayButtonStates();

// Clean old games not shown for this week
cleanupOldGames();

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

function getPuzzleStatus(date, difficulty) {
  const key = `${date}-${difficulty}`;
  const raw = localStorage.getItem(key);

  if (!raw) return "unstarted";

  try {
    const state = JSON.parse(raw);
    return state.completed ? "finished" : "started";
  } catch {
    // Corrupt or old data → treat as unstarted
    return "unstarted";
  }
}

function updateDayButtonStates() {
  const masterKey = "turn-of-phrase";
  const allGamesRaw = localStorage.getItem(masterKey);
  const allGames = allGamesRaw ? JSON.parse(allGamesRaw) : {};

  document.querySelectorAll(".day-button").forEach(button => {
    const date = button.dataset.date;
    const card = button.closest(".difficulty-card");
    if (!card) return;

    const difficulty = card.dataset.difficulty;
    const seed = `${date}-${difficulty}`;

    const state = allGames[seed];

    if (!state) {
      // No game saved for this seed
      button.dataset.state = "unstarted";
    } else if (!state.completed) {
      // Game exists but not completed
      button.dataset.state = "started";
    } else {
      // Game exists and completed
      button.dataset.state = "finished";

      // Optional: match finished color to the card's background
      // Works if you use CSS variable --difficulty-color
      const computedBg = getComputedStyle(card).backgroundColor;
      button.style.setProperty("--difficulty-color", computedBg);
    }
  });
}

// Cleans up old games that are not in the visible day buttons
function cleanupOldGames() {
  const allGames = getTurnOfPhraseStorage();

  // Get a set of all dates currently shown on the landing page
  const visibleDates = new Set(
    Array.from(document.querySelectorAll(".day-button")).map(btn => btn.dataset.date)
  );

  let changed = false;

  for (const [key, game] of Object.entries(allGames)) {
    const parts = game.seedString?.split("-");
    const gameDate = parts ? `${parts[0]}-${parts[1]}-${parts[2]}` : null; // YYYY-MM-DD

    if (!gameDate) continue;

    if (!visibleDates.has(gameDate)) {
      // Keep only minimal info: e.g., completed status
      allGames[key] = {
        completed: game.completed || false,
        seedString: game.seedString
      };
      changed = true;
    }
  }

  if (changed) {
    setTurnOfPhraseStorage(allGames);
  }
}

// Get all games stored under the master key "turn-of-phrase"
function getTurnOfPhraseStorage() {
  const raw = localStorage.getItem("turn-of-phrase");
  return raw ? JSON.parse(raw) : {};
}

// Save all games under the master key "turn-of-phrase"
function setTurnOfPhraseStorage(allGames) {
  localStorage.setItem("turn-of-phrase", JSON.stringify(allGames));
}
