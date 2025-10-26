import { getColors } from '../utility/color/color.js';
import { drawLeaf } from './drawtree.js';

// Colors
let colors = getColors();
let metallicColorMap = new Map();
function rescopeMetallicColorMap(svg) {
    // Clear map from previous svgs
    metallicColorMap = new Map();

    // Function to make gradient elements that can be used in svg
    function createLinearGradient(svg, id, colors, direction = { x1: "0%", y1: "0%", x2: "100%", y2: "100%" }) {
        // Ensure a <defs> exists
        let defs = svg.querySelector("defs");
        if (!defs) {
            defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            svg.insertBefore(defs, svg.firstChild);
        }

        // Create the gradient element
        const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        grad.id = id;
        grad.setAttribute("x1", direction.x1);
        grad.setAttribute("y1", direction.y1);
        grad.setAttribute("x2", direction.x2);
        grad.setAttribute("y2", direction.y2);

        // Create color stops evenly spaced
        const step = 100 / (colors.length - 1);
        colors.forEach((color, i) => {
            const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop.setAttribute("offset", `${i * step}%`);
            stop.setAttribute("stop-color", color);
            grad.appendChild(stop);
        });

        defs.appendChild(grad);
        return `url(#${id})`;
    }

    // Define colors
    // Bronze colors and gradient
    const bronze1 = "#c44e20ff";
    const bronze2 = "#644324ff";
    const bronze3 = "#fa9d63ff";
    metallicColorMap.set("bronze1", bronze1);
    metallicColorMap.set("bronze2", bronze2);
    metallicColorMap.set("bronze3", bronze3);
    metallicColorMap.set(
        "bronzeGradient",
        createLinearGradient(svg, "bronzeGradient", [bronze1, bronze2, bronze3])
    );

    // Silver colors and gradient
    const silver1 = "#abafb4ff";
    const silver2 = "#5b6268ff";
    const silver3 = "#a8bac2ff";
    metallicColorMap.set("silver1", silver1);
    metallicColorMap.set("silver2", silver2);
    metallicColorMap.set("silver3", silver3);
    metallicColorMap.set(
        "silverGradient",
        createLinearGradient(svg, "silverGradient", [silver1, silver2, silver3])
    );

    // Gold colors and gradient
    const gold1 = "#ecd15bff"; // base
    const gold2 = "#94771aff"; // lighter
    const gold3 = "#eed43fff"; // darker
    metallicColorMap.set("gold1", gold1);
    metallicColorMap.set("gold2", gold2);
    metallicColorMap.set("gold3", gold3);
    metallicColorMap.set(
        "goldGradient",
        createLinearGradient(svg, "goldGradient", [gold1, gold2, gold3])
    );

    // Opal colors
    const opal1 = "#7752E8";
    const opal2 = "#E36C35";
    const opal3 = "#1FC6C2";
    metallicColorMap.set("opal1", opal1);
    metallicColorMap.set("opal2", opal2);
    metallicColorMap.set("opal3", opal3);
    metallicColorMap.set(
        "opalGradient",
        createLinearGradient(svg, "opalGradient", [opal1, opal2, opal3])
    );

}

// Seeded rng
let randomState = 0;
function seededRandom() {
    randomState = (randomState * 1664525 + 1013904223) % 4294967296;
    return randomState / 4294967296;
}
export function seedFlowerRNG(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    randomState = h >>> 0;
}

export function drawFlower(svg, baseX, baseY, flowerParameter, dateString) {
    colors = getColors();

    const flowerGroup = document.createElementNS(svg.namespaceURI, "g");

    // Stem and leaf
    const stemGroup = drawFlowerStem(flowerGroup, baseX, baseY, flowerParameter);

    // Head
    const headGroup = drawFlowerHead(flowerGroup, flowerParameter, stemGroup.x, stemGroup.y, stemGroup.angle);

    flowerGroup.dataset.order = "flower";
    svg.appendChild(flowerGroup);
    return flowerGroup;
}

