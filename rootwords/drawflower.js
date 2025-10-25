import { getColors } from '../utility/color/color.js';
import { drawLeaf } from './drawtree.js';

// Colors
let colors = getColors();

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

    // Decide which flower type to draw TODO random select
    const flowerType = colors.flowerType || "poppy";

    const headGroup = document.createElementNS(flowerGroup.namespaceURI, "g");

    switch (flowerType) {
        case "poppy":
            drawPoppy(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "rose":
            drawRose(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "daisy":
            drawDaisy(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "iris":
            drawIris(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "lily":
            drawLily(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "tulip":
            drawTulip(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "orchid":
            drawOrchid(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "ranunculus":
            drawRanunculus(headGroup, flowerParameter, cx, cy, rotation);
            break;

        case "daffodil":
            drawTulip(headGroup, flowerParameter, cx, cy, rotation);
            break;

        // Default to generic blossom if no match
        default:
            drawPoppy(headGroup, cx, cy, rotation, baseHeadSize);
            break;
    }

    // Move everything into the flower group
    flowerGroup.appendChild(headGroup);
}

function drawPoppy(headGroup, flowerParameter, cx, cy, rotation) {
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
        petal.setAttribute("fill", "rgba(227, 108, 53, 1)"); // deep red petal color
        petal.setAttribute("stroke", "rgba(114, 65, 33, 1)"); // dark red outline
        petal.setAttribute("stroke-width", 0.8);
        headGroup.appendChild(petal);
    }

    let transform = `rotate(${rotation}, ${cx}, ${cy})`;
    headGroup.setAttribute('transform', transform);
}

function drawRose(headGroup, flowerParameter, cx, cy, rotation) {
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
        petal.setAttribute("fill", colors.rose || "#d36da4");
        petal.setAttribute("fill-opacity", 1 - i * 0.1);
        petal.setAttribute("stroke", "#8a3e65");
        petal.setAttribute("stroke-width", 0.5);
        petal.setAttribute("transform", `rotate(${angleOffset}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    }

    let transform = `rotate(${rotation}, ${cx}, ${cy})`;
    headGroup.setAttribute('transform', transform);
}

function drawDaisy(headGroup, flowerParameter, cx, cy, rotation) {
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
        petal.setAttribute("fill", "#fffaf0");
        petal.setAttribute("stroke", "#cfcfcf");
        petal.setAttribute("stroke-width", 0.4);
        petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    }

    // Yellow center
    const center = document.createElementNS(headGroup.namespaceURI, "circle");
    center.setAttribute("cx", cx);
    center.setAttribute("cy", cy);
    center.setAttribute("r", size * 0.4);
    center.setAttribute("fill", "#f5d142");
    center.setAttribute("stroke", "#c4a025");
    center.setAttribute("stroke-width", 0.5);
    headGroup.appendChild(center);

    let transform = `rotate(${rotation}, ${cx}, ${cy})`;
    headGroup.setAttribute('transform', transform);
}

function drawIris(headGroup, flowerParameter, cx, cy, rotation) {
    const minHeadSize = 8;
    const maxHeadSize = minHeadSize + seededRandom() * 5;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    const petals = 6;
    const outerLength = size * 1.4;
    const innerLength = size * 0.9;
    const outerColor = "#6a4ba6"; // purple
    const innerColor = "#b79fe3";

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
        petal.setAttribute("fill", outerColor);
        petal.setAttribute("stroke", "#4a2e7f");
        petal.setAttribute("stroke-width", 0.7);
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
        petal.setAttribute("fill", innerColor);
        petal.setAttribute("stroke", "#6a4ba6");
        petal.setAttribute("stroke-width", 0.6);
        petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    }

    headGroup.setAttribute('transform', `rotate(${rotation}, ${cx}, ${cy})`);
}

function drawLily(headGroup, flowerParameter, cx, cy, rotation) {
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
        petal.setAttribute("fill", "#fff5f5");
        petal.setAttribute("stroke", "#c5bebeff");
        petal.setAttribute("stroke-width", 0.5);
        petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    }

    // Center detail (optional — gives that lily star center)
    const center = document.createElementNS(headGroup.namespaceURI, "circle");
    center.setAttribute("cx", cx);
    center.setAttribute("cy", cy);
    center.setAttribute("r", size * 0.3);
    center.setAttribute("fill", "#f7cc4b");
    center.setAttribute("stroke", "#c29628");
    center.setAttribute("stroke-width", 0.4);
    headGroup.appendChild(center);

    headGroup.setAttribute('transform', `rotate(${rotation}, ${cx}, ${cy})`);
}

function drawTulip(headGroup, flowerParameter, cx, cy, rotation) {
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
    headSvg.setAttribute("fill", "#fdf476ff");
    headSvg.setAttribute("stroke", "#f5d271ff");
    headSvg.setAttribute("stroke-width", 0.8);
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
    topSvg.setAttribute("fill", "#cfae51ff");
    topSvg.setAttribute("stroke", "#cfae51ff");
    topSvg.setAttribute("stroke-width", 0.8);
    headGroup.appendChild(topSvg);

    const petal = `
        M ${cx - topWidth} ${topHeight}               
        Q ${cx + width} ${cy + size * 0.7},           
            ${cx + topWidth} ${bowlDepth}             
    `;

    const petalSvg = document.createElementNS(headGroup.namespaceURI, "path");
    petalSvg.setAttribute("d", petal);
    petalSvg.setAttribute("fill", "none");
    petalSvg.setAttribute("stroke", "#cfae51ff");
    petalSvg.setAttribute("stroke-width", 0.3);
    headGroup.appendChild(petalSvg);

    headGroup.setAttribute("transform", `rotate(${rotation}, ${cx}, ${cy})`);
}

function drawOrchid(headGroup, flowerParameter, cx, cy, rotation) {
    const minHeadSize = 9;
    const maxHeadSize = minHeadSize + seededRandom() * 5;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    const petals = 5;
    for (let i = 0; i < petals; i++) {
        const angle = (i * 360) / petals;
        const petal = document.createElementNS(headGroup.namespaceURI, "ellipse");
        petal.setAttribute("cx", cx);
        petal.setAttribute("cy", cy - size);
        petal.setAttribute("rx", size * 0.6);
        petal.setAttribute("ry", size * 1.2);
        petal.setAttribute("fill", "#e0b3e6");
        petal.setAttribute("stroke", "#9c6da3");
        petal.setAttribute("stroke-width", 0.5);
        petal.setAttribute("transform", `rotate(${angle}, ${cx}, ${cy})`);
        headGroup.appendChild(petal);
    }

    // Central lip petal
    const lip = document.createElementNS(headGroup.namespaceURI, "path");
    lip.setAttribute("d", `
        M ${cx - size * 0.5} ${cy + size * 0.2}
        Q ${cx} ${cy + size * 0.9}, ${cx + size * 0.5} ${cy + size * 0.2}
        Z
    `);
    lip.setAttribute("fill", "#d45dbf");
    lip.setAttribute("stroke", "#7b3271");
    lip.setAttribute("stroke-width", 0.4);
    headGroup.appendChild(lip);

    headGroup.setAttribute('transform', `rotate(${rotation}, ${cx}, ${cy})`);
}

function drawRanunculus(headGroup, flowerParameter, cx, cy, rotation) {
    const minHeadSize = 10;
    const maxHeadSize = minHeadSize + seededRandom() * 6;
    const size = minHeadSize + flowerParameter * (maxHeadSize - minHeadSize);

    const layers = 6;
    for (let i = 0; i < layers; i++) {
        const radius = size * (1 - i / layers * 0.7);
        const petal = document.createElementNS(headGroup.namespaceURI, "circle");
        petal.setAttribute("cx", cx);
        petal.setAttribute("cy", cy);
        petal.setAttribute("r", radius);
        petal.setAttribute("fill", `rgba(255, 189, 89, ${1 - i * 0.15})`);
        petal.setAttribute("stroke", "#b0751e");
        petal.setAttribute("stroke-width", 0.4);
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

    // Trumpet (corona)
    const trumpet = document.createElementNS(headGroup.namespaceURI, "ellipse");
    trumpet.setAttribute("cx", cx);
    trumpet.setAttribute("cy", cy - size * 0.3);
    trumpet.setAttribute("rx", size * 0.5);
    trumpet.setAttribute("ry", size * 0.7);
    trumpet.setAttribute("fill", "#f2c84b");
    trumpet.setAttribute("stroke", "#a8801f");
    trumpet.setAttribute("stroke-width", 0.4);
    headGroup.appendChild(trumpet);

    headGroup.setAttribute('transform', `rotate(${rotation}, ${cx}, ${cy})`);
}
