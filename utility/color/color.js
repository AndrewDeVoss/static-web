const colors = new Map();

export function getColors() {
    const time = Date.now();

    // Constant colors
    colors.tree = "#5a3e1b";

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
            colors.sky1 = "#99e4daff";
            colors.sky2 = "#b6abcaff";
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
            break;
        case "spring":
            break;
        case "summer":
            break;
        case "autumn":
            colors.leaf1 = "#ff853f"
            colors.leaf2 = "#da6709ff"
            colors.grass1 = "#1d661dff"
            colors.grass2 = "#489248ff"
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