function drawFlowerStem(flowerGroup, baseX, baseY, flowerParameter) {
    const svgNS = flowerGroup.namespaceURI;

    // Height
    const minStemHeight = 50;
    const maxStemHeight = minStemHeight + seededRandom() * 60;
    const stemHeight = minStemHeight + flowerParameter * (maxStemHeight - minStemHeight);

    // Tip
    const maxTipSwayFactor = 7;
    const maxTipX = baseX + (seededRandom() * 2 * maxTipSwayFactor - maxTipSwayFactor);
    const tipX = baseX + flowerParameter * (maxTipX - baseX);
    const tipY = baseY - stemHeight;

    // Bend
    const maxStalkSwayFactor = 35;
    const maxCtrlX = baseX + (seededRandom() * 2 * maxStalkSwayFactor - maxStalkSwayFactor);
    const ctrlX = baseX + flowerParameter * (maxCtrlX - baseX);
    const ctrlY = baseY - stemHeight * 0.5;

    // --- Draw the stem ---
    const d = `M ${baseX} ${baseY} Q ${ctrlX} ${ctrlY}, ${tipX} ${tipY}`;
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", colors.stem1);
    path.setAttribute("stroke-width", 1.2);
    path.setAttribute("stroke-linecap", "round");
    flowerGroup.appendChild(path);

    // --- Add one leaf ---
    const leafFraction = 0.6 + seededRandom() * .3; // 0.4–0.8

    // Quadratic Bézier formula for point at t:
    const leafX = Math.pow(1 - leafFraction, 2) * baseX + 2 * (1 - leafFraction) * leafFraction * ctrlX + Math.pow(leafFraction, 2) * tipX;
    const leafY = Math.pow(1 - leafFraction, 2) * baseY + 2 * (1 - leafFraction) * leafFraction * ctrlY + Math.pow(leafFraction, 2) * tipY;

    // Derivative at t gives slope for leaf orientation
    const dx = 2 * (1 - leafFraction) * (ctrlX - baseX) + 2 * leafFraction * (tipX - ctrlX);
    const dy = 2 * (1 - leafFraction) * (ctrlY - baseY) + 2 * leafFraction * (tipY - ctrlY);
    const leafAngle = Math.atan2(dy, dx);

    // Randomly left (-1) or right (+1)
    const leafSide = seededRandom() < 0.5 ? -1 : 1;
    const leafSize = 5 + seededRandom() * 4;

    let flowerLeafColors = {};
    flowerLeafColors.leaf1 = colors.stem2;
    flowerLeafColors.leaf2 = colors.stem3;
    const leafGroup = drawLeaf(flowerGroup, leafX, leafY, leafSize, dx, dy, leafSide, flowerLeafColors);
    const leafShift = leafSide * leafSize;
    const existingTransform = leafGroup.getAttribute("transform") || "";
    leafGroup.setAttribute("transform", `translate(${leafShift}, 0) ` + existingTransform);

    flowerGroup.appendChild(leafGroup);

    // --- Compute stem tip angle for flower head ---
    const tipDx = tipX - ctrlX;
    const tipDy = tipY - ctrlY;
    const tipAngle = Math.atan2(tipDy, tipDx) * 180 / Math.PI + 90;

    // Return tip position and angle
    return { x: tipX, y: tipY, angle: tipAngle };
}

