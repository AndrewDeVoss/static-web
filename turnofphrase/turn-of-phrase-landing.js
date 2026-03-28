import { todayInSaintLouis } from "../utility/datetime/datetime.js";
import { DaySelector } from "./day-selector.js";
import { updateUrl } from "./shared-navigation.js";

const baseKey = `turn-of-phrase`;
const version = `v0.0.2`;
const masterKey = `${baseKey}-${version}`;
document.querySelectorAll(".day-selector").forEach(el => {
  new DaySelector(el);
});

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

// Write streaks
writeStreaks();

function writeStreaks() {
  const allGamesRaw = localStorage.getItem(masterKey);
  const allGames = allGamesRaw ? JSON.parse(allGamesRaw) : {};

  document.querySelectorAll(".difficulty-card").forEach(async card => {
    const difficulty = card.dataset.difficulty;
    let streak = 0;
    let dateObj = new Date(todayInSaintLouis()); // Date object
    let dateStr = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD string

    while (true) {
      const seed = `${dateStr}-${difficulty}`;
      const game = allGames[seed];

      if (game && game.completed) {
        streak++;

        // go back one day
        dateObj.setDate(dateObj.getDate() - 1);
        dateStr = dateObj.toISOString().split("T")[0];
      } else {
        break;
      }
    }


    const streakSpot = card.querySelector(".streak");
    if (streakSpot && streak > 0) {
      streakSpot.innerHTML = `
      ${streak}
      <svg id="fire" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 202 264" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" project-id="32dfa373f6ce459a82c8c6986e9c07b2" export-id="4f12214cddb14793891903d0a9dece5b" cached="false"><path id="tongue-3" d="M466.59738,766.78787c-2.347535,5.361569-11.166296,17.010418-13.90692,26.07547-4.222758,13.967447-.53086,40.231843,7.214428,52.124241c20.522745,31.511369,73.3226,39.433327,96.739772,15.671979c15.244552-15.468611,22.37499-30.05132,20.16503-52.15094-.20164-2.01643-1.31719-19.81736-4.17208-19.81736-.67575,0-.589578,1.237332-1.04302,1.73836-2.41468,2.668084-6.49534,18.655301-11.47321,13.55924-5.035399-5.154955,6.692753-47.888258-9.0395-55.62767-.47258-.04296-1.01252,17.36331-9.38717,22.94641-.50975.33983-2.20299,2.00807-3.12906,1.39069-3.38193-2.25462-4.051365-20.12309-5.21509-24.3371-3.069774-11.116078-13.519701-30.875209-21.35056-38.693993-1.417612-1.415426-10.43788-12.133076-12.37371-10.842526-.58654.39103-.06382,3.984669,0,4.686709.65645,7.22093,2.76308,14.7669,3.47673,21.90339.87233,8.72325-14.88312,34.0074-19.46968,42.4161-2.58169,4.73309-3.21843,10.05259-4.17208,15.29761-.12891.70902.35666,7.55964,0,7.6488-5.375347,1.073332-14.176202-20.4229-12.86388-23.98941" transform="matrix(1.6 0 0 1.5 -721.47832 -1048.230652)" fill="#ff0404" stroke-width="2.048"/><path id="tongue-2" d="M466.59738,766.78787c-2.347535,5.361569-11.166296,17.010418-13.90692,26.07547-4.222758,13.967447-.53086,40.231843,7.214428,52.124241c20.522745,31.511369,73.3226,39.433327,96.739772,15.671979c15.244552-15.468611,22.37499-30.05132,20.16503-52.15094-.20164-2.01643-1.31719-19.81736-4.17208-19.81736-.67575,0-.589578,1.237332-1.04302,1.73836-2.41468,2.668084-6.49534,18.655301-11.47321,13.55924-5.035399-5.154955,6.692753-47.888258-9.0395-55.62767-.47258-.04296-1.01252,17.36331-9.38717,22.94641-.50975.33983-2.20299,2.00807-3.12906,1.39069-3.38193-2.25462-4.051365-20.12309-5.21509-24.3371-3.069774-11.116078-13.519701-30.875209-21.35056-38.693993-1.417612-1.415426-10.43788-12.133076-12.37371-10.842526-.58654.39103-.06382,3.984669,0,4.686709.65645,7.22093,2.76308,14.7669,3.47673,21.90339.87233,8.72325-14.88312,34.0074-19.46968,42.4161-2.58169,4.73309-3.21843,10.05259-4.17208,15.29761-.12891.70902.35666,7.55964,0,7.6488-5.375347,1.073332-14.176202-20.4229-12.86388-23.98941" transform="translate(-410.307071 -611.945766)" fill="#ff6c04" stroke-width="2.048"/><path id="tongue-1" d="M466.59738,766.78787c-2.347535,5.361569-11.166296,17.010418-13.90692,26.07547-4.222758,13.967447-.53086,40.231843,7.214428,52.124241c20.522745,31.511369,73.3226,39.433327,96.739772,15.671979c15.244552-15.468611,22.37499-30.05132,20.16503-52.15094-.20164-2.01643-1.31719-19.81736-4.17208-19.81736-.67575,0-.589578,1.237332-1.04302,1.73836-2.41468,2.668084-6.49534,18.655301-11.47321,13.55924-5.035399-5.154955,6.692753-47.888258-9.0395-55.62767-.47258-.04296-1.01252,17.36331-9.38717,22.94641-.50975.33983-2.20299,2.00807-3.12906,1.39069-3.38193-2.25462-4.051365-20.12309-5.21509-24.3371-3.069774-11.116078-13.519701-30.875209-21.35056-38.693993-1.417612-1.415426-10.43788-12.133076-12.37371-10.842526-.58654.39103-.06382,3.984669,0,4.686709.65645,7.22093,2.76308,14.7669,3.47673,21.90339.87233,8.72325-14.88312,34.0074-19.46968,42.4161-2.58169,4.73309-3.21843,10.05259-4.17208,15.29761-.12891.70902.35666,7.55964,0,7.6488-5.375347,1.073332-14.176202-20.4229-12.86388-23.98941" transform="matrix(0.74 0 0 0.7 -275.686575 -351.580543)" fill="#ffcd04" stroke-width="2.048"/></svg>
    `;
    }
  });
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
