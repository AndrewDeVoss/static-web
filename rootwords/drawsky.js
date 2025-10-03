import { getColors } from '../utility/color/color.js';

export function drawSky(skyContainer) {
    const colors = getColors();

    skyContainer.style.background = "linear-gradient(to bottom, " + colors.sky1 + ", " + colors.sky2 + ")";
}