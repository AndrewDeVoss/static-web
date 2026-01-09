import { todayInSaintLouis } from "../utility/datetime/datetime.js";
import { DaySelector } from "./day-selector.js";

const baseKey = `turn-of-phrase`;
const version = `v0.0.1`;
const masterKey = `${baseKey}-${version}`;

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

// Remove games from old versions
pruneOldVersionGames();

// Mark as finished, started, etc.
updateDayButtonStates();

// Clean old games not shown for this week
compressOldGames();

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

function updateDayButtonStates() {
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

function pruneOldVersionGames() {
  const keysToDelete = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (!key) continue;

    // Starts with baseKey but is NOT the current masterKey
    if (key.startsWith(baseKey) && key !== masterKey) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    localStorage.removeItem(key);
    console.info(`Removed old storage key: ${key}`);
  }
}


// Cleans up old games that are not in the visible day buttons
function compressOldGames() {
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

function getTurnOfPhraseStorage() {
  const raw = localStorage.getItem(masterKey);
  return raw ? JSON.parse(raw) : {};
}

function setTurnOfPhraseStorage(allGames) {
  localStorage.setItem(masterKey, JSON.stringify(allGames));
}