export function drawFlowerHead(flowerGroup, flowerParameter, cx, cy, rotation = 0) {
    const flowers = [
        { name: "poppy", weight: 100 },
        { name: "daffodil", weight: 75 },
        { name: "ranunculus", weight: 50 },
        { name: "lily", weight: 35 },
        { name: "daisy", weight: 25 },
        { name: "tulip", weight: 15 },
        { name: "rose", weight: 10 },
        { name: "iris", weight: 5 },
        { name: "orchid", weight: 1 }
    ];
    const totalWeight = flowers.reduce((sum, f) => sum + f.weight, 0);
    function chooseFlower() {
        const rand = seededRandom() * totalWeight;
        let cumulative = 0;
        for (const flower of flowers) {
            cumulative += flower.weight;
            if (rand <= cumulative) {
                return flower.name;
            }
        }
    }
    let flowerType = chooseFlower();
    flowerType = "poppy";

    const headGroup = document.createElementNS(flowerGroup.namespaceURI, "g");

    switch (flowerType) {
        case "poppy":
            drawPoppy(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "daffodil":
            drawDaffodil(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "ranunculus":
            drawRanunculus(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "lily":
            drawLily(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "daisy":
            drawDaisy(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "tulip":
            drawTulip(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "rose":
            drawRose(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "iris":
            drawIris(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "orchid":
            drawOrchid(headGroup, flowerParameter, cx, cy, rotation);
            break;

        // Default to generic blossom if no match
        default:
            drawPoppy(headGroup, cx, cy, rotation, baseHeadSize);
            break;
    }

    // Move everything into the flower group
    flowerGroup.appendChild(headGroup);
}

function drawPoppy(headGroup, flowerParameter, cx, cy, rotation, medal = "none") {
    rescopeMetallicColorMap(headGroup);
    const uncommonThreshold = .1;
    const rareThreshold = .01;
    const commonFill = "#ec5800";
    const uncommonFill = "#e3c935ff";
    const rareFill = "#8635e3ff";
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fillColor = commonFill;
    switch (medal) {
        case "bronze":
            fillColor = bronzeGradient;
            break;
        case "silver":
            fillColor = silverGradient;
            break;
        case "gold":
            fillColor = goldGradient;
            break;
        case "opal":
            fillColor = opalGradient;
            break;
        default:
            const rarity = seededRandom();
            if (rarity < rareThreshold) fillColor = rareFill;
            else if (rarity < uncommonThreshold) fillColor = uncommonFill;
            else fillColor = commonFill;
            break;
    }
    const strokeColor = "#000";

    const minHeadSize = 8;
    const maxHeadSize = minHeadSize + seededRandom() * 8;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    let petals = 3 + Math.floor(seededRandom() * 2);
    const petalLength = size * 1.5;
    const petalWidth = size * 0.8;
    const baseY = cy + size * 0.2; // base of petals slightly below center

    for (let i = 0; i < petals; i++) {
        const angleOffset = (i - petals / 2) * (petalWidth * 0.6);
        // Each petal slightly offset left/right horizontally from center

        // Create path for petal - a cupped shape starting at base, curving outward and back
        const d = `
            M ${cx} ${baseY} 
            C ${cx + angleOffset - petalWidth * 0.3} ${baseY - petalLength * 0.3},
              ${cx + angleOffset - petalWidth * 0.5} ${baseY - petalLength * 0.8},
              ${cx + angleOffset} ${baseY - petalLength}
            C ${cx + angleOffset + petalWidth * 0.5} ${baseY - petalLength * 0.8},
              ${cx + angleOffset + petalWidth * 0.3} ${baseY - petalLength * 0.3},
              ${cx} ${baseY}
            Z
        `;

        const petal = document.createElementNS(headGroup.namespaceURI, "path");
        petal.setAttribute("d", d);
        petal.setAttribute("fill", `${fillColor}`);
        petal.setAttribute("stroke", `${strokeColor}`);
        petal.setAttribute("stroke-width", 0.2);
        headGroup.appendChild(petal);
    }

    let transform = `rotate(${rotation}, ${cx}, ${cy})`;
    headGroup.setAttribute('transform', transform);
}

function drawRose(headGroup, flowerParameter, cx, cy, rotation, medal = "none") {
    rescopeMetallicColorMap(headGroup);
    const uncommonThreshold = .1;
    const rareThreshold = .01;
    const commonFill = "#dd2e71ff";
    const uncommonFill = "#f1b9f3ff";
    const rareFill = "#8635e3ff";
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fillColor = commonFill;
    switch (medal) {
        case "bronze":
            fillColor = bronzeGradient;
            break;
        case "silver":
            fillColor = silverGradient;
            break;
        case "gold":
            fillColor = goldGradient;
            break;
        case "opal":
            fillColor = opalGradient;
            break;
        default:
            const rarity = seededRandom();
            if (rarity < rareThreshold) fillColor = rareFill;
            else if (rarity < uncommonThreshold) fillColor = uncommonFill;
            else fillColor = commonFill;
            break;
    }
    fillColor = opalGradient;
    const strokeColor = "#000";

    const minHeadSize = 12;
    const maxHeadSize = minHeadSize + seededRandom() * 8;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    const layers = 4;
    for (let i = 0; i < layers; i++) {
        const angleOffset = (i * 25) + seededRandom() * 10;
        const radius = size * (1 - i / layers);
        const petal = document.createElementNS(headGroup.namespaceURI, "path");
        const spread = radius * 0.6;

        const d = `
            M ${cx - spread} ${cy}
            Q ${cx} ${cy - radius}, ${cx + spread} ${cy}
            Q ${cx} ${cy + radius * 0.5}, ${cx - spread} ${cy}
            Z
        `;
        petal.setAttribute("d", d);
        petal.setAttribute("fill", `${fillColor}`);
        petal.setAttribute("fill-opacity", 1 - i * 0.1);
        petal.setAttribute("stroke", `${strokeColor}`);
        petal.setAttribute("stroke-width", 0.3);
        petal.setAttribute("transform", `rotate(${angleOffset}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    }

    let transform = `rotate(${rotation}, ${cx}, ${cy})`;
    headGroup.setAttribute('transform', transform);
}

function drawDaisy(headGroup, flowerParameter, cx, cy, rotation, medal = "none") {
    rescopeMetallicColorMap(headGroup);
    const uncommonThreshold = .1;
    const rareThreshold = .01;
    const commonFill = "#f3f1e9ff";
    const commonCenterFill = "#f5d142";
    const uncommonFill = "#f5d142";
    const uncommonCenterFill = "#4e3a26ff";
    const rareFill = "#ad73f0ff";
    const rareCenterFill = "#502f75ff"
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fillColor = commonFill;
    let centerFillColor = commonCenterFill;

    switch (medal) {
        case "bronze":
            fillColor = bronzeGradient;
            centerFillColor = bronzeGradient;
            break;
        case "silver":
            fillColor = silverGradient;
            centerFillColor = silverGradient;
            break;
        case "gold":
            fillColor = goldGradient;
            centerFillColor = goldGradient;
            break;
        case "opal":
            fillColor = opalGradient;
            centerFillColor = opalGradient;
            break;
        default:
            const rarity = seededRandom();
            if (rarity < rareThreshold) {
                fillColor = rareFill;
                centerFillColor = rareCenterFill;
            }
            else if (rarity < uncommonThreshold) {
                fillColor = uncommonFill;
                centerFillColor = uncommonCenterFill;
            }
            else {
                fillColor = commonFill;
                centerFillColor = commonCenterFill;
            }
            break;
    }

    const strokeColor = "#000";

    const minHeadSize = 3.5;
    const maxHeadSize = minHeadSize + seededRandom() * 2.5;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    let petals = 5 + Math.floor(seededRandom() * 2);

    for (let i = 0; i < petals; i++) {
        const angle = (i * 360) / petals;
        const petal = document.createElementNS(headGroup.namespaceURI, "ellipse");
        const petalLength = size * 1.5;
        const petalWidth = size * 0.4;

        petal.setAttribute("cx", cx);
        petal.setAttribute("cy", cy - size);
        petal.setAttribute("rx", petalWidth);
        petal.setAttribute("ry", petalLength);
        petal.setAttribute("fill", `${fillColor}`);
        petal.setAttribute("stroke", `${strokeColor}`);
        petal.setAttribute("stroke-width", 0.3);
        petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    }

    const center = document.createElementNS(headGroup.namespaceURI, "circle");
    center.setAttribute("cx", cx);
    center.setAttribute("cy", cy);
    center.setAttribute("r", size * 0.4);
    center.setAttribute("fill", `${centerFillColor}`);
    center.setAttribute("stroke", `${strokeColor}`);
    center.setAttribute("stroke-width", 0.1);
    headGroup.appendChild(center);

    let transform = `rotate(${rotation}, ${cx}, ${cy})`;
    headGroup.setAttribute('transform', transform);
}

function drawIris(headGroup, flowerParameter, cx, cy, rotation, medal = "none") {
    rescopeMetallicColorMap(headGroup);
    const uncommonThreshold = .1;
    const rareThreshold = .01;
    const common1 = "#731897ff";
    const common2 = "#d77ee9ff";
    const uncommon1 = "#750404ff";
    const uncommon2 = "#ec9191ff";
    const rare1 = "#0f051aff";
    const rare2 = "#553c70ff"
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fill1 = common1;
    let fill2 = common2;
    switch (medal) {
        case "bronze":
            fill1 = bronzeGradient;
            fill2 = metallicColorMap.get("bronze2");
            break;
        case "silver":
            fill1 = silverGradient;
            fill2 = metallicColorMap.get("silver3");
            break;
        case "gold":
            fill1 = goldGradient;
            fill2 = metallicColorMap.get("gold1");
            break;
        case "opal":
            fill1 = opalGradient;
            fill2 = metallicColorMap.get("opal1");
            break;
        default:
            let rarity = seededRandom();
            if (rarity < rareThreshold) {
                fill1 = rare1;
                fill2 = rare2;
            }
            else if (rarity < uncommonThreshold) {
                fill1 = uncommon1;
                fill2 = uncommon2;
            }
            else {
                fill1 = common1;
                fill2 = common2;
            }
            break;
    }
    const strokeColor = "#000";

    const minHeadSize = 8;
    const maxHeadSize = minHeadSize + seededRandom() * 5;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    const outerLength = size * 1.4;
    const innerLength = size * 0.9;

    // Outer petals (curved and drooping)
    for (let i = 0; i < 3; i++) {
        const angle = i * 120;
        const petal = document.createElementNS(headGroup.namespaceURI, "path");
        const d = `
            M ${cx} ${cy}
            C ${cx - size * 0.4} ${cy - outerLength * 0.3},
              ${cx - size * 0.3} ${cy - outerLength},
              ${cx} ${cy - outerLength}
            C ${cx + size * 0.3} ${cy - outerLength},
              ${cx + size * 0.4} ${cy - outerLength * 0.3},
              ${cx} ${cy}
            Z
        `;
        petal.setAttribute("d", d);
        petal.setAttribute("fill", fill1);
        petal.setAttribute("stroke", strokeColor);
        petal.setAttribute("stroke-width", 0.1);
        petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    }

    // Inner petals (upright and smaller)
    for (let i = 0; i < 3; i++) {
        const angle = i * 120 + 60;
        const petal = document.createElementNS(headGroup.namespaceURI, "path");
        const d = `
            M ${cx} ${cy}
            C ${cx - size * 0.25} ${cy - innerLength * 0.4},
              ${cx - size * 0.2} ${cy - innerLength},
              ${cx} ${cy - innerLength}
            C ${cx + size * 0.2} ${cy - innerLength},
              ${cx + size * 0.25} ${cy - innerLength * 0.4},
              ${cx} ${cy}
            Z
        `;
        petal.setAttribute("d", d);
        petal.setAttribute("fill", fill2);
        petal.setAttribute("stroke", strokeColor);
        petal.setAttribute("stroke-width", 0.1);
        petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    }

    headGroup.setAttribute('transform', `rotate(${rotation}, ${cx}, ${cy})`);
}

function drawLily(headGroup, flowerParameter, cx, cy, rotation, medal = "none") {
    rescopeMetallicColorMap(headGroup);
    const uncommonThreshold = .1;
    const rareThreshold = .01;
    const common1 = "#ffffff";
    const common2 = "#ecba78ff";
    const uncommon1 = "#f7b6f1ff";
    const uncommon2 = "#ec9191ff";
    const rare1 = "#fa5523ff";
    const rare2 = "#e0d8caff"
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fill1 = common1;
    let fill2 = common2;
    switch (medal) {
        case "bronze":
            fill1 = bronzeGradient;
            fill2 = metallicColorMap.get("bronze3");
            break;
        case "silver":
            fill1 = silverGradient;
            fill2 = metallicColorMap.get("silver1");
            break;
        case "gold":
            fill1 = goldGradient;
            fill2 = metallicColorMap.get("gold2");
            break;
        case "opal":
            fill1 = opalGradient;
            fill2 = metallicColorMap.get("opal2");
            break;
        default:
            let rarity = seededRandom();
            if (rarity < rareThreshold) {
                fill1 = rare1;
                fill2 = rare2;
            }
            else if (rarity < uncommonThreshold) {
                fill1 = uncommon1;
                fill2 = uncommon2;
            }
            else {
                fill1 = common1;
                fill2 = common2;
            }
            break;
    }
    const strokeColor = "#000";

    const minHeadSize = 5;
    const maxHeadSize = minHeadSize + seededRandom() * 5;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    const petals = 5;
    for (let i = 0; i < petals; i++) {
        const angle = (i * 360) / petals;
        const petalLength = size * 2.1;
        const petalWidth = size * 1.0; // wider at base for a star-like shape

        const petal = document.createElementNS(headGroup.namespaceURI, "path");

        // The petal shape: rounded triangular — wide base, pointed tip.
        const d = `
            M ${cx - petalWidth * 0.4} ${cy}                      
            C ${cx - petalWidth * 0.8} ${cy - petalLength * 0.3},
              ${cx - petalWidth * 0.3} ${cy - petalLength * 0.9},
              ${cx} ${cy - petalLength}                              
            C ${cx + petalWidth * 0.3} ${cy - petalLength * 0.9},    
              ${cx + petalWidth * 0.8} ${cy - petalLength * 0.3},
              ${cx + petalWidth * 0.4} ${cy}                       
            Q ${cx} ${cy + petalLength * 0.1}, ${cx - petalWidth * 0.4} ${cy} 
            Z
        `;

        petal.setAttribute("d", d);
        petal.setAttribute("fill", fill1);
        petal.setAttribute("stroke", strokeColor);
        petal.setAttribute("stroke-width", 0.1);
        petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    }

    // Center detail (optional — gives that lily star center)
    const center = document.createElementNS(headGroup.namespaceURI, "circle");
    center.setAttribute("cx", cx);
    center.setAttribute("cy", cy);
    center.setAttribute("r", size * 0.3);
    center.setAttribute("fill", fill2);
    center.setAttribute("stroke", strokeColor);
    center.setAttribute("stroke-width", 0.1);
    headGroup.appendChild(center);

    headGroup.setAttribute('transform', `rotate(${rotation}, ${cx}, ${cy})`);
}

function drawTulip(headGroup, flowerParameter, cx, cy, rotation, medal = "none") {
    rescopeMetallicColorMap(headGroup);
    const uncommonThreshold = .1;
    const rareThreshold = .01;
    const common1 = "#f7b3f3ff";
    const common2 = "#ecba78ff";
    const uncommon1 = "#e72222ff";
    const uncommon2 = "#c78484ff";
    const rare1 = "#31064eff";
    const rare2 = "#7847a5ff"
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fill1 = common1;
    let fill2 = common2;
    let strokeColor = "#000"

    switch (medal) {
        case "bronze":
            fill1 = bronzeGradient;
            fill2 = metallicColorMap.get("bronze1");
            break;
        case "silver":
            fill1 = silverGradient;
            fill2 = metallicColorMap.get("silver1");
            break;
        case "gold":
            fill1 = goldGradient;
            fill2 = metallicColorMap.get("gold3");
            break;
        case "opal":
            fill1 = opalGradient;
            fill2 = metallicColorMap.get("opal3");
            break;
        default:
            let rarity = seededRandom();
            if (rarity < rareThreshold) {
                fill1 = rare1;
                fill2 = rare2;
                strokeColor = fill2;
            }
            else if (rarity < uncommonThreshold) {
                fill1 = uncommon1;
                fill2 = uncommon2;
            }
            else {
                fill1 = common1;
                fill2 = common2;
            }
            break;
    }

    const minHeadSize = 8;
    const maxHeadSize = minHeadSize + seededRandom() * 4;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    // Shape parameters (easy to tweak)
    const width = size * 1.0;        // lower-body width
    const topWidth = size * 0.3;     // narrower top width
    const topHeight = cy - size * 0.4; // Y position of top curve
    const bowlDepth = cy + size * 1.8; // Y position of bottom
    const bellyCurve = size * 2;     // how much sides bulge out
    const sideLift = size * 0.3;       // how much sides lift before top
    const topFlatness = size * 0.1;    // vertical depth of top arch

    const head = `
        M ${cx} ${bowlDepth}
        C ${cx - width} ${cy + bellyCurve},
          ${cx - width * 1.1} ${cy - sideLift},
          ${cx - topWidth} ${topHeight}
        Q ${cx} ${topHeight - topFlatness},
          ${cx + topWidth} ${topHeight}
        C ${cx + width * 1.1} ${cy - sideLift},
          ${cx + width} ${cy + bellyCurve},
          ${cx} ${bowlDepth}
        Z
    `;

    const headSvg = document.createElementNS(headGroup.namespaceURI, "path");
    headSvg.setAttribute("d", head);
    headSvg.setAttribute("fill", fill1);
    headSvg.setAttribute("stroke", strokeColor);
    headSvg.setAttribute("stroke-width", 0.1);
    headGroup.appendChild(headSvg);

    const top = `
        M ${cx - topWidth} ${topHeight}
        Q ${cx} ${topHeight - topFlatness},
          ${cx + topWidth} ${topHeight}
        Q ${cx} ${topHeight + topFlatness},
          ${cx - topWidth} ${topHeight}
        Z
    `;

    const topSvg = document.createElementNS(headGroup.namespaceURI, "path");
    topSvg.setAttribute("d", top);
    topSvg.setAttribute("fill", fill2);
    topSvg.setAttribute("stroke", strokeColor);
    topSvg.setAttribute("stroke-width", 0.1);
    headGroup.appendChild(topSvg);

    const petal = `
        M ${cx - topWidth} ${topHeight}               
        Q ${cx + width} ${cy + size * 0.7},           
            ${cx + topWidth} ${bowlDepth}             
    `;

    const petalSvg = document.createElementNS(headGroup.namespaceURI, "path");
    petalSvg.setAttribute("d", petal);
    petalSvg.setAttribute("fill", "none");
    petalSvg.setAttribute("stroke", strokeColor);
    petalSvg.setAttribute("stroke-width", 0.1);
    headGroup.appendChild(petalSvg);

    const translateY = -size * 1.8;

    headGroup.setAttribute(
        "transform",
        `rotate(${rotation}, ${cx}, ${cy}) translate(${0}, ${translateY})`
    );

}

function drawOrchid(headGroup, flowerParameter, cx, cy, rotation, medal = "none") {
    rescopeMetallicColorMap(headGroup);
    const uncommonThreshold = .1;
    const rareThreshold = .01;
    const common1 = "#e0b3e6";
    const common2 = "#d6f1daff";
    const common3 = "#d45dbf";
    const uncommon1 = "#093113ff";
    const uncommon2 = "#aef3b4ff";
    const uncommon3 = "#a5f074ff";
    const rare1 = "#5154faff";
    const rare2 = "#a8a9fcff"
    const rare3 = "#31328fff"
    const bronzeGradient = metallicColorMap.get("bronzeGradient");
    const silverGradient = metallicColorMap.get("silverGradient");
    const goldGradient = metallicColorMap.get("goldGradient");
    const opalGradient = metallicColorMap.get("opalGradient");
    let fill1 = common1;
    let fill2 = common2;
    let fill3 = common3;
    let strokeColor = "#000"
    switch (medal) {
        case "bronze":
            fill1 = bronzeGradient;
            fill2 = metallicColorMap.get("bronze1");
            fill3 = metallicColorMap.get("bronze2");
            break;
        case "silver":
            fill1 = silverGradient;
            fill2 = metallicColorMap.get("silver1");
            fill3 = metallicColorMap.get("silver2");
            break;
        case "gold":
            fill1 = goldGradient;
            fill2 = metallicColorMap.get("gold1");
            fill3 = metallicColorMap.get("gold2");
            break;
        case "opal":
            fill1 = opalGradient;
            fill2 = metallicColorMap.get("opal1");
            fill3 = metallicColorMap.get("opal2");
            break;
        default:
            let rarity = seededRandom();
            if (rarity < rareThreshold) {
                fill1 = rare1;
                fill2 = rare2;
                fill3 = rare3;
            }
            else if (rarity < uncommonThreshold) {
                fill1 = uncommon1;
                fill2 = uncommon2;
                fill3 = uncommon3;
            }
            else {
                fill1 = common1;
                fill2 = common2;
                fill3 = common3;
            }
            break;
    }

    const minHeadSize = 5;
    const maxHeadSize = minHeadSize + seededRandom() * 4;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    // ----- Thick petals (down-left, down-right, up) -----
    const thickAngles = [210, 120, 0]; // up is 0°, down-left/right rotated accordingly
    thickAngles.forEach(angle => {
        const petal = document.createElementNS(headGroup.namespaceURI, "ellipse");
        petal.setAttribute("cx", cx);
        petal.setAttribute("cy", cy - size);
        petal.setAttribute("rx", size * 0.6);
        petal.setAttribute("ry", size * 1.2);
        petal.setAttribute("fill", fill1);
        petal.setAttribute("stroke", strokeColor);
        petal.setAttribute("stroke-width", 0.1);
        petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    });

    // ----- Thin petals (up-left, up-right) -----
    const thinAngles = [300, 60]; // corrected angles for “top” direction
    thinAngles.forEach(angle => {
        const petal = document.createElementNS(headGroup.namespaceURI, "ellipse");
        petal.setAttribute("cx", cx);
        petal.setAttribute("cy", cy - size);
        petal.setAttribute("rx", size * 0.15); // very thin
        petal.setAttribute("ry", size * 0.9);  // tall
        petal.setAttribute("fill", fill2);
        petal.setAttribute("stroke", strokeColor);
        petal.setAttribute("stroke-width", 0.1);
        petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    });

    // ----- Central lip/tongue -----
    const lip = document.createElementNS(headGroup.namespaceURI, "path");
    // Lip size constants
    const LIP_WIDTH = 0.5;       // half-width of the lip from center
    const LIP_HEIGHT_TOP = 1.3;  // height of the top point of the curve
    const LIP_HEIGHT_BASE = -.25; // vertical offset of the base of the lip from cy

    // Compute key points
    const lipLeftX = cx - size * LIP_WIDTH;
    const lipLeftY = cy + size * LIP_HEIGHT_BASE;
    const lipRightX = cx + size * LIP_WIDTH;
    const lipRightY = cy + size * LIP_HEIGHT_BASE;
    const lipTopX = cx;
    const lipTopY = cy + size * LIP_HEIGHT_TOP;

    // Set the path
    lip.setAttribute("d", `
    M ${lipLeftX} ${lipLeftY}
    Q ${lipTopX} ${lipTopY}, ${lipRightX} ${lipRightY}
    Z
`);

    lip.setAttribute("fill", fill3);
    lip.setAttribute("stroke", strokeColor);
    lip.setAttribute("stroke-width", 0.1);
    headGroup.appendChild(lip);

    // ----- Rotate the whole flower -----
    headGroup.setAttribute('transform', `rotate(${rotation}, ${cx}, ${cy})`);
}

function drawRanunculus(headGroup, flowerParameter, cx, cy, rotation) {
    const minHeadSize = 5;
    const maxHeadSize = minHeadSize + seededRandom() * 6;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    const layers = 3 + seededRandom() * 3;
    for (let i = 0; i < layers; i++) {
        const radius = size * (1 - i / layers * 0.9);
        const petal = document.createElementNS(headGroup.namespaceURI, "circle");
        petal.setAttribute("cx", cx);
        petal.setAttribute("cy", cy);
        petal.setAttribute("r", radius);
        const red = 255;
        const green = 140;
        const blue = 200;
        petal.setAttribute("fill", `rgba(${red - red * i / layers}, ${green - green * i / layers}, ${blue - blue * i / layers}, ${1 - i * 0.15})`);
        petal.setAttribute("stroke", "#16120cff");
        petal.setAttribute("stroke-width", 0.1);
        headGroup.appendChild(petal);
    }

    headGroup.setAttribute('transform', `rotate(${rotation}, ${cx}, ${cy})`);
}

function drawDaffodil(headGroup, flowerParameter, cx, cy, rotation) {
    const minHeadSize = 8;
    const maxHeadSize = minHeadSize + seededRandom() * 5;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    const petals = 6;
    const petalLength = size * 1.4;
    const petalWidth = size * 0.6;
    for (let i = 0; i < petals; i++) {
        const angle = (i * 360) / petals;
        const petal = document.createElementNS(headGroup.namespaceURI, "path");
        const d = `
            M ${cx} ${cy}
            C ${cx - petalWidth / 2} ${cy - petalLength * 0.4},
              ${cx} ${cy - petalLength},
              ${cx + petalWidth / 2} ${cy - petalLength * 0.4}
            C ${cx + petalWidth / 3} ${cy - petalLength * 0.2},
              ${cx + petalWidth / 4} ${cy - petalLength * 0.1},
              ${cx} ${cy}
            Z
        `;
        petal.setAttribute("d", d);
        petal.setAttribute("fill", "#f9e65c");
        petal.setAttribute("stroke", "#c8b437");
        petal.setAttribute("stroke-width", 0.5);
        petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    }

    // Trumpet (corona) - replaced ellipse with trumpet-shaped path
    const trumpet = document.createElementNS(headGroup.namespaceURI, "path");

    const baseRadius = size * 0.03;     // narrow base near center
    const flareRadius = size * 0.4;    // wider flared rim
    const height = size * 1.0;          // trumpet length

    // Draw symmetrical flared shape using cubic Beziers

    function sineWavePath(x1, y1, x2, y2, waves = 4, amplitude = 2) {
        const width = x2 - x1;
        const step = width / waves;
        let path = `L ${x1} ${y1}`;
        for (let i = 0; i < waves; i++) {
            const xMid = x1 + step * (i + 0.5);
            const xEnd = x1 + step * (i + 1);
            const yCtrl = (i % 2 === 0) ? y1 - amplitude : y1 + amplitude;
            path += ` Q ${xMid} ${yCtrl}, ${xEnd} ${y1}`;
        }
        return path;
    }

    const dTrumpet = `
        M ${cx - baseRadius} ${cy}
        C ${cx - baseRadius * 1.2} ${cy - height * 0.6},
          ${cx - flareRadius * 0.9} ${cy - height * 0.95},
          ${cx - flareRadius} ${cy - height}
        ${sineWavePath(cx - flareRadius, cy - height, cx + flareRadius, cy - height, 5, size * 0.1)}
        C ${cx + flareRadius * 0.9} ${cy - height * 0.95},
          ${cx + baseRadius * 1.2} ${cy - height * 0.6},
          ${cx + baseRadius} ${cy}
        Z
    `;
    trumpet.setAttribute("d", dTrumpet);
    trumpet.setAttribute("fill", "#f29c4b");
    trumpet.setAttribute("stroke", "#a8561f");
    trumpet.setAttribute("stroke-width", 0.4);

    headGroup.appendChild(trumpet);

    headGroup.setAttribute('transform', `rotate(${rotation}, ${cx}, ${cy})`);
}
