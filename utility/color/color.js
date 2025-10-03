const colors = new Map();

export function getColors() {
    const time = Date.now();

    // Constant colors
    colors.tree = "#5a3e1b";
    colors.grass1 = "#1d661dff"


    // Time of day colors
    let timeOfDay = getTimeOfDay(time);
    switch (timeOfDay) {
        case "dawn":
            colors.sky1 = "#3c1053";
            colors.sky2 = "#ddba69ff";
            break;
        case "morning":
            colors.sky1 = "#87ceeb";
            colors.sky2 = "#ddba69ff";
            break;
        case "midmorning":
            colors.sky1 = "#75c0ddff";
            colors.sky2 = "#d8d0baff";
            break;
        case "afternoon":
            colors.sky1 = "#00bfff";
            colors.sky2 = "#87cefa";
            break;
        case "midafternoon":
            colors.sky1 = "#0077ffff";
            colors.sky2 = "#87b5faff";
            break;
        case "evening":
            colors.sky1 = "#f0af9fff";
            colors.sky2 = "#9386a5ff";
            break;
        case "twilight":
            colors.sky1 = "#352049ff";
            colors.sky2 = "#4b79a1";
            break;
        case "night":
            colors.sky1 = "#081318ff";
            colors.sky2 = "#203a43";
            break;
    }

    // Seasonal colors
    let season = getSeasonFromDate(time);
    switch (season) {
      case "winter":
          colors.leaf1 = "#cce3e6";
          colors.leaf2 = "#a3bfc5";
          colors.petal1 = "#90c7d4ff";
          colors.petal2 = "#95c6d3ff";
          colors.flowerCenter = "#ccd6dd";
          colors.butterflyWing1 = "#ff6666ff";
          colors.butterflyWing2 = "#f70505ff";
          colors.butterflyWingStroke = "#3a3a3aff";
          colors.butterflyBody = "#5d4037";
          colors.butterflyBodyStroke = "#1b0000ff";
          break;

      case "spring":
          colors.leaf1 = "#4caf50";
          colors.leaf2 = "#81c784";
          colors.petal1 = "#FF69B4";
          colors.petal2 = "#FFC0CB";
          colors.flowerCenter = "#FFD700";
          colors.butterflyWing1 = "#7fffd4";
          colors.butterflyWing2 = "#00ced1";
          colors.butterflyWingStroke = "#2f4f4f";
          colors.butterflyBody = "#5d4037";
          colors.butterflyBodyStroke = "#1b0000ff";
          break;

      case "summer":
          colors.leaf1 = "#2e7d32";
          colors.leaf2 = "#66bb6a";
          colors.petal1 = "#ffa500";
          colors.petal2 = "#ffcc80";
          colors.flowerCenter = "#ffeb3b";
          colors.butterflyWing1 = "#bc9ad1ff";
          colors.butterflyWing2 = "#7e569eff";
          colors.butterflyWingStroke = "#484886ff";
          colors.butterflyBody = "#5d4037";
          colors.butterflyBodyStroke = "#1b0000ff";
          break;

      case "autumn":
          colors.leaf1 = "#ff853f";
          colors.leaf2 = "#da6709ff";
          colors.petal1 = "#c10e35ff";
          colors.petal2 = "#e04439ff";
          colors.flowerCenter = "#d1954bff";
          colors.butterflyWing1 = "#f07f0dff";
          colors.butterflyWing2 = "#ffb300";
          colors.butterflyWingStroke = "#4e342e";
          colors.butterflyBody = "#5d4037";
          colors.butterflyBodyStroke = "#1b0000ff";
          break;
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

function getTimeOfDay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const lat = 38.6270;   // St. Louis latitude
  const lng = -90.1994;  // St. Louis longitude

  const times = getSunTimes(date, lat, lng);

  const time = date.getTime();

  if (time < times.civilDawn) {
    return "night";
  } else if (time < times.sunrise) {
    return "dawn";
  } else if (time < (times.sunrise+time.solarNoon)/2) {
    return "morning";
   } else if (time < times.solarNoon) {
    return "midmorning"; 
  } else if (time < (times.solarNoon+times.sunset)/2) {
    return "afternoon";
  } else if (time < times.sunset) {
    return "midafternoon";
  } else if (time < times.civilDusk) {
    return "evening";
  } else {
    return "twilight";
  }
}

function getSunTimes(date, lat, lng) {
  // Based on NOAA solar calculations
  const rad = Math.PI / 180;
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(2000, 0, 1)) / 86400000);
  const J = day + 2451545.0;
  const n = J - 2451545.0 + 0.0008;
  const J_star = n - lng / 360;

  const M = (357.5291 + 0.98560028 * J_star) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.0200 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const J_transit = 2451545.0 + J_star + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad);

  const delta = Math.asin(Math.sin(lambda * rad) * Math.sin(23.44 * rad));
  const H = Math.acos((Math.sin(-0.10472) - Math.sin(lat * rad) * Math.sin(delta)) / (Math.cos(lat * rad) * Math.cos(delta))) / rad;

  const J_rise = J_transit - H / 360;
  const J_set = J_transit + H / 360;

  const civilAngle = -6 * rad;
  const H_civil = Math.acos((Math.sin(civilAngle) - Math.sin(lat * rad) * Math.sin(delta)) / (Math.cos(lat * rad) * Math.cos(delta))) / rad;

  const J_civilDawn = J_transit - H_civil / 360;
  const J_civilDusk = J_transit + H_civil / 360;

  const msInDay = 86400000;
  const jdToMs = jd => (jd - 2440587.5) * msInDay;

  return {
    civilDawn: jdToMs(J_civilDawn),
    sunrise:   jdToMs(J_rise),
    solarNoon: jdToMs(J_transit),
    sunset:    jdToMs(J_set),
    civilDusk: jdToMs(J_civilDusk)
  };

}
