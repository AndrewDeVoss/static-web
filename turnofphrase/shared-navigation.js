
const difficultyConfig = {
  easy: { width: 5, height: 5 },
  medium: { width: 6, height: 5 },
  hard: { width: 6, height: 6 },
  random: null
};

export function updateUrl(difficulty, date) {
    const config = difficultyConfig[difficulty];
    let url = "./turn-of-phrase.html";

    if (config) {
        url += `?width=${config.width}&height=${config.height}&difficulty=${difficulty}&date=${date}`;
    } else {
        url += `?difficulty=custom`;
    }
    window.location.href = url;
}