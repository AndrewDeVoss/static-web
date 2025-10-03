const colors = new Map();

export function getColors() {
    const time = Date.now();

    // Constant colors
    colors.tree = "#5a3e1b";

    // Time of day colors

    // Seasonal colors
    const season = getSeasonFromDate(time);
    switch (season) {
        case "winter":
        case "spring":
        case "summer":
        case "autumn":
            colors.leaf1 = "#ff853f"
            colors.leaf2 = "#da6709ff"
    }

    return colors;
}

function getSeasonFromDate(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const month = date.getMonth(); // 0 = January, 11 = December
  const day = date.getDate();

  if ((month === 11 && day >= 21) || (month <= 1) || (month === 2 && day < 20)) {
    return "winter";
  } else if ((month === 2 && day >= 20) || (month >= 3 && month <= 4) || (month === 5 && day < 21)) {
    return "spring";
  } else if ((month === 5 && day >= 21) || (month >= 6 && month <= 7) || (month === 8 && day < 22)) {
    return "summer";
  } else if ((month === 8 && day >= 22) || (month >= 9 && month <= 10) || (month === 11 && day < 21)) {
    return "autumn";
  }
}
